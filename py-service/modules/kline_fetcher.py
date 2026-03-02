"""
K线数据获取基础模块
使用 baostock 获取历史K线数据

数据源：baostock
范围：single, batch, market
统一数据格式：KlineData
"""
import baostock as bs
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Any
from datetime import datetime
from logging_config import get_logger
import time
import threading
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError

logger = get_logger('kline_fetcher')

# 单个股票获取超时时间（秒）
SINGLE_FETCH_TIMEOUT = 10


def _thread_id() -> str:
    """获取当前线程ID"""
    return f"T{threading.get_ident() % 1000:03d}"


def _log_with_thread(level: str, message: str):
    """带线程ID的日志输出（直接输出，不走队列）"""
    tid = _thread_id()
    if level == 'INFO':
        logger.info(f"[{tid}] {message}")
    elif level == 'WARNING':
        logger.warning(f"[{tid}] {message}")
    elif level == 'ERROR':
        logger.error(f"[{tid}] {message}")


# =============================================================================
# 日志接口 - 使用独立队列模块
# =============================================================================
_log_queue = None

def set_log_callback(callback):
    """设置日志回调函数，用于发送日志到 Java"""
    global _log_queue
    from async_queue import init_log_queue

    def log_handler(event):
        """处理日志事件"""
        level = event['level']
        message = event['message']
        thread_id = event.get('thread_id', _thread_id())  # 使用队列中的线程ID

        # 添加线程ID到消息
        message_with_tid = f"[{thread_id}] {message}"

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
        # 在发送时就捕获线程ID，而不是在队列处理器中捕获
        tid = _thread_id()
        _log_queue.put({'level': level, 'message': message, 'thread_id': tid})


def _save_log(level: str, message: str):
    """
    统一的日志输出（通过队列，由队列处理器负责输出到日志）
    """
    # 只发送到队列，log_handler 会负责输出到 Python 日志
    publish_log(level, message)


# =============================================================================
# baostock 登录重试机制
# =============================================================================

def login_with_retry(max_retries: int = 3, initial_delay: float = 1.0) -> Optional[any]:
    """
    带重试机制的 baostock 登录函数

    Args:
        max_retries: 最大重试次数，默认3次
        initial_delay: 初始延迟时间（秒），使用指数退避

    Returns:
        登录成功返回登录对象，失败返回 None
    """
    for attempt in range(max_retries):
        try:
            lg = bs.login()
            if lg.error_code == '0':
                logger.info(f"[baostock] 登录成功")
                return lg
            else:
                logger.warning(f"[baostock] 登录失败 (尝试 {attempt + 1}/{max_retries}): {lg.error_msg}")

                # 如果是网络错误，进行重试
                if attempt < max_retries - 1:
                    delay = initial_delay * (2 ** attempt)  # 指数退避: 1s, 2s, 4s
                    logger.info(f"[baostock] 等待 {delay:.1f} 秒后重试...")
                    time.sleep(delay)
                else:
                    logger.error(f"[baostock] 登录失败，已达最大重试次数")

        except Exception as e:
            error_msg = str(e)
            logger.warning(f"[baostock] 登录异常 (尝试 {attempt + 1}/{max_retries}): {error_msg}")

            # 检查是否是网络相关的错误
            is_network_error = any(keyword in error_msg for keyword in [
                '网络', 'network', '连接', 'connection', '超时', 'timeout',
                '接收错误', 'receive', '网络接收错误'
            ])

            if is_network_error and attempt < max_retries - 1:
                delay = initial_delay * (2 ** attempt)
                logger.info(f"[baostock] 检测到网络错误，等待 {delay:.1f} 秒后重试...")
                time.sleep(delay)
            elif attempt < max_retries - 1:
                # 非网络错误也重试，但延迟较短
                delay = initial_delay
                logger.info(f"[baostock] 等待 {delay:.1f} 秒后重试...")
                time.sleep(delay)
            else:
                logger.error(f"[baostock] 登录失败，已达最大重试次数: {error_msg}")

    return None


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
# 多线程并行获取
# =============================================================================

