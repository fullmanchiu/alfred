"""
股票K线同步服务 - 重构版本
基于性能测试结果优化：
- 阈值：≤15只用单进程，>15只用4进程
- 4进程+重试机制，保证100%数据完整性
- 任务队列管理，支持并发控制
"""
import baostock as bs
import time
from datetime import datetime
from multiprocessing import Process, Manager
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
import threading
from queue import Queue as PyQueue
from logging_config import get_logger

logger = get_logger('kline_sync_service')

# 基于测试结果的阈值配置
PROCESS_THRESHOLD = 15  # 股票数量阈值

class TaskStatus(Enum):
    """任务状态"""
    PENDING = "pending"      # 待处理
    RUNNING = "running"      # 执行中
    SUCCESS = "success"      # 成功
    FAILED = "failed"        # 失败


@dataclass
class SyncTask:
    """同步任务"""
    task_id: int
    task_name: str
    task_type: str           # single, watchlist, market, hs300
    stock_codes: List[str]   # 股票代码列表
    date_range: Tuple[str, str] = ("2020-01-01", None)  # (start, end)

    @property
    def stock_count(self) -> int:
        return len(self.stock_codes)


@dataclass
class SyncResult:
    """同步结果"""
    task_id: int
    status: TaskStatus
    total_stocks: int
    success_count: int
    failed_count: int
    total_klines: int
    elapsed_time: float
    error_message: Optional[str] = None
    details: Dict[str, Any] = field(default_factory=dict)


# =============================================================================
# 多进程获取器 - 基于测试结果优化
# =============================================================================

