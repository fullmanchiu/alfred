"""
估值分析模块
Valuation Analysis Module

分析股票估值水平，包括PE、PB、PS、股息率、PEG等指标
"""

import akshare as ak
import pandas as pd
import numpy as np
from typing import Dict, Optional, List, Tuple
from datetime import datetime
import time


# =============================================================================
# 数据获取 / Data Fetching
# =============================================================================
def get_stock_individual_info_em(stock_code: str) -> Optional[Dict]:
    """
    获取个股基本信息（从雪球实时行情数据中读取）

    只从已保存的 realtime_raw.csv 读取数据（雪球API已包含所有估值指标）
    不再调用旧API（stock_individual_info_em）

    Args:
        stock_code: 股票代码

    Returns:
        信息字典（包含PE、PB、股息率等37个字段）
    """
    import time
    import os
    import pandas as pd

    # 检查缓存（使用10分钟TTL）
    from . import data_fetcher
    cache_key = f"stock_info_{stock_code}"
    cached_info = data_fetcher.get_cached_data(cache_key, 'stock_data')
    if cached_info is not None and data_fetcher.is_cache_valid(cache_key, 'stock_data'):
        cache_age = time.time() - data_fetcher._cache_timestamps.get(cache_key, 0)
        if cache_age < 600:  # 10分钟
            print(f"  ✓ 使用缓存个股信息（缓存时间{cache_age:.0f}秒）")
            return cached_info

    # 从 realtime_raw.csv 读取（雪球API数据）
    realtime_file = f"data/{stock_code}/realtime_raw.csv"
    if not os.path.exists(realtime_file):
        print(f"  ⚠️ realtime_raw.csv 不存在，请先调用 fetch_realtime_data")
        return None

    try:
        print(f"  📂 从 realtime_raw.csv 读取估值数据（雪球API）...")
        df = pd.read_csv(realtime_file, encoding='utf-8')

        if df.empty or 'item' not in df.columns or 'value' not in df.columns:
            print(f"  ⚠️ realtime_raw.csv 格式错误")
            return None

        # 转换为字典
        info_dict = {}
        for _, row in df.iterrows():
            key = str(row.get('item', '')).strip()
            val = row.get('value', '')
            info_dict[key] = val

        print(f"  ✓ 从 realtime_raw.csv 读取了 {len(info_dict)} 个字段（包含PE、PB、股息率等）")

        # 缓存数据（10分钟TTL）
        data_fetcher._simple_cache[cache_key] = info_dict
        data_fetcher._cache_timestamps[cache_key] = time.time()

        return info_dict

    except Exception as e:
        print(f"  ✗ 读取 realtime_raw.csv 失败: {e}")
        import traceback
        traceback.print_exc()
        return None


def fetch_with_retry(func, stock_code: str, max_retries: int = 3):
    """
    带重试机制的数据获取
    
    Args:
        func: 数据获取函数
        stock_code: 股票代码
        max_retries: 最大重试次数
    
    Returns:
        获取结果
    """
    for attempt in range(max_retries):
        try:
            result = func(stock_code)
            if result is not None and not (hasattr(result, 'empty') and result.empty):
                return result
        except Exception as e:
            if attempt < max_retries - 1:
                print(f"  重试 {attempt + 1}/{max_retries}...")
                time.sleep(2)
            else:
                raise
    return None


# =============================================================================
# 估值指标提取 / Valuation Indicator Extraction
# =============================================================================

