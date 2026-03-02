"""
K线数据获取基础模块 (akshare版本)
使用 akshare 获取历史K线数据

数据源：akshare (免费，无需登录)
范围：single, batch, market
统一数据格式：KlineData
"""
import os
# 禁用代理
os.environ.pop('HTTP_PROXY', None)
os.environ.pop('HTTPS_PROXY', None)
os.environ.pop('http_proxy', None)
os.environ.pop('https_proxy', None)

import akshare as ak
from dataclasses import dataclass
from typing import List, Dict, Any
from datetime import datetime
from logging_config import get_logger
import time

logger = get_logger('kline_fetcher_ak')


# =============================================================================
# 统一数据格式
# =============================================================================

@dataclass
class KlineData:
    """统一K线数据格式"""
    code: str              # 股票代码（纯数字，如 '000001'）
    trade_date: str        # 交易日期 YYYY-MM-DD
    open: float            # 开盘价
    high: float            # 最高价
    low: float             # 最低价
    close: float           # 收盘价
    volume: int            # 成交量（股）
    amount: float          # 成交额
    pre_close: float = 0.0   # 昨收价
    turn_rate: float = 0.0   # 换手率 (%)
    pct_change: float = 0.0   # 涨跌幅 (%)

    def to_dict(self) -> dict:
        """转换为字典格式，用于Java API"""
        return {
            'trade_date': self.trade_date,
            'open': self.open,
            'high': self.high,
            'low': self.low,
            'close': self.close,
            'volume': self.volume,
            'amount': self.amount,
            'pre_close': self.pre_close,
            'turn_rate': self.turn_rate,
            'pct_change': self.pct_change
        }


# =============================================================================
# 日志接口 - 使用独立队列模块
# =============================================================================
_log_queue = None

def set_log_callback(callback):
    """设置日志回调函数，用于发送日志到 Java"""
    global _log_queue
    from async_queue import init_log_queue
    import threading

    def log_handler(event):
        """处理日志事件"""
        level = event['level']
        message = event['message']

        # 添加线程ID到消息
        tid = f"T{threading.get_ident() % 1000:03d}"
        message_with_tid = f"[{tid}] {message}"

        # 输出到 Python 日志（带线程ID）
        if level == 'INFO':
            logger.info(message_with_tid)
        elif level == 'WARNING':
            logger.warning(message_with_tid)
        elif level == 'ERROR':
            logger.error(message_with_tid)

        # 发送到 Java（带线程ID）
        if callback:
            try:
                callback(level, message_with_tid)
            except Exception as e:
                logger.warning(f"发送日志到 Java 失败: {e}")

    # 初始化全局日志队列
    _log_queue = init_log_queue(log_handler)


def publish_log(level: str, message: str):
    """
    发布日志到队列（非阻塞）
    """
    if _log_queue:
        import threading
        tid = f"T{threading.get_ident() % 1000:03d}"
        _log_queue.put({'level': level, 'message': message, 'thread_id': tid})


def _save_log(level: str, message: str):
    """
    统一的日志输出（通过队列，由队列处理器负责输出到日志）
    """
    publish_log(level, message)


# =============================================================================
# akshare 数据获取
# =============================================================================

