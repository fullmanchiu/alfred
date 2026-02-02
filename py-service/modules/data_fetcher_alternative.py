"""
数据获取模块 - 备用方案
提供3种实时数据获取方案供选择
"""

import os
import time
from datetime import datetime, timedelta
from typing import Optional, Dict
import akshare as ak
import pandas as pd


# =============================================================================
# 方案2: 混合缓存方案
# 首次30秒获取完整数据，后续<1秒从缓存读取
# =============================================================================

# 全局缓存（简单实现）
_market_data_cache = {
    'data': None,
    'timestamp': None,
    'ttl': 60  # 60秒TTL
}

def fetch_realtime_data_scheme2_cache(
    stock_code: str,
    progress_callback=None
) -> Dict:
    """
    方案2: 混合缓存方案

    策略:
    - 首次查询: 使用分市场API（30秒），缓存60秒
    - 后续查询: 直接从缓存读取（<1秒）

    优点:
    - 首次慢，后续快
    - 数据完整（含换手率、市盈率等）

    缺点:
    - 首次查询较慢
    - 缓存数据可能过期
    """
    global _market_data_cache

    cache_key = f"{stock_code}"
    current_time = time.time()

    start_time = time.time()
    print(f"🔄 正在获取 {stock_code} 的实时数据（方案2: 混合缓存）...")

    # 检查缓存
    if (_market_data_cache['data'] is not None and
        _market_data_cache['timestamp'] is not None and
        current_time - _market_data_cache['timestamp'] < _market_data_cache['ttl']):

        # 从缓存读取
        print(f"  📦 从缓存读取数据")
        cached_data = _market_data_cache['data']
        stock_data = cached_data.get(stock_code)

        if stock_data:
            elapsed = time.time() - start_time
            print(f"  ⏱️ 总耗时: {elapsed:.2f}秒（缓存命中）")
            return stock_data
        else:
            print(f"  ⚠️ 缓存中未找到该股票，重新获取...")

    # 缓存未命中或过期，重新获取
    print(f"  🔄 缓存未命中，重新获取分市场数据...")

    try:
        # 确定市场
        if stock_code.startswith('60'):
            df_all = ak.stock_sh_a_spot_em()
            market = '上海'
        else:
            df_all = ak.stock_sz_a_spot_em()
            market = '深圳'

        download_elapsed = time.time() - start_time
        print(f"  ⏱️ 下载{market}市场数据耗时: {download_elapsed:.2f}秒")

        if df_all.empty:
            print(f"  ⚠️ 未获取到市场数据")
            return {}

        # 筛选目标股票
        df_stock = df_all[df_all['代码'] == stock_code]

        if df_stock.empty:
            print(f"  ⚠️ 未找到股票 {stock_code}")
            return {}

        stock_data_row = df_stock.iloc[0]

        # 保存到文件
        os.makedirs(f"data/{stock_code}", exist_ok=True)
        df_stock.to_csv(f"data/{stock_code}/realtime_raw.csv",
                       index=False, encoding='utf-8')
        print(f"  💾 已保存原始实时行情数据")

        # 构造结果
        result = {
            'code': stock_code,
            'name': stock_data_row.get('名称', ''),
            'price': stock_data_row.get('最新价', 0),
            'change': stock_data_row.get('涨跌幅', 0),
            'change_amount': stock_data_row.get('涨跌额', 0),
            'volume': stock_data_row.get('成交量', 0),
            'amount': stock_data_row.get('成交额', 0),
            'high': stock_data_row.get('最高', 0),
            'low': stock_data_row.get('最低', 0),
            'open': stock_data_row.get('今开', 0),
            'pre_close': stock_data_row.get('昨收', 0),
            'turnover': stock_data_row.get('换手率', 0),
            'pe_ttm': stock_data_row.get('市盈率-动态', 0),
            'pb': stock_data_row.get('市净率', 0),
            'total_cap': stock_data_row.get('总市值', 0),
            'circulating_cap': stock_data_row.get('流通市值', 0)
        }

        # 更新缓存（保存整个市场数据）
        _market_data_cache['data'] = dict(zip(
            df_all['代码'],
            [df_all.iloc[i] for i in range(len(df_all))]
        ))
        _market_data_cache['timestamp'] = time.time()

        total_elapsed = time.time() - start_time
        print(f"  ⏱️ 总耗时: {total_elapsed:.2f}秒（已缓存）")
        print(f"✓ 实时数据获取成功")

        return result

    except Exception as e:
        print(f"✗ 获取实时数据失败: {e}")
        return {}


