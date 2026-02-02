#!/usr/bin/env python3
"""
股票K线数据同步定时任务
每天收盘后执行，拉取所有A股的K线数据并保存到PostgreSQL
"""

import sys
import os
from datetime import datetime, timedelta
import logging
import psycopg2
from psycopg2.extras import execute_values
import baostock as bs
import pandas as pd

# 添加父目录到路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from modules import data_fetcher, technical_analysis

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 数据库配置
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': int(os.getenv('DB_PORT', 5432)),
    'database': os.getenv('DB_NAME', 'alfred'),
    'user': os.getenv('DB_USER', 'alfred'),
    'password': os.getenv('DB_PASSWORD', 'alfred123')
}


def get_db_connection():
    """获取数据库连接"""
    return psycopg2.connect(**DB_CONFIG)


def get_all_stocks_from_exchange() -> list:
    """
    从交易所获取所有A股列表

    Returns:
        [(code, name, market), ...]
    """
    try:
        # 登录Baostock
        lg = bs.login()
        if lg.error_code != '0':
            raise Exception(f"BaoStock登录失败: {lg.error_msg}")

        logger.info("正在获取A股股票列表...")

        # 获取所有A股列表
        stocks = []
        for market in ['sh.600000', 'sz.000001']:  # 上交所和深交所的起始代码
            # 获取该市场所有股票
            rs = bs.query_all_stock(market.split('.')[0])

            if rs.error_code != '0':
                logger.warning(f"获取{market}股票列表失败: {rs.error_msg}")
                continue

            # 分批处理（每次1000只）
            while (rs.error_code == '0') & rs.next():
                row = rs.get_row_data()
                code = row[0]  # 股票代码
                name = row[1]  # 股票名称
                market = row[2]  # 市场

                # 只保留普通A股（排除ST、退市等）
                if ('ST' not in name and
                    '退' not in name and
                    code.startswith(('6', '0', '3'))):
                    stocks.append((code, name, market))

                if len(stocks) >= 5000:  # 限制数量，避免太多
                    break

        bs.logout()

        logger.info(f"获取到 {len(stocks)} 只A股股票")
        return stocks

    except Exception as e:
        logger.error(f"获取股票列表失败: {str(e)}")
        return []


def ensure_stock_exists(conn, code: str, name: str, market: str) -> int:
    """确保股票信息存在于数据库中，返回stock_id"""
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id FROM stock_info WHERE code = %s",
            (code,)
        )
        result = cur.fetchone()

        if result:
            return result[0]
        else:
            # 插入新股票
            cur.execute(
                """INSERT INTO stock_info (code, name, market)
                   VALUES (%s, %s, %s)
                   RETURNING id""",
                (code, name, market)
            )
            conn.commit()
            logger.info(f"新增股票信息: {code} - {name}")
            return cur.fetchone()[0]