def extract_pe_data(info_dict: Dict) -> Dict:
    """
    提取PE（市盈率）数据

    Args:
        info_dict: 个股信息字典

    Returns:
        PE数据字典
    """
    pe_data = {
        'current': None,
        'ttm': None,
        'static': None
    }

    # 尝试从不同字段名提取
    for key in ['市盈率-动态', 'PE(动)', '市盈率(动)', '市盈率TTM', 'PE-TTM', '动态市盈率']:
        if key in info_dict:
            try:
                val = info_dict[key]
                if val is not None and val != '-':
                    pe_val = float(str(val).replace('倍', '').strip())
                    pe_data['current'] = pe_val
                    pe_data['ttm'] = pe_val
                    print(f"  ✓ 从字段 '{key}' 提取到PE: {pe_val}")
                    break
            except (ValueError, TypeError):
                continue

    # 尝试获取静态PE
    for key in ['PE(静)', '静态市盈率', '市盈率']:
        if key in info_dict:
            try:
                val = info_dict[key]
                if val is not None and val != '-':
                    pe_val = float(str(val).replace('倍', '').strip())
                    pe_data['static'] = pe_val
                    print(f"  ✓ 从字段 '{key}' 提取到静态PE: {pe_val}")
                    break
            except (ValueError, TypeError):
                continue

    if pe_data['current'] is None:
        print(f"  ✗ 未找到PE数据，可用字段: {list(info_dict.keys())}")

    return pe_data


def extract_pb_data(info_dict: Dict) -> Dict:
    """
    提取PB（市净率）数据

    Args:
        info_dict: 个股信息字典

    Returns:
        PB数据字典
    """
    pb_data = {
        'current': None
    }

    # 尝试从不同字段名提取
    for key in ['市净率', 'PB', '市净率MRQ']:
        if key in info_dict:
            try:
                val = info_dict[key]
                if val is not None and val != '-':
                    pb_val = float(str(val).replace('倍', '').strip())
                    pb_data['current'] = pb_val
                    print(f"  ✓ 从字段 '{key}' 提取到PB: {pb_val}")
                    break
            except (ValueError, TypeError):
                continue

    if pb_data['current'] is None:
        print(f"  ✗ 未找到PB数据，可用字段: {list(info_dict.keys())}")

    return pb_data


def extract_dividend_yield(stock_code: str, info_dict: Dict = None) -> Dict:
    """
    提取股息率数据

    优先从雪球API数据中提取（info_dict中的股息率TTM）
    如果没有，再调用分红API获取历史数据

    Args:
        stock_code: 股票代码
        info_dict: 已获取的个股信息字典（可选，避免重复请求）

    Returns:
        股息率数据字典
    """
    import time

    dividend_data = {
        'current': None,
        'avg': None,
        'trend': 'unknown'
    }

    # 检查缓存（使用1天TTL）
    from . import data_fetcher
    cache_key = f"dividend_{stock_code}"
    cached_dividend = data_fetcher.get_cached_data(cache_key, 'financial')
    if cached_dividend is not None:
        cache_age = time.time() - data_fetcher._cache_timestamps.get(cache_key, 0)
        print(f"  ✓ 使用缓存股息率数据（缓存时间{cache_age:.0f}秒）")
        return cached_dividend

    # 优先从雪球API数据中提取股息率
    if info_dict is None:
        info_dict = get_stock_individual_info_em(stock_code)

    if info_dict:
        for key in ['股息率(TTM)', '股息率', '股息率TTM', '分红率']:
            if key in info_dict and dividend_data['current'] is None:
                try:
                    val = str(info_dict[key]).replace('%', '').strip()
                    if val and val != 'None' and val != '0':
                        dividend_data['current'] = float(val) / 100
                        print(f"  ✓ 从雪球API字段 '{key}' 提取到股息率: {val}%")
                        break
                except (ValueError, TypeError):
                    continue

    # 如果雪球API没有股息率，则调用分红API获取历史数据（并保存给LLM分析）
    if dividend_data['current'] is None:
        try:
            print(f"  🔄 雪球API无股息率数据，调用分红API获取历史数据...")
            start_time = time.time()

            # 使用个股分红详情API（只获取指定股票的历史分红数据，而非全市场）
            df = ak.stock_fhps_detail_em(symbol=stock_code)

            elapsed = time.time() - start_time
            print(f"  ⏱️ 下载分红历史耗时: {elapsed:.2f}秒")

            if df is not None and not df.empty:
                # ===== 保存原始数据（给LLM分析用）=====
                import os
                os.makedirs(f"data/{stock_code}", exist_ok=True)
                df.to_csv(f"data/{stock_code}/dividend_raw.csv", index=False, encoding='utf-8')
                print(f"  💾 已保存原始分红数据（供LLM分析）")

                latest = df.iloc[0]
                if '现金分红-股息率' in df.columns:
                    try:
                        val = str(latest['现金分红-股息率']).replace('%', '').strip()
                        if val and val != 'None' and val != '0':
                            dividend_data['current'] = float(val) / 100
                            print(f"  ✓ 从分红历史提取到股息率: {val}%")
                    except (ValueError, TypeError):
                        pass
        except Exception as e:
            print(f"  获取分红历史失败: {e}")

    # 如果还是没有，尝试从其他字段提取
    if dividend_data['current'] is None and info_dict:
        for key in ['股息(TTM)']:  # 尝试从股息金额推算
            if key in info_dict:
                try:
                    dividend_per_share = float(info_dict[key])
                    price = float(info_dict.get('现价', 0))
                    if price > 0:
                        dividend_data['current'] = dividend_per_share / price
                        print(f"  ✓ 从股息金额推算股息率: {dividend_per_share}/{price} = {dividend_data['current']:.4f}")
                        break
                except (ValueError, TypeError):
                    continue

    # 缓存数据（1天TTL，使用financial类型）
    data_fetcher.set_cached_data(cache_key, dividend_data, 'financial')

    # 调试输出
    if dividend_data['current'] is not None:
        print(f"  🔍 股息率提取结果: {dividend_data['current'] * 100:.2f}%")
    else:
        print(f"  ⚠️ 未找到股息率数据")

    return dividend_data


