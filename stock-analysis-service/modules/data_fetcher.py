"""
股票数据获取模块
Stock Data Fetcher Module

主数据源：Baostock（稳定、官方数据）
辅助数据源：AkShare（实时数据、补充）
"""

import os
import json
import time
from datetime import datetime, timedelta
from typing import Optional, Dict
import baostock as bs
import akshare as ak
import pandas as pd


# =============================================================================
# 缓存装饰器 / Cache Decorator
# =============================================================================

# 注意：Streamlit的缓存装饰器需要在Streamlit应用中使用
# 这里提供一个简单的内存缓存作为备选方案
_simple_cache = {}
_cache_timestamps = {}

# 不同类型数据的缓存时间
CACHE_TTL = {
    'stock_data': 3600,        # 历史数据：1小时
    'realtime': 60,           # 实时数据：1分钟
    'technical': 3600,        # 技术指标：1小时
    'financial': 86400,       # 财务数据：1天（财务数据更新慢）
    'dashboard': 3600,        # 数据看板：1小时
}


def is_cache_valid(cache_key: str, cache_type: str = 'stock_data') -> bool:
    """检查缓存是否有效

    Args:
        cache_key: 缓存键
        cache_type: 缓存类型（决定TTL）
    """
    if cache_key not in _cache_timestamps:
        return False
    ttl = CACHE_TTL.get(cache_type, 3600)
    return (time.time() - _cache_timestamps[cache_key]) < ttl


def get_cached_data(cache_key: str, cache_type: str = 'stock_data'):
    """获取缓存数据

    Args:
        cache_key: 缓存键
        cache_type: 缓存类型（决定TTL）
    """
    if is_cache_valid(cache_key, cache_type):
        return _simple_cache.get(cache_key)
    return None


def set_cached_data(cache_key: str, data, cache_type: str = 'stock_data'):
    """设置缓存数据

    Args:
        cache_key: 缓存键
        data: 要缓存的数据
        cache_type: 缓存类型（决定TTL）
    """
    _simple_cache[cache_key] = data
    _cache_timestamps[cache_key] = time.time()


# =============================================================================
# 配置加载 / Configuration Loading
# =============================================================================