def fetch_single(
    code: str,
    start_date: str,
    end_date: str
) -> List[KlineData]:
    """
    获取单只股票K线数据 (使用 akshare)

    Args:
        code: 股票代码（如 '000001', '600000'）
        start_date: 开始日期 YYYY-MM-DD
        end_date: 结束日期 YYYY-MM-DD

    Returns:
        KlineData列表
    """
    _save_log('INFO', f"[akshare] 获取单只股票K线: {code}, {start_date} ~ {end_date}")

    try:
        # 临时禁用系统代理
        import requests
        original_init = requests.Session.__init__

        def no_proxy_init(self, *args, **kwargs):
            original_init(self, *args, **kwargs)
            self.trust_env = False  # 不使用系统代理

        requests.Session.__init__ = no_proxy_init

        try:
            # akshare 不需要登录
            df = ak.stock_zh_a_hist(
                symbol=code,
                period="daily",
                start_date=start_date.replace('-', ''),
                end_date=end_date.replace('-', ''),
                adjust="qfq"  # 前复权
            )
        finally:
            requests.Session.__init__ = original_init

        if df.empty:
            _save_log('INFO', f"[akshare] 无数据: {code}")
            return []

        # 转换为 KlineData 列表
        klines = []
        for _, row in df.iterrows():
            try:
                klines.append(KlineData(
                    code=code,
                    trade_date=str(row['日期']),
                    open=float(row['开盘']),
                    high=float(row['最高']),
                    low=float(row['最低']),
                    close=float(row['收盘']),
                    volume=int(row['成交量']) if row['成交量'] > 0 else 0,
                    amount=float(row['成交额']) if row['成交额'] > 0 else 0.0,
                    pct_change=float(row['涨跌幅']) if '涨跌幅' in row and row['涨跌幅'] is not None else 0.0,
                    turn_rate=float(row['换手率']) if '换手率' in row and row['换手率'] is not None else 0.0
                ))
            except (ValueError, KeyError) as e:
                _save_log('WARNING', f"跳过异常数据行: {row.to_dict()}, error: {e}")
                continue

        _save_log('INFO', f"[akshare] 获取成功: {len(klines)} 条记录")
        return klines

    except Exception as e:
        error_msg = str(e)
        _save_log('ERROR', f"[akshare] 获取失败: {error_msg}")
        raise Exception(f"akshare获取失败: {error_msg}")


def fetch_batch(
    codes: List[str],
    start_date: str,
    end_date: str
) -> Dict[str, List[KlineData]]:
    """
    批量获取股票K线数据

    Args:
        codes: 股票代码列表
        start_date: 开始日期 YYYY-MM-DD
        end_date: 结束日期 YYYY-MM-DD

    Returns:
        {code: List[KlineData]} 字典
    """
    logger.info(f"[akshare] 批量获取K线: {len(codes)} 只股票")

    result = {}
    for code in codes:
        try:
            klines = fetch_single(code, start_date, end_date)
            if klines:
                result[code] = klines
        except Exception as e:
            logger.error(f"[akshare] 获取 {code} 失败: {e}")
            result[code] = []

    logger.info(f"[akshare] 批量获取完成: {len(result)}/{len(codes)} 成功")
    return result


# =============================================================================
# 获取股票列表
# =============================================================================

def get_stock_list() -> Dict[str, Dict[str, str]]:
    """
    获取A股股票列表

    Returns:
        Dict[code, Dict[code, name, type]]
        type: '1'=股票, '2'=指数, '5'=ETF
    """
    logger.info("[akshare] 获取股票列表")

    try:
        # 获取A股股票列表
        df = ak.stock_info_a_code_name()

        stock_dict = {}
        for _, row in df.iterrows():
            code = row['code']
            name = row['name']

            # 简单判断类型：6开头=沪市，其他=深市
            stock_type = '1'  # 默认为股票

            stock_dict[code] = {
                'code': code,
                'name': name,
                'type': stock_type
            }

        logger.info(f"[akshare] 获取到 {len(stock_dict)} 只证券")
        return stock_dict

    except Exception as e:
        logger.error(f"[akshare] 获取股票列表失败: {e}")
        raise


# =============================================================================
# 保存到Java
# =============================================================================

def save_to_java(
    klines: List[KlineData],
    code: str,
    stock_name: str = None,
    security_type: str = None,
    upsert: bool = False
) -> Dict[str, int]:
    """
    保存K线数据到Java后端

    Args:
        klines: KlineData列表
        code: 股票代码
        stock_name: 股票名称（可选）
        security_type: 证券类型（可选）
        upsert: 是否覆盖更新

    Returns:
        保存统计
    """
    from java_client import java_client

    if not klines:
        return {'savedCount': 0, 'updatedCount': 0, 'totalCount': 0}

    try:
        # 转换为Java API格式
        klines_data = [k.to_dict() for k in klines]

        # 调用Java API保存
        result = java_client.save_stock_klines(code, klines_data, stock_name, security_type, upsert)
        if result is not None:
            return result
        else:
            _save_log('ERROR', f"{code}-{stock_name if stock_name else '未知'} 保存失败: API返回None")
            return {'savedCount': 0, 'updatedCount': 0, 'totalCount': 0}

    except Exception as e:
        _save_log('ERROR', f"{code}-{stock_name if stock_name else '未知'} 保存失败: {e}")
        return {'savedCount': 0, 'updatedCount': 0, 'totalCount': 0}