def fetch_market_parallel(
    start_date: str,
    end_date: str,
    market: str = 'all',
    max_workers: int = 1,  # 强制单线程，baostock 不支持并发
    delay: float = 0.5
) -> Dict[str, Any]:
    """
    获取全市场证券K线数据（已改为串行模式）

    注意：由于 baostock 有频率限制，多线程反而会增加超时率。
    此函数已改为使用单线程串行获取，每次请求 login/logout + 延迟。

    Args:
        start_date: 开始日期 YYYY-MM-DD
        end_date: 结束日期 YYYY-MM-DD
        market: 市场范围 'all'/'sh'/'sz'
        max_workers: 已废弃，参数保留但忽略（强制使用单线程）
        delay: 每次请求后的延迟时间（秒），默认0.5秒

    Returns:
        {
            'klines_dict': {baostock_code: [KlineData]},
            'stock_dict': {baostock_code: {'name': xxx, 'type': xxx}},
            'success_count': int,
            'failed_count': int,
            'total_count': int,
            'total_klines': int
        }
    """
    # 警告：强制使用单线程
    if max_workers > 1:
        logger.warning(f"[baostock] max_workers={max_workers} 被忽略，强制使用单线程（baostock 不支持并发）")

    logger.info(f"[baostock] 串行获取全市场K线: market={market}, {start_date} ~ {end_date}, delay={delay}秒")

    # 直接调用 fetch_market（已优化为每次 login/logout + 延迟）
    return fetch_market(start_date, end_date, market, delay)


# =============================================================================
# baostock 数据源
# =============================================================================

def fetch_single(
    code: str,
    start_date: str,
    end_date: str,
    lg=None
) -> List[KlineData]:
    """
    获取单只股票K线数据

    Args:
        code: 股票代码（如 '000001', '600000'）
        start_date: 开始日期 YYYY-MM-DD
        end_date: 结束日期 YYYY-MM-DD
        lg: 可选的登录对象，如果提供则不登录/登出

    Returns:
        KlineData列表
    """
    _log_with_thread('INFO', f"[baostock] 获取单只股票K线: {code}, {start_date} ~ {end_date}")

    # 如果没有提供登录对象，则临时登录（带重试）
    should_logout = lg is None
    if lg is None:
        lg = login_with_retry()
        if lg is None:
            raise Exception("baostock登录失败：网络连接问题或服务不可用")

    try:
        # 转换代码格式（baostock需要 sh./sz. 前缀）
        bs_code = _to_baostock_code(code)

        # 获取K线数据
        rs = bs.query_history_k_data_plus(
            bs_code,
            "date,code,open,high,low,close,volume,amount,preclose,turn,pctChg",
            start_date=start_date,
            end_date=end_date,
            frequency="d",
            adjustflag="3"  # 后复权
        )

        if rs.error_code != '0':
            raise Exception(f"baostock查询失败: {rs.error_msg}")

        # 转换为KlineData列表
        klines = []
        while (rs.error_code == '0') & rs.next():
            # 获取一条记录
            row = rs.get_row_data()
            try:
                klines.append(KlineData(
                    code=code,
                    trade_date=row[0],               # date
                    open=float(row[2]) if row[2] else 0.0,
                    high=float(row[3]) if row[3] else 0.0,
                    low=float(row[4]) if row[4] else 0.0,
                    close=float(row[5]) if row[5] else 0.0,
                    volume=int(float(row[6])) if row[6] else 0,
                    amount=float(row[7]) if row[7] else 0.0,
                    pre_close=float(row[8]) if len(row) > 8 and row[8] else 0.0,
                    turn_rate=float(row[9]) if len(row) > 9 and row[9] else 0.0,
                    pct_change=float(row[10]) if len(row) > 10 and row[10] else 0.0
                ))
            except (ValueError, IndexError) as e:
                _log_with_thread('WARNING', f"跳过异常数据行: {row}, error: {e}")
                continue

        _log_with_thread('INFO', f"[baostock] 获取成功: {len(klines)} 条记录")
        return klines

    finally:
        if should_logout:
            bs.logout()


