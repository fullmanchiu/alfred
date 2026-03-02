"""
WebSocket 批量发送 K线数据
保持长连接，批量传输，减少网络开销
"""
import json
import asyncio
from typing import List, Dict, Any, Callable
from logging_config import get_logger
from collections import defaultdict
from dataclasses import asdict
import websockets

logger = get_logger('websocket_batch_sender')

# 批量配置
BATCH_SIZE = 50  # 每批50条K线（适配默认8KB WebSocket缓冲区）
SEND_INTERVAL = 0.1  # 发送间隔（秒）

class WebSocketBatchSender:
    """WebSocket 批量发送器"""

    def __init__(self, ws_url: str, on_progress: Callable = None):
        """
        初始化批量发送器

        Args:
            ws_url: WebSocket 服务端地址
            on_progress: 进度回调 (current, total)
        """
        self.ws_url = ws_url
        self.on_progress = on_progress
        self.websocket = None
        self.buffer = defaultdict(list)  # {batch_index: [klines]}
        self.current_batch = 0
        self.total_batches = 0
        self.sent_batches = 0
        self.connected = False

    async def connect(self):
        """建立 WebSocket 连接"""
        try:
            logger.info(f"连接 WebSocket: {self.ws_url}")
            self.websocket = await asyncio.wait_for(
                websockets.connect(self.ws_url),
                timeout=10.0
            )
            self.connected = True
            logger.info("WebSocket 连接成功")
        except Exception as e:
            logger.error(f"WebSocket 连接失败: {e}")
            raise

    async def disconnect(self):
        """断开连接"""
        if self.websocket:
            await self.websocket.close()
            self.connected = False
            logger.info("WebSocket 已断开")

    async def send_batch(self, klines: List[Dict[str, Any]], stock_info: Dict = None):
        """
        发送一批K线数据

        Args:
            klines: K线数据列表
            stock_info: 股票信息（可选）
        """
        if not self.connected:
            await self.connect()

        message = {
            'type': 'batch_klines',
            'batchIndex': self.current_batch,
            'totalBatches': self.total_batches,
            'klines': klines,
            'stockInfo': stock_info
        }

        try:
            await self.websocket.send(json.dumps(message))
            self.sent_batches += 1

            if self.on_progress:
                self.on_progress(self.sent_batches, self.total_batches)

            logger.debug(f"发送批次 {self.current_batch + 1}/{self.total_batches}: {len(klines)} 条K线")

            # 添加小延迟，避免连续发送导致连接断开
            await asyncio.sleep(0.01)

        except Exception as e:
            logger.error(f"发送批次失败: {e}")
            raise

    async def send_all(self, klines_dict: Dict[str, List[Dict[str, Any]]], stock_dict: Dict[str, Dict]):
        """
        发送所有K线数据

        Args:
            klines_dict: {baostock_code: [kline_data]}
            stock_dict: {baostock_code: {name, type}}
        """
        # 预先计算总批次数
        total_klines = sum(len(klines) for klines in klines_dict.values())
        self.total_batches = (total_klines + BATCH_SIZE - 1) // BATCH_SIZE
        if self.total_batches == 0:
            self.total_batches = 1

        # 按批次分组
        all_klines = []
        batch_index = 0

        for bs_code, klines in klines_dict.items():
            stock_info = stock_dict.get(bs_code, {})
            for kline in klines:
                # 将 KlineData 转换为字典，并添加 bs_code
                kline_dict = asdict(kline) if hasattr(kline, '__dataclass_fields__') else kline
                kline_dict['bs_code'] = bs_code
                all_klines.append(kline_dict)

                if len(all_klines) >= BATCH_SIZE:
                    await self.send_batch(all_klines[:BATCH_SIZE], stock_info)
                    all_klines = all_klines[BATCH_SIZE:]
                    batch_index += 1

        # 发送剩余数据
        if all_klines:
            await self.send_batch(all_klines, stock_info)
            batch_index += 1

        # 等待所有批次确认
        await asyncio.sleep(1)
        logger.info(f"所有批次发送完成: {self.total_batches} 批, {total_klines} 条K线")


async def send_klines_via_websocket(
    klines_dict: Dict[str, List[Dict[str, Any]]],
    stock_dict: Dict[str, Dict],
    ws_url: str = None,
    progress_callback: Callable = None
) -> Dict[str, int]:
    """
    通过 WebSocket 批量发送K线数据

    Args:
        klines_dict: K线数据字典
        stock_dict: 股票信息字典
        ws_url: WebSocket 地址
        progress_callback: 进度回调

    Returns:
        {'batches': 批次数, 'total_klines': 总K线数}
    """
    if ws_url is None:
        from java_client import JAVA_BASE_URL
        ws_url = f"ws://{JAVA_BASE_URL.replace('http://', '').replace('https://', 'ws://')}/api/ws"

    sender = WebSocketBatchSender(ws_url, progress_callback)

    try:
        await sender.connect()
        await sender.send_all(klines_dict, stock_dict)
        return {
            'batches': sender.total_batches,
            'total_klines': sum(len(klines) for klines in klines_dict.values())
        }
    finally:
        await sender.disconnect()
