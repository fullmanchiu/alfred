"""
独立的数据库保存进程
从队列中获取K线数据并批量保存到PostgreSQL
"""
import time
from multiprocessing import Process, Queue
from typing import Dict, Any, List, Tuple
from logging_config import get_logger
from datetime import datetime

logger = get_logger('saver_worker')


class SaverWorker(Process):
    """独立保存进程 worker - 无等待批量模式"""

    def __init__(self, data_queue: Queue, result_queue: Queue, saver_id: int,
                 batch_size: int = 25):
        super().__init__()
        self.data_queue = data_queue
        self.result_queue = result_queue
        self.saver_id = saver_id
        # 批量提交配置
        self.batch_size = batch_size  # 积累多少只股票后立即提交

    def run(self):
        """进程主循环 - 数学批量模式"""
        from modules.postgresql_client import PostgreSQLClient

        # 每个进程有自己的数据库连接
        pg_client = PostgreSQLClient()

        logger.info(f"保存进程{self.saver_id} 启动 (批量大小={self.batch_size})")

        while True:
            # 阻塞等待数据
            item = self.data_queue.get()

            if item is None:  # 毒丸，退出信号
                logger.info(f"保存进程{self.saver_id} 收到退出信号")
                break

            # item 是一个批次: [(code, klines, metadata), ...]
            batch_data = item  # 已经是列表了
            self._flush_batch(pg_client, batch_data)

        logger.info(f"保存进程{self.saver_id} 退出")

    def _flush_batch(self, pg_client, batch_buffer: List[Tuple[str, list, dict]]):
        """批量提交保存（使用 COPY 命令）"""
        if not batch_buffer:
            return

        save_start = time.time()

        # 转换为 save_klines_copy 需要的格式
        klines_dict = {code: klines for code, klines, _ in batch_buffer}

        # 使用 COPY 命令（比 execute_batch 快 10-100 倍）
        save_result = pg_client.save_klines_copy(klines_dict)

        save_time = time.time() - save_start
        avg_time = save_time / len(batch_buffer)

        # 为每只股票发送保存结果（发送单只股票的K线数量，而不是整个批次）
        for code, klines, metadata in batch_buffer:
            self.result_queue.put({
                'type': 'saved',
                'code': code,
                'count': len(klines),
                'save_result': {'saved': len(klines)},  # 单只股票的K线数量
                'save_time': avg_time,  # 平均时间
                'saver_id': self.saver_id,
                'batch_size': len(batch_buffer),
                'fetch_time': metadata.get('fetch_time', 0) if isinstance(metadata, dict) else 0
            })

        # 计算批次总K线数
        total_klines = sum(len(klines) for code, klines, _ in batch_buffer)
        logger.info(f"保存进程{self.saver_id} COPY保存: {len(batch_buffer)}只股票, "
                   f"{total_klines}条K线 (耗时{save_time:.2f}s, {total_klines/save_time:.0f}条/秒)")


class SaverPool:
    """保存进程池管理器"""

    def __init__(self, num_savers: int = 2, batch_size: int = 25):
        self.num_savers = num_savers
        self.batch_size = batch_size
        self.data_queue = None
        self.result_queue = None
        self.savers = []

    def start(self):
        """启动保存进程池"""
        # 使用普通 Queue 而不是 Manager.Queue()，避免 pickle 问题
        self.data_queue = Queue()
        self.result_queue = Queue()

        for i in range(self.num_savers):
            saver = SaverWorker(
                self.data_queue,
                self.result_queue,
                i + 1,
                batch_size=self.batch_size
            )
            saver.start()
            self.savers.append(saver)

        logger.info(f"保存进程池已启动: {self.num_savers} 个进程, "
                   f"批量大小={self.batch_size}, 无等待模式")

    def submit(self, code: str, klines: list, metadata: dict = None):
        """提交保存任务"""
        self.data_queue.put((code, klines, metadata or {}))

    def get_result(self, timeout: float = 0.1):
        """获取保存结果（非阻塞）"""
        try:
            return self.result_queue.get_nowait()
        except:
            return None

    def stop(self):
        """停止所有保存进程"""
        # 发送退出信号（每个saver一个）
        for _ in self.savers:
            self.data_queue.put(None)

        # 等待进程退出
        for saver in self.savers:
            saver.join(timeout=30)

        logger.info("保存进程池已停止")

    def __enter__(self):
        self.start()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.stop()