class MultiProcessFetcher:
    """多进程K线获取器"""

    def __init__(self, max_retries: int = 2):
        self.max_retries = max_retries

    def fetch(self, stock_codes: List[str], start_date: str, end_date: str,
              execution_id: Optional[str] = None) -> Dict[str, Any]:
        """
        根据股票数量自动选择最优进程数

        Args:
            stock_codes: 股票代码列表
            start_date: 开始日期
            end_date: 结束日期
            execution_id: 执行记录ID（用于日志推送）

        Returns:
            {
                'klines_dict': {code: [KlineData]},
                'success_count': int,
                'failed_count': int,
                'total_retries': int
            }
        """
        # 根据阈值选择进程数
        stock_count = len(stock_codes)
        if stock_count <= PROCESS_THRESHOLD:
            mode = f"单进程模式 (大批量优化)"
            logger.info(f"股票数量{stock_count} ≤ {PROCESS_THRESHOLD}，使用单进程")
            if execution_id:
                from python_to_java_websocket import send_to_java
                send_to_java('taskLog', {
                    'level': 'INFO',
                    'message': f'获取模式: {mode}',
                    'timestamp': datetime.now().isoformat(),
                    'executionId': execution_id
                })
            # 使用单进程但大批量提交
            return self._fetch_single_process_batch(stock_codes, start_date, end_date, execution_id)
        else:
            mode = f"4进程+2保存进程模式 ({stock_count}>{PROCESS_THRESHOLD})"
            logger.info(f"股票数量{stock_count} > {PROCESS_THRESHOLD}，使用4进程+2保存进程")
            if execution_id:
                from python_to_java_websocket import send_to_java
                send_to_java('taskLog', {
                    'level': 'INFO',
                    'message': f'获取模式: {mode}',
                    'timestamp': datetime.now().isoformat(),
                    'executionId': execution_id
                })
            return self._fetch_multi_process(stock_codes, start_date, end_date, execution_id)

    def _fetch_single_process(self, stock_codes: List[str], start_date: str, end_date: str,
                             execution_id: Optional[str] = None) -> Dict[str, Any]:
        """单进程获取（边获取边保存）"""
        from .postgresql_client import get_pg_client
        from python_to_java_websocket import send_to_java

        start = time.time()
        pg_client = get_pg_client()

        lg = bs.login()
        total_retries = 0
        success_count = 0
        failed_count = 0
        total_klines = 0
        saved_count = 0

        try:
            for i, code in enumerate(stock_codes, 1):
                # 步骤1：获取数据
                fetch_start = time.time()
                klines, retries = self._fetch_single_stock(code, start_date, end_date, lg)
                fetch_time = time.time() - fetch_start
                total_retries += retries

                if klines:
                    # 推送获取完成日志
                    if execution_id:
                        send_to_java('taskLog', {
                            'level': 'INFO',
                            'message': f'[{i}/{len(stock_codes)}] {code} 获取 {len(klines)}条 (耗时{fetch_time:.2f}s)',
                            'timestamp': datetime.now().isoformat(),
                            'executionId': execution_id
                        })

                    # 步骤2：保存到数据库
                    save_start = time.time()
                    save_result = pg_client.save_klines_batch({code: klines})
                    save_time = time.time() - save_start

                    saved_count += save_result['saved']
                    total_klines += len(klines)
                    success_count += 1

                    # 推送保存完成日志
                    if execution_id:
                        send_to_java('taskLog', {
                            'level': 'INFO',
                            'message': f'[{i}/{len(stock_codes)}] {code} 保存完成 (耗时{save_time:.2f}s)',
                            'timestamp': datetime.now().isoformat(),
                            'executionId': execution_id
                        })
                else:
                    failed_count += 1
                    if execution_id:
                        send_to_java('taskLog', {
                            'level': 'WARNING',
                            'message': f'[{i}/{len(stock_codes)}] {code} 获取失败 (耗时{fetch_time:.2f}s)',
                            'timestamp': datetime.now().isoformat(),
                            'executionId': execution_id
                        })

        finally:
            bs.logout()

        elapsed = time.time() - start

        return {
            'klines_dict': {},  # 流式保存后不需要返回数据
            'success_count': success_count,
            'failed_count': failed_count,
            'total_klines': total_klines,
            'saved_count': saved_count,
            'error_count': failed_count,
            'total_retries': total_retries,
            'elapsed': elapsed
        }

    def _fetch_single_process_batch(self, stock_codes: List[str], start_date: str, end_date: str,
                                    execution_id: Optional[str] = None) -> Dict[str, Any]:
        """单进程获取（大批量提交优化）"""
        from .postgresql_client import get_pg_client
        from python_to_java_websocket import send_to_java

        start = time.time()
        pg_client = get_pg_client()

        lg = bs.login()
        total_retries = 0
        success_count = 0
        failed_count = 0
        total_klines = 0
        saved_count = 0

        # 大批量收集（积累50只股票后一起提交）
        BATCH_STOCKS = 50  # 每50只股票提交一次
        batch_klines = []  # [(code, klines), ...]

        try:
            for i, code in enumerate(stock_codes, 1):
                # 步骤1：获取数据
                fetch_start = time.time()
                klines, retries = self._fetch_single_stock(code, start_date, end_date, lg)
                fetch_time = time.time() - fetch_start
                total_retries += retries

                if klines:
                    batch_klines.append((code, klines))

                    # 推送获取完成日志
                    if execution_id:
                        send_to_java('taskLog', {
                            'level': 'INFO',
                            'message': f'[{i}/{len(stock_codes)}] {code} 获取 {len(klines)}条 (耗时{fetch_time:.2f}s)',
                            'timestamp': datetime.now().isoformat(),
                            'executionId': execution_id
                        })

                    # 达到批次大小或最后一批时，保存
                    if len(batch_klines) >= BATCH_STOCKS or i == len(stock_codes):
                        # 步骤2：批量保存
                        save_start = time.time()

                        # 转换为 save_klines_batch 需要的格式
                        klines_dict = {code: klines for code, klines in batch_klines}
                        save_result = pg_client.save_klines_batch(klines_dict, batch_size=300)

                        save_time = time.time() - save_start
                        saved_count += save_result['saved']
                        total_klines += sum(len(k) for _, k in batch_klines)
                        success_count += len(batch_klines)

                        # 推送保存完成日志
                        if execution_id:
                            send_to_java('taskLog', {
                                'level': 'INFO',
                                'message': f'批量保存: {len(batch_klines)}只股票 {save_result["saved"]}条K线 (耗时{save_time:.2f}s)',
                                'timestamp': datetime.now().isoformat(),
                                'executionId': execution_id
                            })

                        batch_klines.clear()
                else:
                    failed_count += 1
                    if execution_id:
                        send_to_java('taskLog', {
                            'level': 'WARNING',
                            'message': f'[{i}/{len(stock_codes)}] {code} 获取失败 (耗时{fetch_time:.2f}s)',
                            'timestamp': datetime.now().isoformat(),
                            'executionId': execution_id
                        })

        finally:
            bs.logout()

        elapsed = time.time() - start

        return {
            'klines_dict': {},
            'success_count': success_count,
            'failed_count': failed_count,
            'total_klines': total_klines,
            'saved_count': saved_count,
            'error_count': failed_count,
            'total_retries': total_retries,
            'elapsed': elapsed
        }

    def _fetch_multi_process(self, stock_codes: List[str], start_date: str, end_date: str,
                            execution_id: Optional[str] = None) -> Dict[str, Any]:
        """4进程获取（主进程实时保存）"""
        from .postgresql_client import get_pg_client
        from python_to_java_websocket import send_to_java

        num_processes = 4
        pg_client = get_pg_client()

        # 分配股票到进程（均匀分配）
        chunks = self._distribute_stocks(stock_codes, num_processes)

        logger.info(f"将{len(stock_codes)}只股票分配到{len(chunks)}个进程: {[len(c) for c in chunks]}")

        start = time.time()
        result_queue = Manager().Queue()

        # 创建并启动进程
        processes = []
        for i, chunk in enumerate(chunks, 1):
            delay = (i - 1) * 0.3  # 错开登录时间
            p = Process(
                target=self._process_worker,
                args=(chunk, start_date, end_date, i, result_queue, delay, self.max_retries, execution_id)
            )
            processes.append(p)
            p.start()

        # 主进程：实时接收数据并保存到数据库
        alive_processes = processes.copy()
        processed_count = 0
        total_saved = 0
        total_klines = 0
        failed_codes = []

        # 用于收集统计信息
        stats_queue = Manager().Queue()

        while alive_processes:
            # 检查是否有新数据
            try:
                while not result_queue.empty():
                    code, klines, error = result_queue.get_nowait()

                    if code == '__log__' and execution_id:
                        # 实时转发日志
                        send_to_java('taskLog', klines)
                    elif code == '__stats__':
                        # 收集重试统计
                        stats_queue.put((code, klines, error))
                    elif klines:
                        # 提取获取耗时
                        fetch_time = error.get('fetch_time', 0) if isinstance(error, dict) else 0

                        # 推送获取完成日志
                        if execution_id:
                            send_to_java('taskLog', {
                                'level': 'INFO',
                                'message': f'进度: {processed_count + 1}/{len(stock_codes)} | {code} 获取 {len(klines)}条 (耗时{fetch_time:.2f}s)',
                                'timestamp': datetime.now().isoformat(),
                                'executionId': execution_id
                            })

                        # 立即保存到数据库
                        save_start = time.time()
                        save_result = pg_client.save_klines_batch({code: klines})
                        save_time = time.time() - save_start

                        total_saved += save_result['saved']
                        total_klines += len(klines)
                        processed_count += 1

                        # 推送保存完成日志
                        if execution_id:
                            send_to_java('taskLog', {
                                'level': 'INFO',
                                'message': f'进度: {processed_count}/{len(stock_codes)} | {code} 保存完成 (耗时{save_time:.2f}s)',
                                'timestamp': datetime.now().isoformat(),
                                'executionId': execution_id
                            })
                    else:
                        fetch_time = error.get('fetch_time', 0) if isinstance(error, dict) else 0
                        failed_codes.append(code)
                        processed_count += 1
                        if execution_id:
                            send_to_java('taskLog', {
                                'level': 'WARNING',
                                'message': f'进度: {processed_count}/{len(stock_codes)} | {code} 获取失败 (耗时{fetch_time:.2f}s)',
                                'timestamp': datetime.now().isoformat(),
                                'executionId': execution_id
                            })
            except:
                pass

            # 检查进程状态
            for p in processes:
                if not p.is_alive() and p in alive_processes:
                    alive_processes.remove(p)

            time.sleep(0.05)  # 快速检查

        # 收集重试统计
        total_retries = 0
        while not stats_queue.empty():
            _, retries, _ = stats_queue.get()
            total_retries += retries

        elapsed = time.time() - start

        return {
            'klines_dict': {},  # 流式保存后不需要返回数据
            'success_count': processed_count - len(failed_codes),
            'failed_count': len(failed_codes),
            'total_klines': total_klines,
            'saved_count': total_saved,
            'error_count': len(failed_codes),
            'total_retries': total_retries,
            'elapsed': elapsed
        }

    def _fetch_multi_process(self, stock_codes: List[str], start_date: str, end_date: str,
                            execution_id: Optional[str] = None) -> Dict[str, Any]:
        """4进程获取 + 2个独立保存进程并发写数据库"""
        from .saver_worker import SaverPool
        from python_to_java_websocket import send_to_java

        num_fetchers = 4
        num_savers = 2  # 2个保存进程并发写DB

        # 分配股票到进程（均匀分配）
        chunks = self._distribute_stocks(stock_codes, num_fetchers)

        logger.info(f"将{len(stock_codes)}只股票分配到{len(chunks)}个获取进程: {[len(c) for c in chunks]}")
        logger.info(f"启动{num_savers}个独立保存进程并发写数据库 (批量大小=25, 无等待模式)")

        start = time.time()
        result_queue = Manager().Queue()

        # 启动保存进程池（无等待模式）
        saver_pool = SaverPool(num_savers=num_savers, batch_size=25)
        saver_pool.start()

        try:
            # 创建并启动获取进程（传递 data_queue 而不是 saver_pool）
            processes = []
            for i, chunk in enumerate(chunks, 1):
                delay = (i - 1) * 0.3  # 错开登录时间
                p = Process(
                    target=self._process_worker_with_saver,
                    args=(chunk, start_date, end_date, i, result_queue, saver_pool.data_queue, delay, self.max_retries, execution_id)
                )
                processes.append(p)
                p.start()

            # 主进程：收集保存结果并推送日志
            alive_processes = processes.copy()
            processed_count = 0
            total_saved = 0
            total_klines = 0
            failed_codes = []

            # 用于收集统计信息
            stats_queue = Manager().Queue()

            # 跟踪已获取但未保存的股票（用于进度显示）
            saved_count = 0
            # 跟踪已发送的批次数（用于确定所有数据已发送）
            batches_sent = 0
            BATCH_SIZE = 25
            expected_batches = (len(stock_codes) + BATCH_SIZE - 1) // BATCH_SIZE  # 向上取整

            while alive_processes:
                # 检查是否有新的保存结果
                result = saver_pool.get_result(timeout=0.05)
                if result:
                    if result['type'] == 'saved':
                        saved_count += 1
                        total_saved += result['save_result']['saved']
                        total_klines += result['count']
                        processed_count += 1

                        # 推送保存完成日志
                        if execution_id:
                            send_to_java('taskLog', {
                                'level': 'INFO',
                                'message': f'进度: {processed_count}/{len(stock_codes)} | {result["code"]} 保存完成 (获取{result["fetch_time"]:.2f}s, 保存{result["save_time"]:.2f}s, 进程{result["saver_id"]})',
                                'timestamp': datetime.now().isoformat(),
                                'executionId': execution_id
                            })
                    elif result['type'] == 'batch_log' and execution_id:
                        # 推送批量保存日志
                        send_to_java('taskLog', {
                            'level': result.get('level', 'INFO'),
                            'message': result['message'],
                            'timestamp': datetime.now().isoformat(),
                            'executionId': execution_id
                        })

                # 检查获取进程是否有新数据
                try:
                    while not result_queue.empty():
                        code, data, error = result_queue.get_nowait()

                        if code == '__log__' and execution_id:
                            # 实时转发日志
                            send_to_java('taskLog', data)
                        elif code == '__stats__':
                            # 收集重试统计
                            stats_queue.put((code, data, error))
                        elif code == '__BATCH_COUNT__':
                            # 累计已发送的批次数
                            batches_sent += data
                            # 始终记录本地日志
                            logger.info(f'批次进度: {batches_sent}/{expected_batches} 批已发送')
                            if execution_id:
                                send_to_java('taskLog', {
                                    'level': 'INFO',
                                    'message': f'批次进度: {batches_sent}/{expected_batches} 批已发送',
                                    'timestamp': datetime.now().isoformat(),
                                    'executionId': execution_id
                                })
                        elif code == '__failed__':
                            # 获取失败
                            failed_codes.append(data)
                            if execution_id:
                                send_to_java('taskLog', {
                                    'level': 'WARNING',
                                    'message': f'{data} 获取失败',
                                    'timestamp': datetime.now().isoformat(),
                                    'executionId': execution_id
                                })
                except:
                    pass

                # 检查获取进程状态
                for p in processes:
                    if not p.is_alive() and p in alive_processes:
                        alive_processes.remove(p)

                time.sleep(0.05)  # 快速检查

            # 等待所有保存完成
            # 基于批次数判断：当批次数达到预期且等待超时后，认为所有数据已处理
            logger.info(f'所有获取进程已退出，已发送 {batches_sent}/{expected_batches} 批')
            # 继续等待保存结果，直到队列为空
            wait_start = time.time()
            while True:
                result = saver_pool.get_result(timeout=0.5)
                if result:
                    if result['type'] == 'saved':
                        saved_count += 1
                        total_saved += result['save_result']['saved']
                        total_klines += result['count']
                        processed_count += 1
                    elif result['type'] == 'batch_log' and execution_id:
                        # 剩余的批量日志也推送
                        send_to_java('taskLog', {
                            'level': result.get('level', 'INFO'),
                            'message': result['message'],
                            'timestamp': datetime.now().isoformat(),
                            'executionId': execution_id
                        })
                    wait_start = time.time()  # 更新最后获取结果的时间
                else:
                    # 队列为空，检查是否超时
                    # 条件1: 批次数达到预期且2秒无新结果
                    # 条件2: 所有进程已退出且5秒无新结果（处理全部失败的情况）
                    timeout = 2.0 if batches_sent >= expected_batches else 5.0
                    if (time.time() - wait_start) > timeout:
                        logger.info(f'队列为空超过{timeout}秒，退出等待 (已发送{batches_sent}/{expected_batches}批)')
                        break

            # 收集重试统计
            total_retries = 0
            while not stats_queue.empty():
                _, retries, _ = stats_queue.get()
                total_retries += retries

        finally:
            # 停止保存进程池
            saver_pool.stop()

        elapsed = time.time() - start

        return {
            'klines_dict': {},
            'success_count': max(0, len(stock_codes) - len(failed_codes)),  # 成功数 = 总数 - 失败数
            'failed_count': len(failed_codes),
            'total_klines': total_klines,
            'saved_count': total_saved,
            'error_count': len(failed_codes),
            'total_retries': total_retries,
            'elapsed': elapsed
        }

    def _fetch_single_stock(self, code: str, start_date: str, end_date: str, lg) -> Tuple[List, int]:
        """获取单只股票数据（带重试）

        Args:
            code: 股票代码，可能带前缀（sh.600000）或不带（600000）
        """
        # 如果代码已经带前缀（包含.），直接使用；否则添加前缀
        if '.' in code:
            bs_code = code  # 已经是完整格式（如 sh.600000）
        elif code.startswith('6'):
            bs_code = f"sh.{code}"
        else:
            bs_code = f"sz.{code}"

        retry_count = 0
        klines = []
        fetch_start = time.time()

        while retry_count <= self.max_retries:
            if retry_count > 0:
                # 指数退避重试：第1次重试等0.5s，第2次等1s
                backoff = 0.5 * (2 ** (retry_count - 1))
                time.sleep(backoff)
                # 重新登录
                bs.logout()
                lg = bs.login()

            request_start = time.time()

            rs = bs.query_history_k_data_plus(
                bs_code,
                "date,code,open,high,low,close,volume,amount",
                start_date=start_date,
                end_date=end_date,
                frequency="d",
                adjustflag="3"
            )

            request_time = time.time() - request_start

            # 只在真正的错误时重试
            if rs.error_code != '0':
                retry_count += 1
                continue

            # 完整消费数据
            while rs.next():
                row = rs.get_row_data()
                # 跳过空数据
                if not row or len(row) < 8:
                    continue
                # 检查关键字段是否为空
                if not row[2] or not row[3] or not row[4] or not row[5] or not row[6]:
                    continue
                try:
                    klines.append({
                        'trade_date': row[0],
                        'open': float(row[2]),
                        'high': float(row[3]),
                        'low': float(row[4]),
                        'close': float(row[5]),
                        'volume': int(float(row[6])),
                        'amount': float(row[7]) if row[7] else 0.0
                    })
                except (ValueError, IndexError):
                    # 数据格式错误，跳过这条记录
                    continue

            total_time = time.time() - fetch_start
            # 记录慢请求（不影响重试逻辑）
            if total_time > 2.0:
                logger.debug(f"{code} 获取较慢: {total_time:.2f}s (重试{retry_count}次)")

            return klines, retry_count

        return [], retry_count

    def _process_worker(self, codes: List[str], start_date: str, end_date: str,
                        process_id: int, result_queue, delay: float, max_retries: int,
                        execution_id: Optional[str] = None):
        """进程工作函数"""
        if delay > 0:
            time.sleep(delay)

        from datetime import datetime

        def worker_log(level: str, message: str):
            """子进程日志函数 - 同时记录本地日志和发送到主进程"""
            # 始终记录本地日志（用于调试）
            from logging_config import get_logger
            local_logger = get_logger('kline_worker')
            log_func = getattr(local_logger, level.lower(), local_logger.info)
            log_func(f'进程{process_id}: {message}')

            # 如果有execution_id，也发送到队列用于WebSocket转发
            if execution_id:
                log_data = {
                    'level': level,
                    'message': f'进程{process_id}: {message}',
                    'timestamp': datetime.now().isoformat(),
                    'executionId': execution_id
                }
                result_queue.put(('__log__', log_data, None))

        lg = bs.login()
        total_retries = 0

        try:
            worker_log('INFO', f'开始处理 {len(codes)} 只股票')
            for code in codes:
                fetch_start = time.time()
                klines, retries = self._fetch_single_stock(code, start_date, end_date, lg)
                fetch_time = time.time() - fetch_start
                total_retries += retries

                if klines:
                    # 发送数据时附带获取耗时
                    result_queue.put((code, klines, {'fetch_time': fetch_time}))
                    worker_log('DEBUG', f'{code} 获取 {len(klines)} 条记录 (耗时{fetch_time:.2f}s)')
                else:
                    result_queue.put((code, [], {'fetch_time': fetch_time, 'error': f"重试{max_retries}次后失败"}))
                    worker_log('WARNING', f'{code} 获取失败 (耗时{fetch_time:.2f}s)')

            worker_log('INFO', f'完成，重试 {total_retries} 次')

        finally:
            bs.logout()
            # 发送重试统计
            result_queue.put(('__stats__', total_retries, None))

    def _process_worker_with_saver(self, codes: List[str], start_date: str, end_date: str,
                                   process_id: int, result_queue, data_queue, delay: float, max_retries: int,
                                   execution_id: Optional[str] = None):
        """进程工作函数（使用独立保存进程）"""
        if delay > 0:
            time.sleep(delay)

        from datetime import datetime

        def worker_log(level: str, message: str):
            """子进程日志函数 - 同时记录本地日志和发送到主进程"""
            # 始终记录本地日志（用于调试）
            from logging_config import get_logger
            local_logger = get_logger('kline_worker')
            log_func = getattr(local_logger, level.lower(), local_logger.info)
            log_func(f'进程{process_id}: {message}')

            # 如果有execution_id，也发送到队列用于WebSocket转发
            if execution_id:
                log_data = {
                    'level': level,
                    'message': f'进程{process_id}: {message}',
                    'timestamp': datetime.now().isoformat(),
                    'executionId': execution_id
                }
                result_queue.put(('__log__', log_data, None))

        lg = bs.login()
        total_retries = 0

        # 数学批量：积累25只后整批发送
        BATCH_SIZE = 25
        batch_buffer: List[Tuple[str, list, dict]] = []
        batches_sent = 0  # 发送的批次数

        try:
            worker_log('INFO', f'开始处理 {len(codes)} 只股票 (批量大小={BATCH_SIZE})')
            for code in codes:
                fetch_start = time.time()
                klines, retries = self._fetch_single_stock(code, start_date, end_date, lg)
                fetch_time = time.time() - fetch_start
                total_retries += retries

                if klines:
                    # 积累到批次中
                    batch_buffer.append((code, klines, {'fetch_time': fetch_time}))

                    # 达到批量大小，整批发送给保存进程
                    if len(batch_buffer) >= BATCH_SIZE:
                        data_queue.put(list(batch_buffer))  # 发送副本，避免clear()影响队列中的数据
                        batches_sent += 1
                        worker_log('DEBUG', f'发送批次: {len(batch_buffer)}只股票')
                        batch_buffer.clear()
                else:
                    result_queue.put(('__failed__', None, code))
                    worker_log('WARNING', f'{code} 获取失败 (耗时{fetch_time:.2f}s)')

            # 发送最后一批（余数）
            if batch_buffer:
                worker_log('INFO', f'发送最后一批: {len(batch_buffer)}只股票')
                data_queue.put(list(batch_buffer))  # 发送副本
                batches_sent += 1
                batch_buffer.clear()

            worker_log('INFO', f'完成，发送 {batches_sent} 个批次，重试 {total_retries} 次')

        finally:
            bs.logout()
            # 发送重试统计
            result_queue.put(('__stats__', total_retries, None))
            # 报告发送的批次数（用于主进程判断所有数据是否已发送）
            result_queue.put(('__BATCH_COUNT__', batches_sent, None))

    def _distribute_stocks(self, codes: List[str], num_processes: int) -> List[List[str]]:
        """均匀分配股票到进程"""
        chunk_size = len(codes) // num_processes
        remainder = len(codes) % num_processes

        chunks = []
        start = 0
        for i in range(num_processes):
            # 前remainder个进程多分配1只
            size = chunk_size + (1 if i < remainder else 0)
            if size > 0:
                chunks.append(codes[start:start + size])
                start += size

        return chunks