def extract_ps_data(info_dict: Dict, stock_code: str = None) -> Dict:
    """
    提取PS（市销率）数据

    PS = 市值 / 营业收入

    Args:
        info_dict: 个股信息字典（包含市值数据）
        stock_code: 股票代码（用于获取营业收入）

    Returns:
        PS数据字典
    """
    ps_data = {
        'current': None
    }

    try:
        # 步骤1：从info_dict获取市值（支持多种字段名格式）
        market_cap = None
        # 优先使用总市值，如果没有则使用流通市值/流通值
        for key in ['总市值', '资产净值/总市值', '流通市值', '流通值']:
            if key in info_dict and info_dict[key] is not None:
                try:
                    market_cap = float(info_dict[key])
                    print(f"  ✓ 从字段 '{key}' 获取市值: {market_cap:.2e} 元")
                    break
                except (ValueError, TypeError):
                    continue

        if market_cap is None or market_cap == 0:
            print(f"  ⚠️ 未找到市值数据，无法计算PS")
            return ps_data

        # 步骤2：获取营业收入（使用Baostock）
        if stock_code is None:
            print(f"  ⚠️ 未提供股票代码，无法获取营业收入")
            return ps_data

        import baostock as bs
        from datetime import datetime

        print(f"  🔄 [Baostock] 正在获取营业收入数据...")

        # 登录 Baostock
        lg = bs.login()
        if lg.error_code != '0':
            print(f"  ⚠️ Baostock 登录失败: {lg.error_msg}")
            return ps_data

        # 判断市场类型并转换代码
        if stock_code.startswith('6'):
            bs_code = f"sh.{stock_code}"
        else:
            bs_code = f"sz.{stock_code}"

        # 获取最新季度的利润表数据
        current_year = datetime.now().year
        rs = bs.query_profit_data(code=bs_code, year=current_year, quarter="4")

        if rs.error_code != '0' or not rs.data:
            # 如果Q4数据没有，尝试Q3
            rs = bs.query_profit_data(code=bs_code, year=current_year, quarter="3")

        bs.logout()

        if rs.error_code != '0' and rs.data:
            df = pd.DataFrame(rs.data, columns=rs.fields)
            if not df.empty:
                revenue = df.iloc[0].get('MBRevenue', 0)
                if revenue:
                    revenue = float(revenue)
                    print(f"  ✓ 获取营业总收入: {revenue:.2e} 元")
                else:
                    revenue = None
        else:
            revenue = None

        if revenue is None or revenue == 0:
            print(f"  ⚠️ 未找到营业总收入，无法计算PS")
            return ps_data

        # 步骤3：计算PS = 市值 / 营业收入
        ps = market_cap / revenue
        ps_data['current'] = ps
        print(f"  ✓ 计算PS: {market_cap:.2e} / {revenue:.2e} = {ps:.4f}")

        return ps_data

    except Exception as e:
        print(f"  ⚠️ 计算PS失败: {e}")
        import traceback
        traceback.print_exc()
        return ps_data