def fetch_batch(
    codes: List[str],
    start_date: str,
    end_date: str,
    delay: float = 0.5
) -> Dict[str, List[KlineData]]:
    """
    批量获取股票K线数据（每次请求 login/logout，避开频率限制）

    基于测试结果：baostock 有频率限制，需要：
    - 每次请求都 login/logout
    - 添加延迟避开频率限制
    - 使用单线程串行获取

    Args:
        codes: 股票代码列表
        start_date: 开始日期 YYYY-MM-DD
        end_date: 结束日期 YYYY-MM-DD
        delay: 每次请求后的延迟时间（秒），默认0.5秒

    Returns:
        {code: List[KlineData]} 字典
    """
    import time

    logger.info(f"[baostock] 批量获取K线: {len(codes)} 只股票 (每次login/logout + {delay}秒延迟)")

    result = {}
    success_count = 0
    failed_count = 0

    for code in codes:
        try:
            # 每次请求都 login/logout（传入 lg=None 触发自动登录）
            klines = fetch_single(code, start_date, end_date, lg=None)
            if klines:
                result[code] = klines
                success_count += 1
            else:
                result[code] = []
                failed_count += 1

            # 进度报告
            if (success_count + failed_count) % 10 == 0:
                logger.info(f"[baostock] 进度: {success_count + failed_count}/{len(codes)}, "
                           f"成功: {success_count}, 失败: {failed_count}")

            # 添加延迟避开频率限制
            time.sleep(delay)

        except Exception as e:
            logger.error(f"[baostock] 获取 {code} 失败: {e}")
            result[code] = []
            failed_count += 1
            # 失败后也添加延迟
            time.sleep(delay)

    logger.info(f"[baostock] 批量获取完成: {success_count}/{len(codes)} 成功, {failed_count} 失败")
    return result