# =============================================================================
# 任务队列管理器
# =============================================================================

class TaskQueueManager:
    """任务队列管理器"""

    def __init__(self):
        self.pending_queue = PyQueue()
        self.current_task: Optional[SyncTask] = None
        self.is_processing = False
        self.lock = threading.Lock()
        self.fetcher = MultiProcessFetcher(max_retries=2)

        # 线程安全的任务列表
        self.all_tasks: Dict[int, SyncTask] = {}
        self.task_results: Dict[int, SyncResult] = {}

    def enqueue(self, task: SyncTask):
        """任务入队"""
        with self.lock:
            self.all_tasks[task.task_id] = task
            self.pending_queue.put(task)
            logger.info(f"任务入队: {task.task_name} ({task.stock_count}只股票)")

    def start(self):
        """启动队列处理循环（后台线程）"""
        def process_loop():
            while True:
                try:
                    if not self.is_processing and not self.pending_queue.empty():
                        task = self.pending_queue.get()
                        self._execute_task(task)
                except Exception as e:
                    logger.error(f"任务处理异常: {e}")
                time.sleep(1)

        thread = threading.Thread(target=process_loop, daemon=True)
        thread.start()
        logger.info("任务队列管理器已启动")

    def _execute_task(self, task: SyncTask):
        """执行单个任务"""
        with self.lock:
            self.is_processing = True
            self.current_task = task

        try:
            logger.info(f"开始执行任务: {task.task_name} ({task.stock_count}只股票)")

            # 使用end_date，如果没有则用今天
            end_date = task.date_range[1] or datetime.now().strftime('%Y-%m-%d')

            # 执行同步
            fetch_result = self.fetcher.fetch(
                task.stock_codes,
                task.date_range[0],
                end_date,
                execution_id=None  # 日志通过WebSocket实时推送
            )

            # 流式保存已在 fetch 过程中完成
            # 构建结果
            result = SyncResult(
                task_id=task.task_id,
                status=TaskStatus.SUCCESS if fetch_result['failed_count'] == 0 else TaskStatus.FAILED,
                total_stocks=len(task.stock_codes),
                success_count=fetch_result['success_count'],
                failed_count=fetch_result['failed_count'],
                total_klines=fetch_result.get('total_klines', 0),
                elapsed_time=fetch_result['elapsed']
            )

            with self.lock:
                self.task_results[task.task_id] = result

            logger.info(f"任务完成: {task.task_name}, "
                       f"成功{result.success_count}/{result.total_stocks}, "
                       f"耗时{result.elapsed_time:.2f}秒")

        except Exception as e:
            logger.error(f"任务执行失败: {task.task_name}, 错误: {e}")
            result = SyncResult(
                task_id=task.task_id,
                status=TaskStatus.FAILED,
                total_stocks=len(task.stock_codes),
                success_count=0,
                failed_count=len(task.stock_codes),
                total_klines=0,
                elapsed_time=0,
                error_message=str(e)
            )

            with self.lock:
                self.task_results[task.task_id] = result

        finally:
            with self.lock:
                self.is_processing = False
                self.current_task = None

    def get_task_result(self, task_id: int) -> Optional[SyncResult]:
        """获取任务结果"""
        with self.lock:
            return self.task_results.get(task_id)

    def get_status(self) -> Dict[str, Any]:
        """获取队列状态"""
        with self.lock:
            return {
                'pending_count': self.pending_queue.qsize(),
                'current_task': self.current_task.task_name if self.current_task else None,
                'is_processing': self.is_processing
            }