def extract_peg_data(info_dict: Dict, stock_code: str) -> Dict:
    """
    提取PEG（市盈增长比率）数据
    
    Args:
        info_dict: 个股信息字典
        stock_code: 股票代码
    
    Returns:
        PEG数据字典
    """
    peg_data = {
        'current': None,
        'pe': None,
        'growth_rate': None
    }
    
    # 首先获取PE
    pe_data = extract_pe_data(info_dict)
    if pe_data['current'] is not None:
        peg_data['pe'] = pe_data['current']
    
    # 尝试从个股信息获取PEG
    for key in ['PEG', '市盈增长率']:
        if key in info_dict:
            try:
                val = str(info_dict[key]).strip()
                if val and val != '-':
                    peg_data['current'] = float(val)
                    break
            except (ValueError, TypeError):
                continue
    
    return peg_data


# =============================================================================
# 估值评估 / Valuation Evaluation
# =============================================================================

def evaluate_pe(pe_value: Optional[float]) -> Dict:
    """
    评估PE（市盈率）水平
    
    Args:
        pe_value: PE值
    
    Returns:
        评估结果字典
    """
    if pe_value is None or pd.isna(pe_value):
        return {
            'evaluation': '无法评估',
            'evaluation_cn': '无数据',
            'score': 0,
            'color': 'grey'
        }
    
    # PE评估标准（简化版，不使用历史分位数）
    if pe_value <= 10:
        evaluation = '极低'
        evaluation_cn = '严重低估'
        score = 5
        color = 'darkgreen'
    elif pe_value <= 15:
        evaluation = '低'
        evaluation_cn = '低估'
        score = 4
        color = 'green'
    elif pe_value <= 25:
        evaluation = '合理'
        evaluation_cn = '合理'
        score = 3
        color = 'blue'
    elif pe_value <= 40:
        evaluation = '高'
        evaluation_cn = '偏高'
        score = 2
        color = 'orange'
    else:
        evaluation = '极高'
        evaluation_cn = '高估'
        score = 1
        color = 'red'
    
    return {
        'evaluation': evaluation,
        'evaluation_cn': evaluation_cn,
        'score': score,
        'color': color
    }


def evaluate_pb(pb_value: Optional[float]) -> Dict:
    """
    评估PB（市净率）水平
    
    Args:
        pb_value: PB值
    
    Returns:
        评估结果字典
    """
    if pb_value is None or pd.isna(pb_value):
        return {
            'evaluation': '无法评估',
            'evaluation_cn': '无数据',
            'score': 0,
            'color': 'grey'
        }
    
    # PB评估标准
    if pb_value < 0.8:
        evaluation = '极低'
        evaluation_cn = '严重低估（破净）'
        score = 5
        color = 'darkgreen'
    elif pb_value <= 1.2:
        evaluation = '低'
        evaluation_cn = '低估'
        score = 4
        color = 'green'
    elif pb_value <= 2.0:
        evaluation = '合理'
        evaluation_cn = '合理'
        score = 3
        color = 'blue'
    elif pb_value <= 3.0:
        evaluation = '高'
        evaluation_cn = '偏高'
        score = 2
        color = 'orange'
    else:
        evaluation = '极高'
        evaluation_cn = '高估'
        score = 1
        color = 'red'
    
    return {
        'evaluation': evaluation,
        'evaluation_cn': evaluation_cn,
        'score': score,
        'color': color
    }