def fetch_market(
    start_date: str,
    end_date: str,
    market: str = 'all',
    delay: float = 0.5
) -> Dict[str, Any]:
    """
    获取全市场证券K线数据（每次请求 login/logout，避开频率限制）

    基于测试结果：baostock 有频率限制，需要：
    - 每次请求都 login/logout
    - 添加延迟避开频率限制
    - 使用单线程串行获取

    Args:
        start_date: 开始日期 YYYY-MM-DD
        end_date: 结束日期 YYYY-MM-DD
        market: 市场范围 'all'/'sh'/'sz'
        delay: 每次请求后的延迟时间（秒），默认0.5秒

    Returns:
        {
            'klines_dict': {baostock_code: [KlineData]},
            'stock_dict': {baostock_code: {'name': xxx, 'type': xxx}},
            'success_count': int,
            'failed_count': int,
            'total_count': int
        }
    """
    import time

    logger.info(f"[baostock] 获取全市场K线: market={market}, {start_date} ~ {end_date}")
    logger.info(f"[baostock] 使用方式: 每次请求 login/logout + {delay}秒延迟")

    # 先登录获取证券列表
    lg = login_with_retry()
    if lg is None:
        raise Exception("baostock登录失败：网络连接问题或服务不可用")

    try:
        # 获取证券列表（含类型信息）
        stock_dict = _get_stock_list(market, lg=lg)
        logger.info(f"[baostock] 获取到 {len(stock_dict)} 只证券")
        _save_log('INFO', f'开始获取 {len(stock_dict)} 只证券的K线数据 ({start_date} ~ {end_date})')

        # 获取交易日历，计算预期交易日数量
        trade_days, data_note = _get_trade_days(start_date, end_date, lg)
        expected_count = len(trade_days)
        _save_log('INFO', f'日期范围 {start_date} ~ {end_date}，共 {expected_count} 个交易日 ({data_note})')

    finally:
        # 获取列表后立即登出
        bs.logout()

    # 串行获取每只证券的K线数据（每次都 login/logout）
    klines_dict = {}
    success_count = 0
    failed_info = {}
    processed_count = 0

    for bs_code, info in stock_dict.items():
        try:
            # sh.000001 -> 000001
            clean_code = bs_code.replace('sh.', '').replace('sz.', '')
            stock_type = info['type']
            type_label = _get_type_label(stock_type)
            stock_name = info['name']

            # 每次请求都 login/logout（lg=None 触发自动登录）
            klines = fetch_single(clean_code, start_date, end_date, lg=None)
            count = len(klines)

            if count > 0:
                klines_dict[bs_code] = klines
                success_count += 1

                if count == expected_count:
                    log_msg = f"{type_label} {bs_code}-{stock_name} {start_date}~{end_date} 完整获取 {count}/{expected_count} 条记录"
                else:
                    log_msg = f"{type_label} {bs_code}-{stock_name} {start_date}~{end_date} 数据不完整 仅获取 {count}/{expected_count} 条记录"
                _save_log('INFO', log_msg)
            else:
                # 无数据（正常情况：指数、退市股票等）
                log_msg = f"{type_label} {bs_code}-{stock_name} {start_date}~{end_date} 未获取到数据"
                _save_log('INFO', log_msg)

            # 进度报告
            processed_count += 1
            if processed_count % 50 == 0:
                logger.info(f"[baostock] 进度: {processed_count}/{len(stock_dict)}, "
                           f"成功: {success_count}, 失败: {len(failed_info)}")
                _save_log('INFO', f"进度: {processed_count}/{len(stock_dict)}, 成功: {success_count}")

            # 添加延迟避开频率限制
            time.sleep(delay)

        except Exception as e:
            error_msg = str(e)
            failed_info[bs_code] = info
            reason = error_msg[:30] if error_msg else "未知错误"
            log_msg = f"{type_label} {bs_code}-{stock_name} {start_date}~{end_date} 获取失败 ({reason})"
            _save_log('ERROR', log_msg)
            # 失败后也添加延迟
            time.sleep(delay)

    # 最终统计报告
    _save_log('INFO', f"{'='*50}")
    _save_log('INFO', f"[最终报告] 总计: {len(stock_dict)} 只证券")
    _save_log('INFO', f"  ✅ 成功获取: {success_count} 只")
    _save_log('INFO', f"  ❌ 异常失败: {len(failed_info)} 只")
    _save_log('INFO', f"  📊 获取K线总数: {sum(len(klines) for klines in klines_dict.values())} 条")

    if failed_info:
        _save_log('INFO', f"[异常列表] 获取失败的证券 ({len(failed_info)} 只):")
        for bs_code, info in sorted(failed_info.items(), key=lambda x: x[1]['type']):
            type_label = _get_type_label(info['type'])
            _save_log('INFO', f"  - {bs_code} {info['name']} ({type_label})")
        failed_codes_str = ",".join([f"{bs_code}:{info['name']}" for bs_code, info in failed_info.items()])
        _save_log('ERROR', f'K线获取完成，{len(failed_info)} 只证券异常失败: {failed_codes_str}')
    else:
        _save_log('INFO', f'K线获取完成: 成功 {success_count} 只证券')

    return {
        'klines_dict': klines_dict,
        'stock_dict': stock_dict,
        'success_count': success_count,
        'failed_count': len(failed_info),
        'total_count': len(stock_dict),
        'total_klines': sum(len(klines) for klines in klines_dict.values())
    }


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
        code: 股票代码（baostock格式，如 sh.000001）
        stock_name: 股票名称（可选）
        security_type: 证券类型（可选）: 1=股票, 2=指数, 5=ETF
        upsert: 是否覆盖更新（true=存在则更新，false=只插入新数据）

    Returns:
        {'savedCount': 新增数量, 'updatedCount': 更新数量, 'totalCount': 总数量}
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
            type_label = _get_type_label(security_type)
            _save_log('ERROR', f"{type_label} {code}-{stock_name if stock_name else '未知'} 保存失败: API返回None")
            return {'savedCount': 0, 'updatedCount': 0, 'totalCount': 0}

    except Exception as e:
        type_label = _get_type_label(security_type)
        _save_log('ERROR', f"{type_label} {code}-{stock_name if stock_name else '未知'} 保存失败: {e}")
        return {'savedCount': 0, 'updatedCount': 0, 'totalCount': 0}