# =============================================================================
# 批量保存
# =============================================================================

def save_klines_batch(
    klines_map: Dict[str, List[KlineData]],
    stock_list: Dict[str, Dict[str, str]] = None,
    upsert: bool = False
) -> Dict[str, Any]:
    """
    批量保存多只股票的K线数据到Java后端

    Args:
        klines_map: {code: List[KlineData]} 字典
        stock_list: 股票列表字典 {code: {name, type}}
        upsert: 是否覆盖更新

    Returns:
        保存统计
    """
    from java_client import java_client

    if not klines_map:
        return {
            'stockCount': 0,
            'savedCount': 0,
            'updatedCount': 0,
            'totalCount': 0,
            'failedStocks': []
        }

    stock_count = len(klines_map)
    total_saved = 0
    total_updated = 0
    failed_stocks = []

    _save_log('INFO', f"[akshare] 开始批量保存: {stock_count} 只股票")

    for code, klines in klines_map.items():
        if not klines:
            continue

        try:
            # 获取股票名称和类型
            stock_name = None
            security_type = None
            if stock_list and code in stock_list:
                stock_name = stock_list[code].get('name')
                security_type = stock_list[code].get('type')

            # 转换为Java API格式
            klines_data = [k.to_dict() for k in klines]

            # 调用Java API保存
            result = java_client.save_stock_klines(code, klines_data, stock_name, security_type, upsert)
            if result is not None:
                saved = result.get('savedCount', 0)
                updated = result.get('updatedCount', 0)
                total_saved += saved
                total_updated += updated
            else:
                failed_stocks.append(code)
                _save_log('ERROR', f"[akshare] {code} 保存失败: API返回None")

        except Exception as e:
            failed_stocks.append(code)
            _save_log('ERROR', f"[akshare] {code} 保存失败: {e}")

    total_count = total_saved + total_updated
    _save_log('INFO', f"[akshare] 批量保存完成: {stock_count}只股票, {total_count}条记录, {len(failed_stocks)}只失败")

    return {
        'stockCount': stock_count,
        'savedCount': total_saved,
        'updatedCount': total_updated,
        'totalCount': total_count,
        'failedStocks': failed_stocks
    }


# =============================================================================
# 市场范围获取
# =============================================================================

def fetch_market(
    start_date: str,
    end_date: str,
    market: str = 'all',
    max_workers: int = 1,
    save: bool = True,
    upsert: bool = False
) -> Dict[str, Any]:
    """
    获取市场所有股票的K线数据（串行）

    Args:
        start_date: 开始日期 YYYY-MM-DD
        end_date: 结束日期 YYYY-MM-DD
        market: 市场类型 ('all', 'sh', 'sz')
        max_workers: 并发数（akshare建议使用较小值）
        save: 是否保存到Java
        upsert: 是否覆盖更新

    Returns:
        获取统计
    """
    _save_log('INFO', f"[akshare] 市场范围K线获取: {market}, {start_date} ~ {end_date}")

    # 获取股票列表
    stock_list = get_stock_list()
    codes = list(stock_list.keys())

    # 过滤市场
    if market == 'sh':
        codes = [c for c in codes if c.startswith('6')]
    elif market == 'sz':
        codes = [c for c in codes if not c.startswith('6')]

    _save_log('INFO', f"[akshare] 待获取股票: {len(codes)} 只")

    result = {
        'market': market,
        'startDate': start_date,
        'endDate': end_date,
        'stockCount': len(codes),
        'successCount': 0,
        'failedCount': 0,
        'recordCount': 0,
        'klinesMap': {}
    }

    # 串行获取（akshare不需要登录，频率限制较宽松）
    for code in codes:
        try:
            klines = fetch_single(code, start_date, end_date)
            if klines:
                result['klinesMap'][code] = klines
                result['successCount'] += 1
                result['recordCount'] += len(klines)
            else:
                result['failedCount'] += 1

            # 进度报告
            if (result['successCount'] + result['failedCount']) % 10 == 0:
                _save_log('INFO',
                    f"[akshare] 进度: {result['successCount'] + result['failedCount']}/{len(codes)}, "
                    f"成功: {result['successCount']}, 失败: {result['failedCount']}"
                )

        except Exception as e:
            result['failedCount'] += 1
            _save_log('WARNING', f"[akshare] 获取 {code} 失败: {e}")

    # 保存到Java
    if save and result['klinesMap']:
        save_result = save_klines_batch(result['klinesMap'], stock_list, upsert)
        result.update(save_result)

    _save_log('INFO', f"[akshare] 市场获取完成: {result['successCount']}/{len(codes)} 成功")
    return result