def evaluate_dividend_yield(yield_value: Optional[float]) -> Dict:
    """
    评估股息率水平
    
    Args:
        yield_value: 股息率（小数，如0.05表示5%）
    
    Returns:
        评估结果字典
    """
    if yield_value is None or pd.isna(yield_value):
        return {
            'evaluation': '无法评估',
            'evaluation_cn': '无数据',
            'score': 0,
            'color': 'grey'
        }
    
    yield_pct = yield_value * 100
    
    # 股息率评估标准
    if yield_pct >= 5.0:
        evaluation = '极高'
        evaluation_cn = '极高股息率'
        score = 5
        color = 'darkgreen'
    elif yield_pct >= 3.5:
        evaluation = '高'
        evaluation_cn = '高股息率'
        score = 4
        color = 'green'
    elif yield_pct >= 2.5:
        evaluation = '中等'
        evaluation_cn = '中等股息率'
        score = 3
        color = 'blue'
    elif yield_pct >= 1.5:
        evaluation = '低'
        evaluation_cn = '偏低股息率'
        score = 2
        color = 'orange'
    else:
        evaluation = '极低'
        evaluation_cn = '低股息率'
        score = 1
        color = 'red'
    
    return {
        'evaluation': evaluation,
        'evaluation_cn': evaluation_cn,
        'score': score,
        'color': color
    }


def evaluate_ps(ps_value: Optional[float]) -> Dict:
    """
    评估PS（市销率）水平
    
    Args:
        ps_value: PS值
    
    Returns:
        评估结果字典
    """
    if ps_value is None or pd.isna(ps_value):
        return {
            'evaluation': '无法评估',
            'evaluation_cn': '无数据',
            'score': 0,
            'color': 'grey'
        }
    
    # PS评估标准（简化版）
    if ps_value <= 2.0:
        evaluation = '低'
        evaluation_cn = '低估'
        score = 5
        color = 'green'
    elif ps_value <= 5.0:
        evaluation = '合理'
        evaluation_cn = '合理'
        score = 3
        color = 'blue'
    elif ps_value <= 10.0:
        evaluation = '高'
        evaluation_cn = '偏高'
        score = 2
        color = 'orange'
    else:
        evaluation = '极高'
        evaluation_cn = '高估'
        score = 1
        color = 'red'
    
    return {
        'evaluation': evaluation,
        'evaluation_cn': evaluation_cn,
        'score': score,
        'color': color
    }


def evaluate_peg(peg_value: Optional[float]) -> Dict:
    """
    评估PEG（市盈增长比率）水平
    
    Args:
        peg_value: PEG值
    
    Returns:
        评估结果字典
    """
    if peg_value is None or pd.isna(peg_value) or peg_value <= 0:
        return {
            'evaluation': '无法评估',
            'evaluation_cn': '无数据或负值',
            'score': 0,
            'color': 'grey'
        }
    
    # PEG评估标准（Peter Lynch标准）
    if peg_value <= 0.5:
        evaluation = '极低'
        evaluation_cn = '严重低估'
        score = 5
        color = 'darkgreen'
    elif peg_value <= 0.8:
        evaluation = '低'
        evaluation_cn = '低估'
        score = 4
        color = 'green'
    elif peg_value <= 1.0:
        evaluation = '合理'
        evaluation_cn = '合理估值'
        score = 3
        color = 'blue'
    elif peg_value <= 1.5:
        evaluation = '高'
        evaluation_cn = '略微高估'
        score = 2
        color = 'orange'
    else:
        evaluation = '极高'
        evaluation_cn = '高估'
        score = 1
        color = 'red'
    
    return {
        'evaluation': evaluation,
        'evaluation_cn': evaluation_cn,
        'score': score,
        'color': color
    }


# =============================================================================
# 综合评分 / Comprehensive Scoring
# =============================================================================