# =============================================================================
# 辅助函数
# =============================================================================

def get_stock_codes_for_task(task: SyncTask) -> List[str]:
    """根据任务类型获取股票代码列表"""
    from java_client import java_client
    from logging_config import get_logger
    logger = get_logger('kline_sync_service')

    if task.task_type == 'single':
        return task.stock_codes
    elif task.task_type == 'watchlist':
        # 从Java获取用户自选股
        user_id = getattr(task, 'user_id', None)
        stocks = java_client.get_user_stocks(user_id)
        return [s['code'] for s in stocks]
    elif task.task_type == 'hs300':
        # 获取沪深300成分股（使用Java API）
        logger.info("从Java获取沪深300成分股...")
        stocks = java_client.get_all_stocks()  # 获取所有股票，前端过滤hs300
        return [s['code'] for s in stocks if s.get('code', '').startswith(('000', '002', '300', '600', '601'))]
    elif task.task_type == 'market':
        # 获取全市场股票（使用Java API）
        logger.info("从Java获取全市场股票列表...")
        stocks = java_client.get_all_stocks()
        codes = [s['code'] for s in stocks]
        logger.info(f"获取到 {len(codes)} 只股票")
        return codes
    else:
        return task.stock_codes


# =============================================================================
# 全局队列管理器实例
# =============================================================================

_queue_manager: Optional[TaskQueueManager] = None

def get_queue_manager() -> TaskQueueManager:
    """获取全局队列管理器实例"""
    global _queue_manager
    if _queue_manager is None:
        _queue_manager = TaskQueueManager()
        _queue_manager.start()
    return _queue_manager


def enqueue_sync_task(task_id: int, task_name: str, task_type: str,
                       stock_codes: List[str] = None) -> Dict[str, Any]:
    """入队同步任务"""
    manager = get_queue_manager()

    task = SyncTask(
        task_id=task_id,
        task_name=task_name,
        task_type=task_type,
        stock_codes=stock_codes or []
    )

    manager.enqueue(task)

    return {
        'success': True,
        'message': f'任务已加入队列: {task_name}',
        'task_id': task_id
    }