def sync_stock_klines_batch(stocks: list, days: int = 90) -> tuple:
    """
    批量同步股票K线数据

    Args:
        stocks: [(code, name, market), ...]
        days: 拉取天数

    Returns:
        (新增K线数, 更新指标数)
    """
    # 计算日期范围
    end_date = datetime.now().strftime('%Y-%m-%d')
    start_date = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')

    logger.info(f"开始拉取K线数据: {start_date} 至 {end_date}")

    conn = get_db_connection()
    try:
        total_klines = 0
        total_indicators = 0

        for idx, (code, name, market) in enumerate(stocks, 1):
            try:
                if idx % 100 == 0:
                    logger.info(f"进度: {idx}/{len(stocks)}")

                # 确保股票信息存在
                stock_id = ensure_stock_exists(conn, code, name, market)

                # 拉取K线数据
                df = data_fetcher.fetch_stock_data(code, start_date, end_date)
                if df is None or df.empty:
                    continue

                # 批量插入K线
                klines_data = []
                for date_idx, row in df.iterrows():
                    trade_date = date_idx.strftime('%Y-%m-%d')
                    klines_data.append((
                        stock_id,
                        trade_date,
                        float(row['open']),
                        float(row['high']),
                        float(row['low']),
                        float(row['close']),
                        int(row['volume']),
                        float(row.get('amount', 0))
                    ))

                with conn.cursor() as cur:
                    execute_values(
                        cur,
                        """INSERT INTO stock_klines (stock_id, trade_date, open, high, low, close, volume, amount)
                           VALUES %s
                           ON CONFLICT (stock_id, trade_date) DO NOTHING""",
                        klines_data
                    )
                    inserted_count = cur.rowcount
                    conn.commit()
                    total_klines += inserted_count

                # 计算并保存技术指标
                df_with_indicators = technical_analysis.calculate_all_indicators(df)

                indicators_data = []
                for date_idx, row in df_with_indicators.iterrows():
                    trade_date = date_idx.strftime('%Y-%m-%d')

                    if pd.notna(row.get('MA5')):
                        indicators_data.append((
                            stock_id,
                            trade_date,
                            float(row.get('MA5')) if pd.notna(row.get('MA5')) else None,
                            float(row.get('MA10')) if pd.notna(row.get('MA10')) else None,
                            float(row.get('MA20')) if pd.notna(row.get('MA20')) else None,
                            float(row.get('MA60')) if pd.notna(row.get('MA60')) else None,
                            float(row.get('MACD')) if pd.notna(row.get('MACD')) else None,
                            float(row.get('MACD_Signal')) if pd.notna(row.get('MACD_Signal')) else None,
                            float(row.get('MACD_Hist')) if pd.notna(row.get('MACD_Hist')) else None,
                            float(row.get('RSI')) if pd.notna(row.get('RSI')) else None,
                            float(row.get('K')) if pd.notna(row.get('K')) else None,
                            float(row.get('D')) if pd.notna(row.get('D')) else None,
                            float(row.get('J')) if pd.notna(row.get('J')) else None,
                            float(row.get('BB_Upper')) if pd.notna(row.get('BB_Upper')) else None,
                            float(row.get('BB_Middle')) if pd.notna(row.get('BB_Middle')) else None,
                            float(row.get('BB_Lower')) if pd.notna(row.get('BB_Lower')) else None,
                        ))

                if indicators_data:
                    execute_values(
                        cur,
                        """INSERT INTO stock_indicators
                           (stock_id, trade_date, ma5, ma10, ma20, ma60,
                            macd, macd_signal, macd_hist, rsi,
                            kdj_k, kdj_d, kdj_j, boll_upper, boll_middle, boll_lower)
                           VALUES %s
                           ON CONFLICT (stock_id, trade_date)
                           DO UPDATE SET
                               ma5 = EXCLUDED.ma5,
                               ma10 = EXCLUDED.ma10,
                               ma20 = EXCLUDED.ma20,
                               ma60 = EXCLUDED.ma60,
                               macd = EXCLUDED.macd,
                               macd_signal = EXCLUDED.macd_signal,
                               macd_hist = EXCLUDED.macd_hist,
                               rsi = EXCLUDED.rsi,
                               kdj_k = EXCLUDED.kdj_k,
                               kdj_d = EXCLUDED.kdj_d,
                               kdj_j = EXCLUDED.kdj_j,
                               boll_upper = EXCLUDED.boll_upper,
                               boll_middle = EXCLUDED.boll_middle,
                               boll_lower = EXCLUDED.boll_lower,
                               updated_at = CURRENT_TIMESTAMP""",
                        indicators_data
                    )
                    conn.commit()
                    total_indicators += len(indicators_data)

            except Exception as e:
                logger.error(f"处理股票 {code} 失败: {str(e)}")
                continue

        return total_klines, total_indicators

    finally:
        conn.close()


def main():
    """主函数"""
    logger.info("=" * 60)
    logger.info(f"开始执行K线数据同步任务: {datetime.now()}")
    logger.info("=" * 60)

    try:
        # 1. 从交易所获取所有A股列表
        stocks = get_all_stocks_from_exchange()

        if not stocks:
            logger.error("未获取到股票列表，任务终止")
            return

        # 2. 批量拉取K线数据并保存
        total_klines, total_indicators = sync_stock_klines_batch(stocks, days=90)

        logger.info("=" * 60)
        logger.info(f"同步完成 - 股票: {len(stocks)} 只, K线: {total_klines} 条, 指标: {total_indicators} 条")
        logger.info("=" * 60)

    except Exception as e:
        logger.error(f"同步任务失败: {str(e)}", exc_info=True)


if __name__ == "__main__":
    main()