# =============================================================================
# 方案3: 完整分市场方案
# 每次都下载分市场数据（30秒），数据最完整
# =============================================================================

def fetch_realtime_data_scheme3_full(
    stock_code: str,
    progress_callback=None
) -> Dict:
    """
    方案3: 完整分市场方案

    策略:
    - 每次都下载分市场数据
    - 不使用缓存，数据最实时

    优点:
    - 数据最完整（所有字段）
    - 数据最实时（每次都最新）

    缺点:
    - 速度较慢（30秒）
    - 每次都下载全市场数据
    """
    start_time = time.time()
    print(f"🔄 正在获取 {stock_code} 的实时数据（方案3: 完整分市场）...")

    try:
        # 确定市场
        if stock_code.startswith('60'):
            df_all = ak.stock_sh_a_spot_em()
            market = '上海'
        else:
            df_all = ak.stock_sz_a_spot_em()
            market = '深圳'

        download_elapsed = time.time() - start_time
        print(f"  ⏱️ 下载{market}市场数据耗时: {download_elapsed:.2f}秒")

        if df_all.empty or len(df_all) == 0:
            print(f"  ⚠️ 未获取到市场数据")
            return {}

        # 筛选目标股票
        df_stock = df_all[df_all['代码'] == stock_code]

        if df_stock.empty:
            print(f"  ⚠️ 未找到股票 {stock_code}")
            return {}

        stock_data_row = df_stock.iloc[0]

        # 保存到文件
        os.makedirs(f"data/{stock_code}", exist_ok=True)
        df_stock.to_csv(f"data/{stock_code}/realtime_raw.csv",
                       index=False, encoding='utf-8')
        print(f"  💾 已保存原始实时行情数据")

        # 调用进度回调
        if progress_callback:
            progress_callback(90, "解析数据...")

        # 构造结果（完整字段）
        result = {
            'code': stock_code,
            'name': stock_data_row.get('名称', ''),
            'price': stock_data_row.get('最新价', 0),
            'change': stock_data_row.get('涨跌幅', 0),
            'change_amount': stock_data_row.get('涨跌额', 0),
            'volume': stock_data_row.get('成交量', 0),
            'amount': stock_data_row.get('成交额', 0),
            'high': stock_data_row.get('最高', 0),
            'low': stock_data_row.get('最低', 0),
            'open': stock_data_row.get('今开', 0),
            'pre_close': stock_data_row.get('昨收', 0),
            'turnover': stock_data_row.get('换手率', 0),
            'pe_ttm': stock_data_row.get('市盈率-动态', 0),
            'pb': stock_data_row.get('市净率', 0),
            'total_cap': stock_data_row.get('总市值', 0),
            'circulating_cap': stock_data_row.get('流通市值', 0)
        }

        total_elapsed = time.time() - start_time
        print(f"  ⏱️ 总耗时: {total_elapsed:.2f}秒")
        print(f"✓ 实时数据获取成功")

        return result

    except Exception as e:
        print(f"✗ 获取实时数据失败: {e}")
        return {}


# =============================================================================
# 方案选择器
# =============================================================================

def fetch_realtime_data_with_scheme(
    stock_code: str,
    scheme: int = 1,
    progress_callback=None
) -> Dict:
    """
    根据选择的方案获取实时数据

    Args:
        stock_code: 股票代码
        scheme: 方案编号 (1=快速组合, 2=混合缓存, 3=完整分市场)
        progress_callback: 进度回调函数

    Returns:
        实时数据字典
    """
    if scheme == 1:
        # 方案1: 快速组合（已在 data_fetcher.py 中实现）
        from modules.data_fetcher import fetch_realtime_data
        return fetch_realtime_data(stock_code, progress_callback)
    elif scheme == 2:
        # 方案2: 混合缓存
        return fetch_realtime_data_scheme2_cache(stock_code, progress_callback)
    elif scheme == 3:
        # 方案3: 完整分市场
        return fetch_realtime_data_scheme3_full(stock_code, progress_callback)
    else:
        raise ValueError(f"不支持的方案: {scheme}，请选择 1, 2, 或 3")