def fetch_market_parallel(
    start_date: str,
    end_date: str,
    market: str = 'all',
    max_workers: int = 4,
    save: bool = True,
    upsert: bool = False
) -> Dict[str, Any]:
    """
    获取市场所有股票的K线数据（并行）

    Args:
        start_date: 开始日期 YYYY-MM-DD
        end_date: 结束日期 YYYY-MM-DD
        market: 市场类型 ('all', 'sh', 'sz')
        max_workers: 并发数（akshare建议使用较小值）
        save: 是否保存到Java
        upsert: 是否覆盖更新

    Returns:
        获取统计
    """
    import time
    from concurrent.futures import ThreadPoolExecutor, as_completed

    start_time = time.time()
    _save_log('INFO', f"[akshare] 并行市场K线获取: {market}, {max_workers}线程, {start_date} ~ {end_date}")

    # 获取股票列表
    stock_list = get_stock_list()
    codes = list(stock_list.keys())

    # 过滤市场
    if market == 'sh':
        codes = [c for c in codes if c.startswith('6')]
    elif market == 'sz':
        codes = [c for c in codes if not c.startswith('6')]

    _save_log('INFO', f"[akshare] 待获取股票: {len(codes)} 只")

    result = {
        'market': market,
        'startDate': start_date,
        'endDate': end_date,
        'stockCount': len(codes),
        'successCount': 0,
        'failedCount': 0,
        'recordCount': 0,
        'klinesMap': {}
    }

    def fetch_one(code: str) -> tuple:
        """获取单只股票"""
        try:
            klines = fetch_single(code, start_date, end_date)
            if klines:
                return code, klines, None
            else:
                return code, None, "无数据"
        except Exception as e:
            return code, None, str(e)[:50]

    # 并行获取
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(fetch_one, code): code for code in codes}

        for future in as_completed(futures):
            code, klines, error = future.result()

            if klines:
                result['klinesMap'][code] = klines
                result['successCount'] += 1
                result['recordCount'] += len(klines)
            else:
                result['failedCount'] += 1
                if error:
                    _save_log('WARNING', f"[akshare] {code} 失败: {error}")

            # 进度报告
            if (result['successCount'] + result['failedCount']) % 10 == 0:
                _save_log('INFO',
                    f"[akshare] 进度: {result['successCount'] + result['failedCount']}/{len(codes)}, "
                    f"成功: {result['successCount']}, 失败: {result['failedCount']}"
                )

    # 保存到Java
    if save and result['klinesMap']:
        save_result = save_klines_batch(result['klinesMap'], stock_list, upsert)
        result.update(save_result)

    elapsed = time.time() - start_time
    result['elapsed'] = elapsed

    _save_log('INFO', f"[akshare] 并行获取完成: {result['successCount']}/{len(codes)} 成功, 耗时: {elapsed:.1f}秒")
    return result