def calculate_comprehensive_score(
    pe_score: int,
    pb_score: int,
    dividend_score: int,
    peg_score: int,
    ps_score: int
) -> Dict:
    """
    计算综合估值评分
    
    Args:
        pe_score: PE评分
        pb_score: PB评分
        dividend_score: 股息率评分
        peg_score: PEG评分
        ps_score: PS评分
    
    Returns:
        综合评分字典
    """
    # 权重分配
    weights = {
        'pe': 0.25,        # PE权重25%
        'pb': 0.20,        # PB权重20%
        'dividend': 0.20,  # 股息率权重20%
        'peg': 0.20,        # PEG权重20%
        'ps': 0.15          # PS权重15%
    }
    
    # 计算加权分数
    total_score = (
        pe_score * weights['pe'] +
        pb_score * weights['pb'] +
        dividend_score * weights['dividend'] +
        peg_score * weights['peg'] +
        ps_score * weights['ps']
    ) * 100 / 5  # 标准化到100分
    
    # 综合评级
    if total_score >= 85:
        rating = '优秀'
        rating_cn = '优秀估值'
        rating_en = 'Excellent'
        color = 'darkgreen'
        recommendation = '强烈推荐'
    elif total_score >= 70:
        rating = '良好'
        rating_cn = '良好估值'
        rating_en = 'Good'
        color = 'green'
        recommendation = '推荐'
    elif total_score >= 50:
        rating = '合理'
        rating_cn = '合理估值'
        rating_en = 'Reasonable'
        color = 'blue'
        recommendation = '可考虑'
    elif total_score >= 35:
        rating = '偏高'
        rating_cn = '偏高估值'
        rating_en = 'High'
        color = 'orange'
        recommendation = '谨慎'
    else:
        rating = '高估'
        rating_cn = '高估估值'
        rating_en = 'Overvalued'
        color = 'red'
        recommendation = '不推荐'
    
    return {
        'total_score': round(total_score, 1),
        'rating': rating,
        'rating_cn': rating_cn,
        'rating_en': rating_en,
        'color': color,
        'recommendation': recommendation,
        'detail_scores': {
            'pe_score': pe_score,
            'pb_score': pb_score,
            'dividend_score': dividend_score,
            'peg_score': peg_score,
            'ps_score': ps_score
        }
    }


# =============================================================================
# 完整分析流程 / Complete Analysis Workflow
# =============================================================================

def run_valuation_analysis(
    stock_code: str,
    stock_name: str
) -> Dict:
    """
    运行完整的估值分析流程
    
    Args:
        stock_code: 股票代码
        stock_name: 股票名称
    
    Returns:
        包含分析结果的字典
    """
    print(f"\n{'='*60}")
    print(f"估值分析 / Valuation Analysis")
    print(f"{'='*60}")
    print(f"股票代码 Stock Code: {stock_code}")
    print(f"股票名称 Stock Name: {stock_name}")
    print(f"{'='*60}")
    
    # 获取个股信息
    print(f"🔄 正在获取个股信息...")
    info_dict = fetch_with_retry(get_stock_individual_info_em, stock_code)
    
    if info_dict is None:
        print(f"✗ 获取个股信息失败")
        return {
            'stock_code': stock_code,
            'stock_name': stock_name,
            'error': '无法获取个股信息'
        }
    
    print(f"✓ 个股信息获取成功")
    
    # 提取各项估值指标
    print(f"🔄 正在提取估值指标...")
    
    # PE数据
    pe_data = extract_pe_data(info_dict)
    pe_evaluation = evaluate_pe(pe_data['current'])
    print(f"  PE: {pe_data['current'] if pe_data['current'] else 'N/A'}")
    
    # PB数据
    pb_data = extract_pb_data(info_dict)
    pb_evaluation = evaluate_pb(pb_data['current'])
    print(f"  PB: {pb_data['current'] if pb_data['current'] else 'N/A'}")
    
    # PS数据
    ps_data = extract_ps_data(info_dict, stock_code)
    ps_evaluation = evaluate_ps(ps_data['current'])
    print(f"  PS: {ps_data['current'] if ps_data['current'] else 'N/A'}")
    
    # 股息率数据（传递info_dict避免重复请求）
    print(f"🔄 正在获取股息率数据...")
    dividend_data = extract_dividend_yield(stock_code, info_dict)
    dividend_current = dividend_data.get('current')
    # 确保current不是字典
    if isinstance(dividend_current, dict):
        dividend_current = None
    dividend_evaluation = evaluate_dividend_yield(dividend_current)
    print(f"  股息率: {dividend_current*100 if dividend_current else 'N/A'}%")
    
    # PEG数据
    peg_data = extract_peg_data(info_dict, stock_code)
    peg_evaluation = evaluate_peg(peg_data['current'])
    print(f"  PEG: {peg_data['current'] if peg_data['current'] else 'N/A'}")
    
    # 计算综合评分
    print(f"🔄 正在计算综合评分...")
    comprehensive_score = calculate_comprehensive_score(
        pe_evaluation['score'],
        pb_evaluation['score'],
        dividend_evaluation['score'],
        peg_evaluation['score'],
        ps_evaluation['score']
    )
    
    print(f"✅ 估值分析完成！")
    print(f"   综合评分: {comprehensive_score['total_score']}/100")
    print(f"   评级: {comprehensive_score['rating_cn']}")
    
    # 返回结果
    return {
        'stock_code': stock_code,
        'stock_name': stock_name,
        'pe': {
            'data': pe_data,
            'evaluation': pe_evaluation
        },
        'pb': {
            'data': pb_data,
            'evaluation': pb_evaluation
        },
        'ps': {
            'data': ps_data,
            'evaluation': ps_evaluation
        },
        'dividend': {
            'data': dividend_data,
            'evaluation': dividend_evaluation
        },
        'peg': {
            'data': peg_data,
            'evaluation': peg_evaluation
        },
        'comprehensive_score': comprehensive_score,
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    }


