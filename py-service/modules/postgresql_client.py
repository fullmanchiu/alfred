"""
PostgreSQL 数据库直连客户端
用于 K线数据直接写入，避免 WebSocket 传输大数据量
"""
import psycopg2
import psycopg2.extras
from typing import List, Dict, Any, Optional
from contextlib import contextmanager
from dataclasses import dataclass
import os
import time
from io import StringIO
from logging_config import get_logger

logger = get_logger('postgresql_client')

# 数据库配置（从环境变量或默认值）
DB_CONFIG = {
    'host': os.getenv('DB_HOST', '110.42.222.64'),
    'port': int(os.getenv('DB_PORT', '35432')),
    'database': os.getenv('DB_NAME', 'alfred'),
    'user': os.getenv('DB_USER', 'alfred'),
    'password': os.getenv('DB_PASSWORD', '7j5xS8ENKZe74Hde')
}


@dataclass
class KlineData:
    """K线数据"""
    stock_id: int
    trade_date: str  # YYYY-MM-DD
    open: float
    high: float
    low: float
    close: float
    volume: int
    amount: Optional[float] = None
    pre_close: Optional[float] = None
    turn_rate: Optional[float] = None
    pct_change: Optional[float] = None


class PostgreSQLClient:
    """PostgreSQL 客户端"""

    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or DB_CONFIG
        self._conn = None

    @contextmanager
    def get_connection(self):
        """获取数据库连接（上下文管理器）"""
        conn = None
        try:
            conn = psycopg2.connect(**self.config)
            yield conn
            conn.commit()
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"数据库操作失败: {e}")
            raise
        finally:
            if conn:
                conn.close()

    def test_connection(self) -> bool:
        """测试数据库连接"""
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT 1")
                    result = cur.fetchone()
                    logger.info(f"数据库连接成功: {result}")
                    return True
        except Exception as e:
            logger.error(f"数据库连接失败: {e}")
            return False

    def get_stock_id_by_code(self, code: str) -> Optional[int]:
        """根据股票代码获取 stock_id"""
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT id FROM stock_info WHERE code = %s", (code,))
                result = cur.fetchone()
                return result[0] if result else None

    def upsert_stock_info(self, stocks: List[Dict[str, Any]]) -> int:
        """
        批量插入或更新股票基本信息

        Args:
            stocks: [{'code': '600000', 'name': '浦发银行', 'market': 'SH', ...}, ...]

        Returns:
            成功处理的数量
        """
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                # 使用 ON CONFLICT 实现 Upsert
                sql = """
                    INSERT INTO stock_info (code, name, market, industry, type, created_at, updated_at)
                    VALUES (%(code)s, %(name)s, %(market)s, %(industry)s, %(type)s, NOW(), NOW())
                    ON CONFLICT (code) DO UPDATE
                        SET name = EXCLUDED.name,
                            market = EXCLUDED.market,
                            industry = EXCLUDED.industry,
                            type = EXCLUDED.type,
                            updated_at = NOW()
                """
                psycopg2.extras.execute_batch(cur, sql, stocks)
                return len(stocks)

    def save_klines(self, klines: List[KlineData]) -> int:
        """
        批量保存K线数据

        Args:
            klines: KlineData 对象列表

        Returns:
            成功保存的数量
        """
        if not klines:
            return 0

        with self.get_connection() as conn:
            with conn.cursor() as cur:
                # 使用 ON CONFLICT 实现Upsert（避免重复）
                sql = """
                    INSERT INTO stock_klines
                        (stock_id, trade_date, open, high, low, close, volume,
                         amount, pre_close, turn_rate, pct_change, created_at)
                    VALUES (%(stock_id)s, %(trade_date)s, %(open)s, %(high)s,
                            %(low)s, %(close)s, %(volume)s, %(amount)s,
                            %(pre_close)s, %(turn_rate)s, %(pct_change)s, NOW())
                    ON CONFLICT (stock_id, trade_date) DO UPDATE
                        SET open = EXCLUDED.open,
                            high = EXCLUDED.high,
                            low = EXCLUDED.low,
                            close = EXCLUDED.close,
                            volume = EXCLUDED.volume,
                            amount = EXCLUDED.amount,
                            pre_close = EXCLUDED.pre_close,
                            turn_rate = EXCLUDED.turn_rate,
                            pct_change = EXCLUDED.pct_change
                """
                data = [k.__dict__ for k in klines]
                psycopg2.extras.execute_batch(cur, sql, data)
                return len(klines)

    def save_klines_batch(self, klines_dict: Dict[str, List[Dict]], batch_size: int = 100) -> Dict[str, int]:
        """
        批量保存K线数据（按代码分组，使用大事务）

        Args:
            klines_dict: {code: [kline_data, ...], ...}
                        kline_data 格式: {trade_date, open, high, low, close, volume, ...}
            batch_size: 每批提交的K线条数（默认100）

        Returns:
            {'saved': 保存数量, 'errors': 错误数量}
        """
        total_saved = 0
        total_errors = 0

        with self.get_connection() as conn:
            with conn.cursor() as cur:
                # 预先获取所有 stock_id，减少数据库查询
                codes_to_fetch = list(klines_dict.keys())
                stock_ids = {}
                for code in codes_to_fetch:
                    stock_id = self.get_stock_id_by_code(code)
                    if stock_id:
                        stock_ids[code] = stock_id
                    else:
                        logger.warning(f"股票代码不存在: {code}")
                        total_errors += len(klines_dict.get(code, []))

                # 准备所有K线数据
                all_klines_data = []
                for code, klines in klines_dict.items():
                    stock_id = stock_ids.get(code)
                    if not stock_id:
                        continue

                    for k in klines:
                        try:
                            all_klines_data.append({
                                'stock_id': stock_id,
                                'trade_date': k.get('trade_date'),
                                'open': float(k.get('open', 0)),
                                'high': float(k.get('high', 0)),
                                'low': float(k.get('low', 0)),
                                'close': float(k.get('close', 0)),
                                'volume': int(k.get('volume', 0)),
                                'amount': float(k['amount']) if k.get('amount') else None,
                                'pre_close': float(k['pre_close']) if k.get('pre_close') else None,
                                'turn_rate': float(k['turn_rate']) if k.get('turn_rate') else None,
                                'pct_change': float(k['pct_change']) if k.get('pct_change') else None
                            })
                        except (ValueError, TypeError) as e:
                            logger.warning(f"K线数据格式错误: {code}, {k}, {e}")
                            total_errors += 1

                # 分批提交（使用大事务）
                sql = """
                    INSERT INTO stock_klines
                        (stock_id, trade_date, open, high, low, close, volume,
                         amount, pre_close, turn_rate, pct_change, created_at)
                    VALUES (%(stock_id)s, %(trade_date)s, %(open)s, %(high)s,
                            %(low)s, %(close)s, %(volume)s, %(amount)s,
                            %(pre_close)s, %(turn_rate)s, %(pct_change)s, NOW())
                    ON CONFLICT (stock_id, trade_date) DO UPDATE
                        SET open = EXCLUDED.open,
                            high = EXCLUDED.high,
                            low = EXCLUDED.low,
                            close = EXCLUDED.close,
                            volume = EXCLUDED.volume,
                            amount = EXCLUDED.amount,
                            pre_close = EXCLUDED.pre_close,
                            turn_rate = EXCLUDED.turn_rate,
                            pct_change = EXCLUDED.pct_change
                """

                # 分批执行 execute_batch
                for i in range(0, len(all_klines_data), batch_size):
                    batch = all_klines_data[i:i + batch_size]
                    try:
                        psycopg2.extras.execute_batch(cur, sql, batch, page_size=len(batch))
                        total_saved += len(batch)
                    except Exception as e:
                        logger.error(f"批量保存失败 (batch {i//batch_size + 1}): {e}")
                        total_errors += len(batch)

        logger.info(f"K线批量保存完成: 成功={total_saved}, 失败={total_errors}, 批次数={(len(all_klines_data) + batch_size - 1)//batch_size}")
        return {'saved': total_saved, 'errors': total_errors}

    def save_klines_copy(self, klines_dict: Dict[str, List[Dict]]) -> Dict[str, int]:
        """
        使用 COPY 命令快速批量保存K线数据

        COPY 比 execute_batch 快 10-100 倍，直接写入数据页，绕过 SQL 解析

        策略：先删除冲突数据，然后 COPY 插入（实现 Upsert 效果）

        Args:
            klines_dict: {code: [kline_data, ...], ...}

        Returns:
            {'saved': 保存数量, 'errors': 错误数量}
        """
        total_saved = 0
        total_errors = 0

        with self.get_connection() as conn:
            with conn.cursor() as cur:
                # 预先获取所有 stock_id
                codes_to_fetch = list(klines_dict.keys())
                stock_ids = {}
                for code in codes_to_fetch:
                    stock_id = self.get_stock_id_by_code(code)
                    if stock_id:
                        stock_ids[code] = stock_id
                    else:
                        logger.warning(f"股票代码不存在: {code}")
                        total_errors += len(klines_dict.get(code, []))

                # 准备所有K线数据并收集需要删除的 (stock_id, trade_date) 对
                all_klines_data = []
                delete_pairs = []  # (stock_id, trade_date) 需要删除的记录

                for code, klines in klines_dict.items():
                    stock_id = stock_ids.get(code)
                    if not stock_id:
                        continue

                    for k in klines:
                        try:
                            trade_date = k.get('trade_date')
                            all_klines_data.append({
                                'stock_id': stock_id,
                                'trade_date': trade_date,
                                'open': float(k.get('open', 0)),
                                'high': float(k.get('high', 0)),
                                'low': float(k.get('low', 0)),
                                'close': float(k.get('close', 0)),
                                'volume': int(k.get('volume', 0)),
                                'amount': float(k['amount']) if k.get('amount') else '\\N',
                                'pre_close': float(k['pre_close']) if k.get('pre_close') else '\\N',
                                'turn_rate': float(k['turn_rate']) if k.get('turn_rate') else '\\N',
                                'pct_change': float(k['pct_change']) if k.get('pct_change') else '\\N'
                            })
                            delete_pairs.append((stock_id, trade_date))
                        except (ValueError, TypeError) as e:
                            logger.warning(f"K线数据格式错误: {code}, {k}, {e}")
                            total_errors += 1

                if not all_klines_data:
                    return {'saved': 0, 'errors': total_errors}

                # 步骤1：删除冲突数据（实现 Upsert）
                if delete_pairs:
                    delete_start = time.time()
                    cur.execute("""
                        DELETE FROM stock_klines
                        WHERE (stock_id, trade_date) IN %s
                    """, (tuple(delete_pairs),))
                    deleted = cur.rowcount
                    logger.debug(f"COPY 前删除 {deleted} 条冲突记录 (耗时{time.time()-delete_start:.3f}s)")

                # 步骤2：使用 COPY 快速插入
                copy_start = time.time()

                # 构造 CSV 格式数据（使用制表符分隔）
                f = StringIO()
                for k in all_klines_data:
                    # COPY 格式：stock_id, trade_date, open, high, low, close, volume, amount, pre_close, turn_rate, pct_change
                    # NULL 值使用 \N 表示
                    f.write(f"{k['stock_id']}\t{k['trade_date']}\t{k['open']}\t{k['high']}\t"
                           f"{k['low']}\t{k['close']}\t{k['volume']}\t{k['amount']}\t"
                           f"{k['pre_close']}\t{k['turn_rate']}\t{k['pct_change']}\n")
                f.seek(0)

                # 执行 COPY
                cur.copy_from(
                    f,
                    'stock_klines',
                    columns=['stock_id', 'trade_date', 'open', 'high', 'low', 'close',
                            'volume', 'amount', 'pre_close', 'turn_rate', 'pct_change']
                )

                copy_time = time.time() - copy_start
                total_saved = len(all_klines_data)

                logger.info(f"COPY 保存完成: {total_saved}条 (耗时{copy_time:.3f}s, {total_saved/copy_time:.0f}条/秒)")

        return {'saved': total_saved, 'errors': total_errors}


# 全局单例
_pg_client = None


def get_pg_client() -> PostgreSQLClient:
    """获取 PostgreSQL 客户端单例"""
    global _pg_client
    if _pg_client is None:
        _pg_client = PostgreSQLClient()
        # 测试连接
        if not _pg_client.test_connection():
            raise ConnectionError("无法连接到 PostgreSQL 数据库")
    return _pg_client


if __name__ == '__main__':
    # 测试
    client = get_pg_client()
    print("数据库连接测试成功!")