def save_klines_batch(
    klines_dict: Dict[str, List[KlineData]],
    stock_dict: Dict[str, Dict[str, str]],
    upsert: bool = False,
    progress_callback = None
) -> Dict[str, Any]:
    """
    批量保存K线数据到Java后端

    Args:
        klines_dict: {baostock_code: KlineData列表}
        stock_dict: {baostock_code: {'name': xxx, 'type': xxx}}
        upsert: 是否覆盖更新
        progress_callback: 进度回调函数(current, total)

    Returns:
        {'total_stocks': 总数, 'saved_stocks': 新增股票数, 'updated_stocks': 更新股票数,
         'total_klines': 总K线数, 'saved_klines': 新增K线数, 'updated_klines': 更新K线数}
    """
    total_stocks = len(klines_dict)
    total_klines = sum(len(klines) for klines in klines_dict.values())
    saved_stocks = 0
    updated_stocks = 0
    saved_klines = 0
    updated_klines = 0

    _save_log('INFO', f"========== 开始保存阶段 ==========")
    _save_log('INFO', f"需要保存: {total_stocks} 只证券, 共 {total_klines} 条K线")
    _save_log('INFO', f"保存模式: {'覆盖更新' if upsert else '仅新增'}")

    for idx, (bs_code, klines) in enumerate(klines_dict.items()):
        if progress_callback:
            progress_callback(idx + 1, total_stocks)

        if not klines:
            continue

        stock_info = stock_dict.get(bs_code, {})
        stock_name = stock_info.get('name', '')
        stock_type = stock_info.get('type', '')
        type_label = _get_type_label(stock_type)

        result = save_to_java(klines, bs_code, stock_name, stock_type, upsert)
        saved_count = result.get('savedCount', 0)
        updated_count = result.get('updatedCount', 0)
        total_count = result.get('totalCount', 0)

        if total_count > 0:
            if saved_count > 0:
                saved_stocks += 1
                saved_klines += saved_count
            if updated_count > 0:
                updated_stocks += 1
                updated_klines += updated_count

            # 每100只股票报告一次进度
            if (idx + 1) % 100 == 0:
                _save_log('INFO', f"保存进度: {idx + 1}/{total_stocks} ({(idx + 1) * 100 // total_stocks}%)")

    _save_log('INFO', f"========== 保存完成 ==========")
    _save_log('INFO', f"处理证券: {total_stocks} 只")
    _save_log('INFO', f"  - 新增数据: {saved_stocks} 只证券, {saved_klines} 条K线")
    _save_log('INFO', f"  - 更新数据: {updated_stocks} 只证券, {updated_klines} 条K线")
    _save_log('INFO', f"  - 跳过数据: {total_stocks - saved_stocks - updated_stocks} 只证券")

    return {
        'total_stocks': total_stocks,
        'saved_stocks': saved_stocks,
        'updated_stocks': updated_stocks,
        'total_klines': total_klines,
        'saved_klines': saved_klines,
        'updated_klines': updated_klines
    }


# =============================================================================
# 辅助函数
# =============================================================================

def _to_baostock_code(code: str) -> str:
    """转换为baostock代码格式（添加 sh./sz. 前缀）"""
    if code.startswith('6'):
        return f"sh.{code}"
    else:
        return f"sz.{code}"