# =============================================================================
# 主函数 / Main Function
# =============================================================================

def main():
    """主函数 - 测试估值分析"""
    try:
        from .data_fetcher import load_config
    except ImportError:
        import os
        import json
        
        def load_config():
            config_path = os.path.join(os.path.dirname(__file__), '..', 'config', 'stock_list.json')
            if os.path.exists(config_path):
                with open(config_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            return {"stocks": [], "watchlist": []}
    
    # 加载配置
    config = load_config()
    
    # 获取股票
    if not config.get('stocks'):
        print("配置文件中没有股票列表 / No stocks in config")
        return
    
    stock = config['stocks'][0]
    stock_code = stock['code']
    stock_name = stock['name']
    
    # 运行分析
    try:
        results = run_valuation_analysis(stock_code, stock_name)
        
        # 打印结果
        if 'error' not in results:
            print(f"\n{'='*60}")
            print(f"估值分析结果 / Valuation Analysis Results")
            print(f"{'='*60}")
            print(f"\n综合评分 Comprehensive Score: {results['comprehensive_score']['total_score']}/100")
            print(f"评级 Rating: {results['comprehensive_score']['rating_cn']}")
            print(f"建议 Recommendation: {results['comprehensive_score']['recommendation']}")
            
            # 详细指标
            print(f"\n详细指标 / Detail Indicators:")
            print(f"  PE: {results['pe']['data']['current']} ({results['pe']['evaluation']['evaluation_cn']})")
            print(f"  PB: {results['pb']['data']['current']} ({results['pb']['evaluation']['evaluation_cn']})")
            print(f"  PS: {results['ps']['data']['current']} ({results['ps']['evaluation']['evaluation_cn']})")
            dividend_current = results['dividend']['data']['current']
            if dividend_current and isinstance(dividend_current, (int, float)):
                print(f"  股息率: {dividend_current*100:.2f}% ({results['dividend']['evaluation']['evaluation_cn']})")
            else:
                print(f"  股息率: N/A ({results['dividend']['evaluation']['evaluation_cn']})")
            print(f"  PEG: {results['peg']['data']['current']} ({results['peg']['evaluation']['evaluation_cn']})")
        else:
            print(f"错误 Error: {results['error']}")
    
    except Exception as e:
        print(f"分析失败 Analysis failed: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    main()
