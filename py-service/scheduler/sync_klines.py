"""
股票K线数据同步模块
Stock K-line Data Sync Module

负责从数据源获取股票数据并同步到Spring Boot后端
"""

import sys
import os
import logging
import pandas as pd
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional

# 北京时区 (UTC+8)
BEIJING_TZ = timezone(timedelta(hours=8))

# 添加父目录到路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import requests
from modules import data_fetcher, technical_analysis

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Spring Boot 后端地址
SPRING_BOOT_URL = os.environ.get('SPRING_BOOT_URL', 'http://localhost:8080')


def sync_stock_klines(stock_code: str, days: int = 365) -> Dict[str, Any]:
    """
    同步股票K线数据

    Args:
        stock_code: 股票代码（如 '601985'）
        days: 同步天数，默认365天

    Returns:
        同步结果
    """
    logger.info(f"开始同步股票 {stock_code} 的K线数据，同步范围：{days}天")

    try:
        # 使用北京时间计算日期范围
        now = datetime.now(BEIJING_TZ)
        end_date = now.strftime('%Y-%m-%d')
        start_date = (now - timedelta(days=days)).strftime('%Y-%m-%d')

        # 1. 获取股票数据
        logger.info(f"从数据源获取股票数据: {start_date} ~ {end_date}")
        df = data_fetcher.fetch_stock_data(stock_code, start_date, end_date)

        if df is None or df.empty:
            return {
                'success': False,
                'message': f'未获取到股票 {stock_code} 的数据，请检查股票代码是否正确',
                'records_count': 0
            }

        # 提取股票名称（从 DataFrame 的 '名称' 列）
        stock_name = None
        if '名称' in df.columns and len(df) > 0:
            stock_name = df['名称'].iloc[0]
            logger.info(f"获取到股票名称: {stock_name}")

        # 2. 转换数据格式
        klines = []
        for index, row in df.iterrows():
            kline = {
                'trade_date': index.strftime('%Y-%m-%d') if hasattr(index, 'strftime') else str(index)[:10],
                'open': float(row['open']),
                'high': float(row['high']),
                'low': float(row['low']),
                'close': float(row['close']),
                'volume': float(row['volume']),
                'amount': float(row.get('amount', 0))
            }
            klines.append(kline)

        logger.info(f"获取到 {len(klines)} 条K线数据")

        # 3. 调用Spring Boot API保存数据
        save_url = f"{SPRING_BOOT_URL}/api/v1/stocks/internal/save-klines"
        request_data = {
            'code': stock_code,
            'klines': klines
        }
        # 添加股票名称（如果获取到了）
        if stock_name:
            request_data['stockName'] = stock_name

        response = requests.post(
            save_url,
            json=request_data,
            timeout=60
        )

        if response.status_code == 200:
            result = response.json()
            saved_count = result.get('data', {}).get('savedCount', 0)
            logger.info(f"K线同步成功，保存 {saved_count} 条记录")

            # 4. 计算并保存技术指标
            logger.info("开始计算技术指标...")
            df_with_indicators = technical_analysis.calculate_all_indicators(df)

            # 转换指标数据为后端格式
            indicators_data = []
            for date, row in df_with_indicators.iterrows():
                indicator = {
                    'trade_date': date.strftime('%Y-%m-%d') if hasattr(date, 'strftime') else str(date)[:10],
                    'ma5': float(row['MA5']) if not pd.isna(row['MA5']) else None,
                    'ma10': float(row['MA10']) if not pd.isna(row['MA10']) else None,
                    'ma20': float(row['MA20']) if not pd.isna(row['MA20']) else None,
                    'ma60': float(row['MA60']) if 'MA60' in row and not pd.isna(row['MA60']) else None,
                    'macd': float(row['MACD']) if not pd.isna(row['MACD']) else None,
                    'macd_signal': float(row['MACD_Signal']) if not pd.isna(row['MACD_Signal']) else None,
                    'macd_hist': float(row['MACD_Hist']) if not pd.isna(row['MACD_Hist']) else None,
                    'rsi': float(row['RSI']) if not pd.isna(row['RSI']) else None,
                    'kdj_k': float(row['K']) if not pd.isna(row['K']) else None,
                    'kdj_d': float(row['D']) if not pd.isna(row['D']) else None,
                    'kdj_j': float(row['J']) if not pd.isna(row['J']) else None,
                    'boll_upper': float(row['BB_Upper']) if 'BB_Upper' in row and not pd.isna(row['BB_Upper']) else None,
                    'boll_middle': float(row['BB_Middle']) if 'BB_Middle' in row and not pd.isna(row['BB_Middle']) else None,
                    'boll_lower': float(row['BB_Lower']) if 'BB_Lower' in row and not pd.isna(row['BB_Lower']) else None,
                }
                indicators_data.append(indicator)

            # 保存技术指标到后端
            save_url = f"{SPRING_BOOT_URL}/api/v1/stocks/internal/save-indicators"
            indicators_request = {
                'code': stock_code,
                'indicators': indicators_data
            }

            indicators_response = requests.post(
                save_url,
                json=indicators_request,
                timeout=60
            )

            if indicators_response.status_code == 200:
                logger.info(f"技术指标保存成功，共 {len(indicators_data)} 条记录")
            else:
                logger.warning(f"技术指标保存失败: HTTP {indicators_response.status_code}")

            return {
                'success': True,
                'message': '同步成功',
                'records_count': saved_count,
                'total_fetched': len(klines),
                'stock_name': stock_name
            }
        else:
            error_msg = f"保存数据失败: HTTP {response.status_code}"
            logger.error(error_msg)
            return {
                'success': False,
                'message': error_msg,
                'records_count': 0
            }

    except Exception as e:
        error_msg = f"同步失败: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return {
            'success': False,
            'message': error_msg,
            'records_count': 0
        }


def execute_sync(stock_code: str, task_id: Optional[int] = None) -> Dict[str, Any]:
    """
    执行同步任务（供API调用）

    Args:
        stock_code: 股票代码
        task_id: 任务ID（可选，用于状态追踪）

    Returns:
        同步结果
    """
    logger.info(f"执行同步任务: stock_code={stock_code}, task_id={task_id}")

    result = sync_stock_klines(stock_code)

    # 添加任务ID到结果
    if task_id:
        result['task_id'] = task_id

    return result


def main():
    """主函数 - 测试同步"""
    import argparse

    parser = argparse.ArgumentParser(description='股票K线数据同步工具')
    parser.add_argument('stock_code', help='股票代码（如 601985）')
    parser.add_argument('--days', type=int, default=365, help='同步天数（默认365天）')

    args = parser.parse_args()

    result = sync_stock_klines(args.stock_code, args.days)
    print(f"\n同步结果: {result}")


if __name__ == '__main__':
    main()