def _get_trade_days(start_date: str, end_date: str, lg) -> tuple[List[str], str]:
    """
    获取日期范围内的交易日列表
    根据当前时间判断是否包含今天的数据

    Args:
        start_date: 开始日期 YYYY-MM-DD
        end_date: 结束日期 YYYY-MM-DD
        lg: 登录对象

    Returns:
        (交易日列表, 数据说明)
    """
    from datetime import datetime, timezone, timedelta

    # 获取北京时间 (UTC+8)
    beijing_tz = timezone(timedelta(hours=8))
    now = datetime.now(beijing_tz)
    today = now.date()
    current_time = now.strftime('%H:%M')
    today_str = str(today)

    rs = bs.query_trade_dates(start_date=start_date, end_date=end_date)
    trade_days = []

    if rs.error_code == '0':
        while (rs.error_code == '0') & rs.next():
            row = rs.get_row_data()
            trade_date = row[0]
            is_trading = row[1]  # 1:交易日, 0:非交易日

            if is_trading == '1':
                # 判断是否应该包含今天的数据
                if trade_date == today_str:
                    # BaoStock 17:30 完成数据入库，18:00 后可查询
                    hour = now.hour
                    if hour >= 18:
                        # 18:00 后，应该有今天的数据
                        trade_days.append(trade_date)
                    else:
                        # 18:00 前，今天的数据还未更新，不包含
                        pass
                else:
                    # 历史日期，正常包含
                    trade_days.append(trade_date)

    # 生成数据说明
    total_trade_days = len([d for d in trade_days])
    if today_str >= start_date and today_str <= end_date:
        if now.hour >= 18:
            note = f"包含今日({today_str})数据"
        else:
            note = f"不包含今日({today_str})数据（{current_time}，预计18:00后更新）"
    else:
        note = "历史数据"

    return trade_days, note


def _get_type_label(stock_type: str) -> str:
    """获取类型标签"""
    type_map = {
        '1': '股票',
        '2': '指数',
        '5': 'ETF'
    }
    return type_map.get(stock_type, '未知')


def _get_stock_list(market: str = 'all', lg=None) -> Dict[str, Dict[str, str]]:
    """
    获取baostock证券列表（股票、指数、ETF）

    Args:
        market: 市场范围 'all'/'sh'/'sz'
        lg: 可选的登录对象，如果提供则不登录/登出

    Returns:
        Dict[sh.000001, Dict[code, name, type]]
    """
    # 如果没有提供登录对象，则临时登录（带重试）
    should_logout = lg is None
    if lg is None:
        lg = login_with_retry()
        if lg is None:
            raise Exception("baostock登录失败：网络连接问题或服务不可用")

    try:
        # 获取证券列表
        rs = bs.query_stock_basic()

        if rs.error_code != '0':
            logger.error(f"baostock query_stock_basic error_code={rs.error_code}, error_msg={rs.error_msg}")
            raise Exception(f"获取证券列表失败: {rs.error_msg}")

        logger.info(f"baostock query_stock_basic 开始遍历数据")

        # 过滤：获取股票(type='1')、指数(type='2')、ETF(type='5')，排除已退市
        # 按类型排序：指数(2) -> 股票(1) -> ETF(5)
        type_order = {'2': 0, '1': 1, '5': 2}
        stock_list = []
        total_count = 0
        filtered_type = 0
        filtered_out_date = 0

        while (rs.error_code == '0') & rs.next():
            total_count += 1
            row = rs.get_row_data()
            code = row[0]  # 带前缀的代码，如 sh.600000
            code_name = row[1]  # 证券名称
            ipo_date = row[2]  # 上市日期
            out_date = row[3]  # 退市日期
            stock_type = row[4]  # type字段：1=股票，2=指数，4=转债，5=ETF
            status = row[5]  # 状态

            # 只获取股票、指数、ETF
            if stock_type not in ['1', '2', '5']:
                filtered_type += 1
                continue

            # 跳过已退市的证券（outDate 有值）
            if out_date:
                filtered_out_date += 1
                continue

            if market == 'all':
                stock_list.append((code, code_name, stock_type))
            elif market == 'sh' and code.startswith('sh.'):
                stock_list.append((code, code_name, stock_type))
            elif market == 'sz' and code.startswith('sz.'):
                stock_list.append((code, code_name, stock_type))

        # 按类型排序：指数(2) -> 股票(1) -> ETF(5)
        stock_list.sort(key=lambda x: type_order.get(x[2], 99))

        logger.info(f"baostock 证券列表统计: 总计{total_count}条, 过滤类型{filtered_type}条, 过滤退市{filtered_out_date}条, 最终{len(stock_list)}条")

        # 返回字典格式，使用 sh.000001 作为key
        return {
            code: {'code': code, 'name': name, 'type': stock_type}
            for code, name, stock_type in stock_list
        }

    finally:
        if should_logout:
            bs.logout()