def load_config() -> dict:
    """
    加载股票配置文件

    Returns:
        配置字典
    """
    config_path = os.path.join(os.path.dirname(__file__), '..', 'config', 'stock_list.json')
    if os.path.exists(config_path):
        with open(config_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {"stocks": [], "watchlist": []}


# =============================================================================
# 数据获取 / Data Fetching
# =============================================================================

def fetch_stock_data(stock_code: str, start_date: str, end_date: str) -> pd.DataFrame:
    """
    获取股票历史数据（使用 Baostock 作为主数据源）

    优先使用 Baostock，如果失败则降级到 AkShare

    Args:
        stock_code: 股票代码（如 '601857'）
        start_date: 开始日期（格式：'YYYY-MM-DD'）
        end_date: 结束日期（格式：'YYYY-MM-DD'）

    Returns:
        包含股票数据的DataFrame

    Raises:
        ValueError: 当数据获取失败时
    """
    import time
    total_start = time.time()

    # 检查缓存
    cache_key = f"{stock_code}_{start_date}_{end_date}"
    cached_data = get_cached_data(cache_key, 'stock_data')
    if cached_data is not None:
        print(f"✓ 使用缓存历史数据: {cache_key}")
        return cached_data

    # 优先使用 Baostock
    try:
        start_time = time.time()
        df = _fetch_from_baostock(stock_code, start_date, end_date)
        elapsed = time.time() - start_time
        print(f"  ⏱️ Baostock 耗时: {elapsed:.2f}秒")

        if df is not None and not df.empty:
            set_cached_data(cache_key, df, 'stock_data')
            total_elapsed = time.time() - total_start
            print(f"  ⏱️ 总耗时: {total_elapsed:.2f}秒")
            return df
    except Exception as e:
        print(f"⚠️ Baostock 获取失败: {str(e)}，尝试使用 AkShare...")

    # 降级到 AkShare
    try:
        start_time = time.time()
        df = _fetch_from_akshare(stock_code, start_date, end_date)
        elapsed = time.time() - start_time
        print(f"  ⏱️ AkShare 耗时: {elapsed:.2f}秒")

        if df is not None and not df.empty:
            set_cached_data(cache_key, df, 'stock_data')
            total_elapsed = time.time() - total_start
            print(f"  ⏱️ 总耗时: {total_elapsed:.2f}秒")
            return df
    except Exception as e:
        print(f"⚠️ AkShare 获取失败: {str(e)}")

    raise ValueError(f"所有数据源均失败，无法获取股票 {stock_code} 的数据")


def _fetch_from_baostock(stock_code: str, start_date: str, end_date: str) -> Optional[pd.DataFrame]:
    """
    使用 Baostock 获取历史数据（主数据源）

    Args:
        stock_code: 股票代码（如 '601857'）
        start_date: 开始日期（格式：'YYYY-MM-DD'）
        end_date: 结束日期（格式：'YYYY-MM-DD'）

    Returns:
        包含股票数据的DataFrame，失败返回 None
    """
    print(f"🔄 [Baostock] 正在获取股票 {stock_code} 的数据...")

    # 登录 Baostock
    lg = bs.login()
    if lg.error_code != '0':
        raise Exception(f"Baostock 登录失败: {lg.error_msg}")

    # 判断市场类型并转换代码
    if stock_code.startswith('6'):
        bs_code = f"sh.{stock_code}"
    else:
        bs_code = f"sz.{stock_code}"

    # 获取历史K线数据（添加股票名称）
    rs = bs.query_history_k_data_plus(
        bs_code,
        "date,code,open,high,low,close,volume,amount",
        start_date=start_date,
        end_date=end_date,
        frequency="d",
        adjustflag="3"  # 3：后复权
    )

    # ===== 保存原始响应数据 =====
    os.makedirs(f"data/{stock_code}", exist_ok=True)
    if rs.error_code == '0' and rs.data:
        # 保存原始数据（未处理的）
        raw_df = pd.DataFrame(rs.data, columns=rs.fields)
        raw_df.to_csv(f"data/{stock_code}/baostock_raw.csv", index=False, encoding='utf-8')
        print(f"  💾 已保存原始Baostock数据")

    # 获取股票名称
    stock_info = bs.query_stock_basic(code=bs_code)
    stock_name = "未知股票"
    try:
        if stock_info.error_code == '0':
            # 安全处理：检查 data 是否为 DataFrame
            if hasattr(stock_info.data, 'empty') and not stock_info.data.empty:
                stock_name = stock_info.data.iloc[0]['stock_name']
            # 如果 data 是 list，转换为 DataFrame
            elif isinstance(stock_info.data, list) and len(stock_info.data) > 0:
                stock_name_df = pd.DataFrame(stock_info.data, columns=stock_info.fields)
                if not stock_name_df.empty and 'stock_name' in stock_name_df.columns:
                    stock_name = stock_name_df.iloc[0]['stock_name']
    except Exception as e:
        print(f"  ⚠️ 获取股票名称失败: {str(e)}")
        stock_name = "未知股票"

    # 登出
    bs.logout()

    if rs.error_code != '0':
        raise Exception(f"Baostock 查询失败: {rs.error_msg}")

    # 转换为 DataFrame
    df = pd.DataFrame(rs.data, columns=rs.fields)

    if df.empty:
        return None

    # 数据类型清理
    numeric_columns = ['open', 'high', 'low', 'close', 'volume', 'amount']
    for col in numeric_columns:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')

    # 重命名列
    df = df.rename(columns={
        'date': 'date',
        'open': 'open',
        'high': 'high',
        'low': 'low',
        'close': 'close',
        'volume': 'volume',
        'amount': 'amount'
    })

    # 转换日期格式
    df['date'] = pd.to_datetime(df['date'], format='%Y-%m-%d')
    df.set_index('date', inplace=True)

    # 数据清洗
    df = df.dropna()

    # 添加股票名称列（所有行都用相同的名称）
    df['名称'] = stock_name

    print(f"✓ [Baostock] 数据获取成功，共 {len(df)} 条记录")
    return df


def _fetch_from_akshare(stock_code: str, start_date: str, end_date: str) -> Optional[pd.DataFrame]:
    """
    使用 AkShare 获取历史数据（备用数据源）

    Args:
        stock_code: 股票代码（如 '601857'）
        start_date: 开始日期（格式：'YYYY-MM-DD'）
        end_date: 结束日期（格式：'YYYY-MM-DD'）

    Returns:
        包含股票数据的DataFrame，失败返回 None
    """
    print(f"🔄 [AkShare] 正在获取股票 {stock_code} 的数据...")

    # 使用 AkShare 获取 A 股历史行情数据
    df = ak.stock_zh_a_hist(
        symbol=stock_code,
        period="daily",
        start_date=start_date.replace('-', ''),
        end_date=end_date.replace('-', ''),
        adjust="qfq"  # 前复权
    )

    if df.empty:
        return None

    # ===== 保存原始响应数据（未处理的AkShare返回）=====
    os.makedirs(f"data/{stock_code}", exist_ok=True)
    df.to_csv(f"data/{stock_code}/akshare_raw.csv", index=False, encoding='utf-8')
    print(f"  💾 已保存原始AkShare数据")

    # 数据类型清理：确保数值列是正确的类型
    numeric_columns = ['open', 'close', 'high', 'low', 'volume', 'amount',
                      'amplitude', 'change_percent', 'change_amount', 'turnover']

    for col in df.columns:
        if col in numeric_columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')

    # 重命名列以保持一致性
    df = df.rename(columns={
        '日期': 'date',
        '开盘': 'open',
        '收盘': 'close',
        '最高': 'high',
        '最低': 'low',
        '成交量': 'volume',
        '成交额': 'amount',
        '振幅': 'amplitude',
        '涨跌幅': 'change_percent',
        '涨跌额': 'change_amount',
        '换手率': 'turnover'
    })

    # 选择需要的列
    columns_to_keep = ['date', 'open', 'high', 'low', 'close', 'volume',
                      'amount', 'amplitude', 'change_percent', 'change_amount', 'turnover']
    df = df[[col for col in columns_to_keep if col in df.columns]]

    # 转换日期格式
    df['date'] = pd.to_datetime(df['date'], format='%Y-%m-%d')
    df.set_index('date', inplace=True)

    # 数据清洗
    df = df.dropna()

    print(f"✓ [AkShare] 数据获取成功，共 {len(df)} 条记录")
    return df


def fetch_realtime_data(stock_code: str, progress_callback=None) -> Dict:
    """
    获取股票实时数据（只获取指定股票）

    Args:
        stock_code: 股票代码
        progress_callback: 进度回调函数，接收(current, total)参数

    Returns:
        包含实时数据的字典
    """
    import time
    start_time = time.time()

    # 实时数据缓存（使用新的缓存系统）
    cache_key = f"realtime_{stock_code}"
    cached_data = get_cached_data(cache_key, 'realtime')
    if cached_data is not None:
        print(f"✓ 使用缓存实时数据: {stock_code}")
        return cached_data

    try:
        print(f"🔄 正在获取 {stock_code} 的实时数据...")

        # 调用进度回调 - 开始下载
        if progress_callback:
            progress_callback(0, "连接数据源...")

        # 方案1：快速组合方案（并行调用多个API）
        download_start = time.time()

        import concurrent.futures

        # 准备参数
        today = datetime.now().strftime('%Y%m%d')
        start_date = (datetime.now() - timedelta(days=5)).strftime('%Y%m%d')

        # 并行调用3个API
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
            # 任务1: 分钟数据（获取实时价格）
            future_min = executor.submit(
                ak.stock_zh_a_hist_min_em,
                symbol=stock_code,
                period='1',
                adjust=''
            )

            # 任务2: 日K线（获取昨收价）
            future_daily = executor.submit(
                ak.stock_zh_a_hist,
                symbol=stock_code,
                period='daily',
                start_date=start_date,
                end_date=today,
                adjust=''
            )

            # 任务3: 基本信息（股票名称、股本）
            future_info = executor.submit(
                ak.stock_individual_info_em,
                symbol=stock_code
            )

            # 获取结果
            df_min = future_min.result()
            df_daily = future_daily.result()
            df_info = future_info.result()

        download_elapsed = time.time() - download_start
        print(f"  ⏱️ 下载实时数据耗时: {download_elapsed:.2f}秒（并行执行）")

        # 验证数据
        if df_min.empty or len(df_min) == 0:
            print(f"  ⚠️ 未获取到分钟级行情数据")
            return {}

        # 1. 从分钟数据获取最新价格
        latest_min = df_min.iloc[-1]
        current_price = float(latest_min['收盘'])

        # 2. 从日K线获取昨收价
        if len(df_daily) >= 2:
            pre_close = float(df_daily.iloc[-2]['收盘'])
        elif len(df_daily) == 1:
            pre_close = float(df_daily.iloc[0]['开盘'])
        else:
            pre_close = current_price  # 兜底

        # 3. 计算涨跌幅和涨跌额
        change = ((current_price - pre_close) / pre_close) * 100
        change_amount = current_price - pre_close

        # 4. 从分钟数据提取今日数据
        today_str = datetime.now().strftime('%Y-%m-%d')
        today_data = df_min[df_min['时间'].str.startswith(today_str)]

        if not today_data.empty:
            today_high = float(today_data['最高'].max())
            today_low = float(today_data['最低'].min())
            today_open = float(today_data.iloc[0]['开盘'])
            today_volume = float(today_data['成交量'].sum())
            today_amount = float(today_data['成交额'].sum())
        else:
            today_high = float(latest_min['最高'])
            today_low = float(latest_min['最低'])
            today_open = float(latest_min['开盘'])
            today_volume = float(latest_min['成交量'])
            today_amount = float(latest_min['成交额'])

        # 5. 从基本信息获取股票名称和股本
        stock_name = ''
        total_cap = 0
        circulating_cap = 0

        if not df_info.empty and 'item' in df_info.columns:
            info_dict = dict(zip(df_info['item'], df_info['value']))
            stock_name = info_dict.get('股票简称', '')
            # 计算市值
            shares = info_dict.get('总股本', 0)
            if shares and current_price:
                total_cap = float(shares) * current_price

        # ===== 保存原始实时数据 =====
        os.makedirs(f"data/{stock_code}", exist_ok=True)

        # 构造保存的数据框
        save_df = pd.DataFrame([{
            '代码': stock_code,
            '名称': stock_name,
            '最新价': current_price,
            '涨跌幅': f'{change:.2f}%',
            '涨跌额': f'{change_amount:.2f}',
            '开盘': today_open,
            '昨收': pre_close,
            '最高': today_high,
            '最低': today_low,
            '成交量': today_volume,
            '成交额': today_amount,
            '时间': latest_min['时间']
        }])
        save_df.to_csv(f"data/{stock_code}/realtime_raw.csv", index=False, encoding='utf-8')
        print(f"  💾 已保存原始实时行情数据")

        # 调用进度回调 - 数据下载完成
        if progress_callback:
            progress_callback(90, "解析数据...")

        result = {
            'code': stock_code,
            'name': stock_name,
            'price': current_price,
            'change': change,  # 百分比
            'change_amount': change_amount,  # 绝对值
            'volume': today_volume,
            'amount': today_amount,
            'high': today_high,
            'low': today_low,
            'open': today_open,
            'pre_close': pre_close,
            'turnover': 0,  # 快速方案暂不提供换手率
            'pe_ttm': 0,  # 快速方案暂不提供市盈率
            'pb': 0,  # 快速方案暂不提供市净率
            'total_cap': total_cap,
            'circulating_cap': circulating_cap
        }

        # 缓存数据（使用新的缓存系统，60秒TTL）
        set_cached_data(cache_key, result, 'realtime')

        # 调用进度回调 - 完成
        if progress_callback:
            progress_callback(100, "完成")

        total_elapsed = time.time() - start_time
        print(f"  ⏱️ 总耗时: {total_elapsed:.2f}秒")
        print(f"✓ 实时数据获取成功")
        return result

    except Exception as e:
        print(f"✗ 获取实时数据失败 Failed to fetch realtime data: {e}")
        return {}


# =============================================================================
# 数据保存和加载 / Data Saving and Loading
# =============================================================================

def save_data(df: pd.DataFrame, stock_code: str, data_type: str = 'raw') -> str:
    """
    保存数据到文件

    Args:
        df: 要保存的DataFrame
        stock_code: 股票代码
        data_type: 数据类型 ('raw' 或 'processed')

    Returns:
        保存的文件路径
    """
    if data_type == 'raw':
        save_dir = os.path.join(os.path.dirname(__file__), '..', 'data', 'raw')
    else:
        save_dir = os.path.join(os.path.dirname(__file__), '..', 'data', 'processed')

    os.makedirs(save_dir, exist_ok=True)

    filename = f"{stock_code}_{data_type}.csv"
    filepath = os.path.join(save_dir, filename)
    df.to_csv(filepath, encoding='utf-8-sig')

    print(f"✓ 数据已保存至: {filepath}")
    return filepath


def load_data(stock_code: str, data_type: str = 'raw') -> Optional[pd.DataFrame]:
    """
    从文件加载数据

    Args:
        stock_code: 股票代码
        data_type: 数据类型 ('raw' 或 'processed')

    Returns:
        DataFrame或None
    """
    if data_type == 'raw':
        load_dir = os.path.join(os.path.dirname(__file__), '..', 'data', 'raw')
    else:
        load_dir = os.path.join(os.path.dirname(__file__), '..', 'data', 'processed')

    filename = f"{stock_code}_{data_type}.csv"
    filepath = os.path.join(load_dir, filename)

    if not os.path.exists(filepath):
        print(f"✗ 文件不存在: {filepath}")
        return None

    try:
        df = pd.read_csv(filepath, index_col='date', parse_dates=True, encoding='utf-8-sig')
        print(f"✓ 数据已加载: {filepath}")
        return df
    except Exception as e:
        print(f"✗ 加载数据失败: {e}")
        return None


# =============================================================================
# 主函数 / Main Function
# =============================================================================

def main():
    """主函数 - 测试数据获取"""
    # 加载配置
    config = load_config()

    # 获取第一只股票
    if not config.get('stocks'):
        print("配置文件中没有股票列表 / No stocks in config")
        return

    stock = config['stocks'][0]
    stock_code = stock['code']

    # 计算日期范围（近5年）
    end_date = datetime.now()
    start_date = end_date - timedelta(days=5*365)

    print(f"{'='*60}")
    print(f"股票数据获取测试 / Stock Data Fetcher Test")
    print(f"{'='*60}")
    print(f"\n正在获取股票 {stock_code} ({stock['name']}) 的数据...")
    print(f"Fetching data for {stock['name']} ({stock_code})...")
    print(f"时间范围 / Date Range: {start_date.strftime('%Y-%m-%d')} 至 {end_date.strftime('%Y-%m-%d')}")

    try:
        # 获取数据
        df = fetch_stock_data(
            stock_code=stock_code,
            start_date=start_date.strftime('%Y-%m-%d'),
            end_date=end_date.strftime('%Y-%m-%d')
        )

        print(f"\n获取成功！数据共 {len(df)} 条记录")
        print(f"Success! Total records: {len(df)}")
        print("\n数据预览 / Data Preview:")
        print(df.head())

        # 保存数据
        filepath = save_data(df, stock_code, 'raw')

        # 获取实时数据
        print("\n获取实时数据...")
        print("Fetching realtime data...")
        realtime = fetch_realtime_data(stock_code)
        if realtime:
            print(f"股票名称 / Stock Name: {realtime.get('name', 'N/A')}")
            print(f"当前价格 / Current Price: {realtime.get('price', 'N/A'):.2f} 元")
            print(f"涨跌幅 / Change: {realtime.get('change', 'N/A'):+.2f}%")

    except Exception as e:
        print(f"\n错误 / Error: {e}")


if __name__ == '__main__':
    main()
