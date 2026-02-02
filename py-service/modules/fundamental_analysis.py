"""
基本面分析模块
Fundamental Analysis Module

分析公司财务数据和基本面指标
"""

import akshare as ak
import pandas as pd
from typing import Dict, Optional, List, Tuple
import time

# 导入utils模块
try:
    from . import utils
except ImportError:
    import utils


# =============================================================================
# 数据获取 / Data Fetching
# =============================================================================

def get_mock_financial_data(stock_code: str) -> pd.DataFrame:
    """获取模拟财务数据用于测试
    Get mock financial data for testing
    
    Args:
        stock_code: 股票代码
        
    Returns:
        模拟财务数据DataFrame
    """
    mock_data = {
        '601857': {
            'roe': 8.5,
            'gross_profit_margin': 25.5,
            'debt_to_assets': 42.3,
            'current_ratio': 1.2,
            'net_profit_margin': 4.8,
            'roa': 3.5,
            'quick_ratio': 0.9,
            'asset_turnover': 0.75,
            'operating_profit_margin': 12.5,
            'total_revenue': 25000000000,
            'net_profit': 1200000000
        },
        'default': {
            'roe': 12.0,
            'gross_profit_margin': 30.0,
            'debt_to_assets': 35.0,
            'current_ratio': 1.5,
            'net_profit_margin': 8.5,
            'roa': 4.2,
            'quick_ratio': 1.1,
            'asset_turnover': 0.85,
            'operating_profit_margin': 15.0,
            'total_revenue': 12000000000,
            'net_profit': 800000000
        }
    }
    
    data = mock_data.get(stock_code, mock_data['default'])
    return pd.DataFrame([data])


def get_financial_summary(stock_code: str, num_quarters: int = 4) -> Optional[pd.DataFrame]:
    """使用 Baostock 获取财务摘要数据（支持多季度）

    使用 Baostock 的财务接口获取数据，支持指定季度数量
    优势：
    1. 数据量小：近1年只需 13.7KB vs AkShare 的 87KB（节省84%）
    2. 精确控制时间范围：支持指定获取的季度数量
    3. 数据稳定：上交所/深交所官方数据源
    4. 自动缓存：24小时内重复使用缓存数据，避免频繁API调用

    Args:
        stock_code: 股票代码（如 '601857'）
        num_quarters: 获取的季度数量（默认4个季度=1年，最大20个季度=5年）

    Returns:
        DataFrame 包含多季度数据，列：quarter, roe, gross_profit_margin, net_profit_margin,
                                      total_revenue, net_profit, debt_to_assets, current_ratio, quick_ratio
    """
    import baostock as bs
    from datetime import datetime
    import os
    import time

    try:
        print(f"🔄 [Baostock] 正在获取 {stock_code} 的财务数据（最近{num_quarters}个季度）...")

        # 判断市场类型并转换代码
        if stock_code.startswith('6'):
            bs_code = f"sh.{stock_code}"
        else:
            bs_code = f"sz.{stock_code}"

        # 计算最新可用季度
        current_date = datetime.now()
        current_year = current_date.year
        current_month = current_date.month

        # 根据当前月份确定最新可用季度
        if current_month >= 10:
            latest_year = current_year
            latest_quarter = 3
        elif current_month >= 8:
            latest_year = current_year
            latest_quarter = 2
        elif current_month >= 4:
            latest_year = current_year
            latest_quarter = 1
        else:
            # 1-3月，最新可用的是去年Q3
            latest_year = current_year - 1
            latest_quarter = 3

        print(f"  最新可用季度: {latest_year}年Q{latest_quarter}")

        # ===== 缓存检查 =====
        cache_dir = f"data/{stock_code}"
        cache_file = f"{cache_dir}/financial_baostock_{num_quarters}q.csv"
        cache_ttl = 24 * 3600  # 24小时缓存

        # 确保缓存目录存在
        os.makedirs(cache_dir, exist_ok=True)

        # 检查缓存是否存在且有效
        if os.path.exists(cache_file):
            file_age = time.time() - os.path.getmtime(cache_file)
            if file_age < cache_ttl:
                try:
                    print(f"  ✓ 使用缓存数据（缓存时间 {file_age/3600:.1f} 小时前）")
                    df = pd.read_csv(cache_file, encoding='utf-8')
                    if not df.empty and len(df) >= num_quarters:
                        print(f"  ✓ 从缓存读取 {len(df)} 个季度财务数据成功")
                        return df
                    else:
                        print(f"  ⚠️ 缓存数据不足或为空，将重新获取")
                except Exception as e:
                    print(f"  ⚠️ 读取缓存失败: {e}，将重新获取")
            else:
                print(f"  ⚠️ 缓存已过期（{file_age/3600:.1f} 小时前），将重新获取")
        else:
            print(f"  📂 缓存不存在，将从API获取")

        # 登录 Baostock
        lg = bs.login()
        if lg.error_code != '0':
            raise Exception(f"Baostock 登录失败: {lg.error_msg}")

        # 循环获取多个季度的数据
        all_quarters_data = []
        year = latest_year
        quarter = latest_quarter
        fetched_count = 0

        for i in range(num_quarters):
            # 计算当前要获取的季度（从最新往回推）
            current_q = quarter - i
            current_y = year

            # 处理跨年
            while current_q <= 0:
                current_q += 4
                current_y -= 1

            # 跳过Q4（Q4年报次年4月才发布，通常不可用）
            if current_q == 4:
                print(f"  ⊗ 跳过 {current_y}年Q4（年报尚未发布）")
                continue

            quarter_str = str(current_q)
            print(f"  → 获取 {current_y}年Q{current_q} 数据...")

            # 获取利润表数据
            rs_profit = bs.query_profit_data(code=bs_code, year=current_y, quarter=quarter_str)

            # 获取资产负债表数据
            rs_balance = bs.query_balance_data(code=bs_code, year=current_y, quarter=quarter_str)

            # 检查数据是否获取成功
            if rs_profit.error_code != '0' or rs_balance.error_code != '0':
                print(f"    ⚠️ {current_y}年Q{current_q} 数据获取失败，跳过")
                continue

            # 转换为 DataFrame
            df_profit = pd.DataFrame(rs_profit.data, columns=rs_profit.fields)
            df_balance = pd.DataFrame(rs_balance.data, columns=rs_balance.fields)

            if df_profit.empty or df_balance.empty:
                print(f"    ⚠️ {current_y}年Q{current_q} 数据为空，跳过")
                continue

            # 从利润表提取数据
            profit_row = df_profit.iloc[0]
            roe = profit_row.get('roeAvg', 0)
            np_margin = profit_row.get('npMargin', 0)
            gp_margin = profit_row.get('gpMargin', 0)
            net_profit = profit_row.get('netProfit', 0)
            total_revenue = profit_row.get('MBRevenue', 0)

            # 从资产负债表提取数据
            balance_row = df_balance.iloc[0]
            current_ratio = balance_row.get('currentRatio', 0)
            quick_ratio = balance_row.get('quickRatio', 0)
            liability_to_asset = balance_row.get('liabilityToAsset', 0)

            # 转换为数值
            try:
                roe = float(roe) * 100 if roe else 0
                np_margin = float(np_margin) * 100 if np_margin else 0
                gp_margin = float(gp_margin) * 100 if gp_margin else 0
                net_profit = float(net_profit) if net_profit else 0
                total_revenue = float(total_revenue) if total_revenue else 0
                current_ratio = float(current_ratio) if current_ratio else 0
                quick_ratio = float(quick_ratio) if quick_ratio else 0
                liability_to_asset = float(liability_to_asset) * 100 if liability_to_asset else 0
            except (ValueError, TypeError) as e:
                print(f"    ⚠️ {current_y}年Q{current_q} 数值转换失败: {e}，跳过")
                continue

            # 添加到列表
            all_quarters_data.append({
                'quarter': f"{current_y}Q{current_q}",
                'roe': roe,
                'gross_profit_margin': gp_margin,
                'net_profit_margin': np_margin,
                'total_revenue': total_revenue,
                'net_profit': net_profit,
                'debt_to_assets': liability_to_asset,
                'current_ratio': current_ratio,
                'quick_ratio': quick_ratio
            })
            fetched_count += 1

        # 登出
        bs.logout()

        if not all_quarters_data:
            print(f"✗ 未能获取任何财务数据")
            return None

        # 构建结果 DataFrame（按时间倒序，最新在前）
        result_df = pd.DataFrame(all_quarters_data)
        print(f"✓ 成功获取 {len(result_df)} 个季度的财务数据")

        # 打印最新季度指标
        latest = result_df.iloc[0]
        print(f"  最新季度 ({latest['quarter']}) 财务指标:")
        print(f"    ROE: {latest['roe']:.2f}%")
        print(f"    毛利率: {latest['gross_profit_margin']:.2f}%")
        print(f"    净利率: {latest['net_profit_margin']:.2f}%")
        print(f"    营业收入: {latest['total_revenue']:.2e} 元")

        # 保存到缓存
        try:
            result_df.to_csv(cache_file, index=False, encoding='utf-8')
            print(f"  💾 已保存到缓存: {cache_file}")
        except Exception as e:
            print(f"  ⚠️ 保存缓存失败: {e}")

        return result_df

    except Exception as e:
        print(f"✗ 获取财务摘要数据失败 Failed to fetch financial summary: {e}")
        import traceback
        traceback.print_exc()
        return None


def get_stock_info(stock_code: str) -> Optional[Dict]:
    """获取股票基本信息（使用雪球API + Baostock行业信息）

    数据来源：
    1. 雪球API：realtime_raw.csv（包含37个字段）
    2. Baostock：query_stock_industry（行业信息）

    Args:
        stock_code: 股票代码

    Returns:
        包含基本信息的字典
    """
    import os
    import baostock as bs
    import pandas as pd

    try:
        print(f"🔄 正在获取 {stock_code} 的基本信息...")

        # 1. 从雪球API数据读取基本信息
        realtime_file = f"data/{stock_code}/realtime_raw.csv"
        if os.path.exists(realtime_file):
            print(f"  📂 从 realtime_raw.csv 读取基本信息（雪球API）...")
            df = pd.read_csv(realtime_file, encoding='utf-8')

            if not df.empty and 'item' in df.columns and 'value' in df.columns:
                info_dict = {}
                for _, row in df.iterrows():
                    key = str(row.get('item', '')).strip()
                    val = row.get('value', '')
                    info_dict[key] = val
                print(f"  ✓ 从雪球API读取了 {len(info_dict)} 个字段")
            else:
                info_dict = {}
        else:
            print(f"  ⚠️ realtime_raw.csv 不存在")
            info_dict = {}

        # 2. 从 Baostock 获取行业信息
        print(f"  🔄 [Baostock] 正在获取行业信息...")
        lg = bs.login()
        if lg.error_code == '0':
            # 判断市场类型并转换代码
            if stock_code.startswith('6'):
                bs_code = f"sh.{stock_code}"
            else:
                bs_code = f"sz.{stock_code}"

            # 获取行业信息
            rs = bs.query_stock_industry(code=bs_code)
            if rs.error_code == '0' and rs.data:
                df_industry = pd.DataFrame(rs.data, columns=rs.fields)
                if not df_industry.empty:
                    industry = df_industry.iloc[0]['industry']
                    info_dict['行业'] = industry
                    print(f"  ✓ 行业: {industry}")

            bs.logout()

        if info_dict:
            print(f"✓ 基本信息获取成功")
            return info_dict
        else:
            print(f"✗ 基本信息获取失败：无数据")
            return None

    except Exception as e:
        print(f"✗ 获取基本信息失败 Failed to fetch basic info: {e}")
        import traceback
        traceback.print_exc()
        return None


def fetch_with_retry(func, stock_code: str, max_retries: int = 2, **kwargs):
    """带重试机制的数据获取
    Fetch data with retry mechanism

    Args:
        func: 数据获取函数
        stock_code: 股票代码
        max_retries: 最大重试次数
        **kwargs: 传递给func的额外参数

    Returns:
        获取结果
    """
    for attempt in range(max_retries):
        try:
            result = func(stock_code, **kwargs)
            if result is not None and not (hasattr(result, 'empty') and result.empty):
                return result
        except Exception as e:
            if attempt < max_retries - 1:
                print(f"重试 {attempt + 1}/{max_retries}...")
                time.sleep(1)
            else:
                raise
    return None


# =============================================================================
# 辅助函数 / Helper Functions
# =============================================================================

def print_financial_data_summary(df: pd.DataFrame):
    """打印财务数据摘要
    Print summary of financial data
    
    Args:
        df: 财务数据DataFrame
    """
    print("\n" + "=" * 60)
    print("财务数据摘要 / Financial Data Summary")
    print("=" * 60)
    
    if df is None or df.empty:
        print("数据为空 / Data is empty")
        return
    
    print(f"数据行数: {len(df)}")
    print(f"数据列名: {df.columns.tolist()}")
    print(f"最新数据 (index {df.index[-1]}):")
    
    latest = df.iloc[-1]
    for col in df.columns:
        val = latest[col]
        if isinstance(val, float):
            print(f"  {col}: {val:.4f}")
        else:
            print(f"  {col}: {val}")


# =============================================================================
# 基本面评估 / Fundamental Assessment
# =============================================================================

def calculate_fundamental_score(df: pd.DataFrame) -> Tuple[int, List[str]]:
    """计算基本面评分
    Calculate fundamental score
    
    Args:
        df: 财务指标DataFrame
        
    Returns:
        (score, reasons) 评分和原因列表
    """
    if df is None or df.empty:
        print("  警告：财务指标数据为空，返回默认评分")
        return 50, ["无法获取财务数据，使用默认评分 Cannot fetch financial data, using default score"]
    
    print("\n  开始计算基本面评分...")
    print_financial_data_summary(df)
    
    score = 0
    reasons = []
    metric_count = 0
    
    latest = df.iloc[-1]
    
    # ROE评估 / ROE Assessment
    roe = latest.get('roe', 0)
    if roe is not None and isinstance(roe, (int, float)) and roe > 0:
        metric_count += 1
        if roe > 20:
            score += 25
            reasons.append(f"ROE优秀 ROE is excellent ({roe:.2f}%)")
        elif roe > 15:
            score += 20
            reasons.append(f"ROE很好 ROE is very good ({roe:.2f}%)")
        elif roe > 10:
            score += 15
            reasons.append(f"ROE良好 ROE is good ({roe:.2f}%)")
        elif roe > 5:
            score += 10
            reasons.append(f"ROE一般 ROE is average ({roe:.2f}%)")
        else:
            score += 5
            reasons.append(f"ROE偏低 ROE is low ({roe:.2f}%)")
        print(f"  ROE: {roe:.2f}%")
    
    # 毛利率评估 / Gross Margin Assessment
    margin = latest.get('gross_profit_margin', 0)
    if margin is not None and isinstance(margin, (int, float)) and margin > 0:
        metric_count += 1
        if margin > 50:
            score += 25
            reasons.append(f"毛利率优秀 Gross margin is excellent ({margin:.2f}%)")
        elif margin > 40:
            score += 20
            reasons.append(f"毛利率很高 Gross margin is very high ({margin:.2f}%)")
        elif margin > 30:
            score += 15
            reasons.append(f"毛利率良好 Gross margin is good ({margin:.2f}%)")
        elif margin > 20:
            score += 10
            reasons.append(f"毛利率一般 Gross margin is average ({margin:.2f}%)")
        elif margin > 10:
            score += 5
            reasons.append(f"毛利率偏低 Gross margin is low ({margin:.2f}%)")
        print(f"  毛利率: {margin:.2f}%")
    
    # 资产负债率评估 / Debt Ratio Assessment (lower is better)
    debt_ratio = latest.get('debt_to_assets', 0)
    if debt_ratio is not None and isinstance(debt_ratio, (int, float)) and debt_ratio > 0:
        metric_count += 1
        if debt_ratio < 20:
            score += 25
            reasons.append(f"资产负债率优秀 Debt ratio is excellent ({debt_ratio:.2f}%)")
        elif debt_ratio < 30:
            score += 20
            reasons.append(f"资产负债率很好 Debt ratio is very good ({debt_ratio:.2f}%)")
        elif debt_ratio < 40:
            score += 15
            reasons.append(f"资产负债率健康 Debt ratio is healthy ({debt_ratio:.2f}%)")
        elif debt_ratio < 50:
            score += 10
            reasons.append(f"资产负债率一般 Debt ratio is moderate ({debt_ratio:.2f}%)")
        elif debt_ratio < 70:
            score += 5
            reasons.append(f"资产负债率可接受 Debt ratio is acceptable ({debt_ratio:.2f}%)")
        elif debt_ratio >= 70:
            score -= 20
            reasons.append(f"资产负债率偏高 Debt ratio is high ({debt_ratio:.2f}%)")
        print(f"  资产负债率: {debt_ratio:.2f}%")
    
    # 流动比率评估 / Current Ratio Assessment (higher is better)
    current_ratio = latest.get('current_ratio', 0)
    if current_ratio is not None and isinstance(current_ratio, (int, float)) and current_ratio > 0:
        metric_count += 1
        if current_ratio > 2.5:
            score += 25
            reasons.append(f"流动比率优秀 Current ratio is excellent ({current_ratio:.2f})")
        elif current_ratio > 2:
            score += 20
            reasons.append(f"流动比率很好 Current ratio is very good ({current_ratio:.2f})")
        elif current_ratio > 1.5:
            score += 15
            reasons.append(f"流动比率良好 Current ratio is good ({current_ratio:.2f})")
        elif current_ratio > 1:
            score += 10
            reasons.append(f"流动比率一般 Current ratio is average ({current_ratio:.2f})")
        elif current_ratio > 0.8:
            score += 5
            reasons.append(f"流动比率偏低 Current ratio is low ({current_ratio:.2f})")
        print(f"  流动比率: {current_ratio:.2f}")
    
    # 净利率评估 / Net Margin Assessment
    net_margin = latest.get('net_profit_margin', 0)
    if net_margin is not None and isinstance(net_margin, (int, float)) and net_margin > 0:
        metric_count += 1
        if net_margin > 20:
            score += 20
            reasons.append(f"净利率优秀 Net margin is excellent ({net_margin:.2f}%)")
        elif net_margin > 15:
            score += 15
            reasons.append(f"净利率很好 Net margin is very good ({net_margin:.2f}%)")
        elif net_margin > 10:
            score += 10
            reasons.append(f"净利率良好 Net margin is good ({net_margin:.2f}%)")
        elif net_margin > 5:
            score += 5
            reasons.append(f"净利率一般 Net margin is average ({net_margin:.2f}%)")
        print(f"  净利率: {net_margin:.2f}%")
    
    # 速动比率评估 / Quick Ratio Assessment
    quick_ratio = latest.get('quick_ratio', 0)
    if quick_ratio is not None and isinstance(quick_ratio, (int, float)) and quick_ratio > 0:
        metric_count += 1
        if quick_ratio > 1.5:
            score += 15
            reasons.append(f"速动比率优秀 Quick ratio is excellent ({quick_ratio:.2f})")
        elif quick_ratio > 1:
            score += 10
            reasons.append(f"速动比率良好 Quick ratio is good ({quick_ratio:.2f})")
        elif quick_ratio > 0.8:
            score += 5
            reasons.append(f"速动比率一般 Quick ratio is average ({quick_ratio:.2f})")
        print(f"  速动比率: {quick_ratio:.2f}")
    
    # ROA评估 / ROA Assessment
    roa = latest.get('roa', 0)
    if roa is not None and isinstance(roa, (int, float)) and roa > 0:
        metric_count += 1
        if roa > 10:
            score += 15
            reasons.append(f"ROA优秀 ROA is excellent ({roa:.2f}%)")
        elif roa > 5:
            score += 10
            reasons.append(f"ROA良好 ROA is good ({roa:.2f}%)")
        elif roa > 2:
            score += 5
            reasons.append(f"ROA一般 ROA is average ({roa:.2f}%)")
        print(f"  ROA: {roa:.2f}%")
    
    # 资产周转率评估 / Asset Turnover Assessment
    asset_turnover = latest.get('asset_turnover', 0)
    if asset_turnover is not None and isinstance(asset_turnover, (int, float)) and asset_turnover > 0:
        metric_count += 1
        if asset_turnover > 1.5:
            score += 10
            reasons.append(f"资产周转率优秀 Asset turnover is excellent ({asset_turnover:.4f})")
        elif asset_turnover > 1:
            score += 5
            reasons.append(f"资产周转率良好 Asset turnover is good ({asset_turnover:.4f})")
        print(f"  资产周转率: {asset_turnover:.4f}")
    
    # 如果没有找到任何指标，返回默认分数
    if metric_count == 0:
        print(f"  警告：没有找到任何有效财务指标")
        return 50, ["无法识别财务数据格式，使用默认评分 Cannot recognize financial data format, using default score"]
    
    # 标准化分数到100分
    if metric_count > 0 and score > 0:
        max_possible_score = 25 + 25 + 25 + 25 + 20 + 15 + 15 + 10 + 10
        normalized_score = min(100, int(score * 100 / max_possible_score))
        print(f"  原始分数: {score}, 标准化分数: {normalized_score}")
        return normalized_score, reasons
    
    # Ensure minimum score of 10
    final_score = max(10, score)
    if final_score == 10:
        print("警告：评分为0，使用基础分10")
        reasons.append("基于现有指标给予基础评分 Base score given for available indicators")
    
    return final_score, reasons


# =============================================================================
# Markdown报告生成 / Markdown Report Generation
# =============================================================================

def generate_markdown_report(
    stock_code: str,
    stock_name: str,
    basic_info: Optional[Dict] = None,
    financial_indicators: Optional[Dict] = None,
    score: int = 0,
    assessment: str = "无法评估"
) -> str:
    """生成基本面分析的Markdown报告
    Generate Markdown report for fundamental analysis
    
    Args:
        stock_code: 股票代码
        stock_name: 股票名称
        basic_info: 基本信息
        financial_indicators: 财务指标
        score: 评分
        assessment: 评估结果
        
    Returns:
        Markdown格式的报告字符串
    """
    return utils.generate_fundamental_markdown_report(
        stock_code=stock_code,
        stock_name=stock_name,
        basic_info=basic_info or {},
        financial_indicators=financial_indicators or {},
        score=score,
        assessment=assessment
    )


# =============================================================================
# 完整分析流程 / Complete Analysis Workflow
# =============================================================================

def run_fundamental_analysis(stock_code: str, stock_name: str, num_quarters: int = 4) -> Dict:
    """运行完整的基本面分析流程
    Run complete fundamental analysis workflow

    Args:
        stock_code: 股票代码
        stock_name: 股票名称
        num_quarters: 获取的季度数量（默认4个季度=1年）

    Returns:
        包含分析结果的字典
    """
    print(f"\n{'='*60}")
    print(f"基本面分析 / Fundamental Analysis")
    print(f"{'='*60}")
    print(f"股票代码 Stock Code: {stock_code}")
    print(f"股票名称 Stock Name: {stock_name}")
    print(f"{'='*60}")
    
    # 获取基本信息
    basic_info = fetch_with_retry(get_stock_info, stock_code)

    # 获取财务指标（使用Baostock）
    print("\n获取财务指标（Baostock）...")
    financial_indicator_df = fetch_with_retry(get_financial_summary, stock_code, num_quarters=num_quarters)

    # 如果获取失败，使用模拟数据
    if financial_indicator_df is None or financial_indicator_df.empty:
        print("\n⚠️ 使用模拟数据进行演示 Using mock data for demonstration")
        financial_indicator_df = get_mock_financial_data(stock_code)
        
        # Set basic info with mock data if not available
        if basic_info is None:
            basic_info = {
                '总市值': '1000亿',
                '市盈率': '15.50',
                '市净率': '1.80',
                '行业': 'Mock Industry',
                '主营业务': 'Mock Business'
            }
    
    if financial_indicator_df is None or financial_indicator_df.empty:
        raise ValueError("无法获取财务数据 Cannot fetch financial data")
    
    # 计算评分
    score, reasons = calculate_fundamental_score(financial_indicator_df)
    
    # 整理财务指标
    financial_indicators = {}
    if financial_indicator_df is not None and not financial_indicator_df.empty:
        latest = financial_indicator_df.iloc[-1]
        
        metric_names = {
            'roe': 'ROE (%)',
            'gross_profit_margin': '毛利率 Gross Margin (%)',
            'net_profit_margin': '净利率 Net Margin (%)',
            'debt_to_assets': '资产负债率 Debt Ratio (%)',
            'current_ratio': '流动比率 Current Ratio',
            'quick_ratio': '速动比率 Quick Ratio',
            'roa': 'ROA (%)',
            'asset_turnover': '资产周转率 Asset Turnover',
            'operating_profit_margin': '营业利润率 Operating Margin (%)'
        }
        
        for key, name in metric_names.items():
            value = latest.get(key, 0)
            if value is not None and isinstance(value, (int, float)) and value > 0:
                if '%' in name:
                    financial_indicators[name] = f"{value:.2f}%"
                elif key == 'asset_turnover':
                    financial_indicators[name] = f"{value:.4f}"
                else:
                    financial_indicators[name] = f"{value:.2f}"
        
        # Add revenue and profit if available
        total_rev = latest.get('total_revenue', 0)
        net_prof = latest.get('net_profit', 0)
        if total_rev is not None and isinstance(total_rev, (int, float)) and total_rev > 0:
            financial_indicators['营业收入 Total Revenue'] = f"{total_rev/100000000:.2f}亿元"
        if net_prof is not None and isinstance(net_prof, (int, float)) and net_prof > 0:
            financial_indicators['净利润 Net Profit'] = f"{net_prof/100000000:.2f}亿元"
    
    # 整理基本信息
    basic_info_dict = {}
    if basic_info:
        key_fields = {
            '总市值': 'Total Market Cap',
            '流通市值': 'Circulating Market Cap',
            '市盈率(动)': 'PE Ratio',
            '市净率': 'PB Ratio',
            '行业': 'Industry',
            '主营业务': 'Main Business'
        }
        for cn, en in key_fields.items():
            if cn in basic_info and basic_info[cn]:
                basic_info_dict[f"{cn} {en}"] = basic_info[cn]
    
    # 评估结果
    if score >= 70:
        assessment = "基本面优秀，具有投资价值 Fundamental is excellent, has investment value"
    elif score >= 50:
        assessment = "基本面良好，可考虑投资 Fundamental is good, consider investing"
    elif score >= 30:
        assessment = "基本面一般，需要谨慎 Fundamental is average, be cautious"
    else:
        assessment = "基本面较弱，不建议投资 Fundamental is weak, not recommended"
    
    print(f"✅ 基本面分析完成！评分: {score}/100")
    print(f"   {assessment}")
    
    return {
        'stock_code': stock_code,
        'stock_name': stock_name,
        'basic_info': basic_info_dict or {},
        'financial_indicators': financial_indicators or {},
        'score': score,
        'reasons': reasons,
        'assessment': assessment,
        'markdown_report': generate_markdown_report(
            stock_code, stock_name,
            basic_info_dict or {}, financial_indicators or {},
            score, assessment
        )
    }


# =============================================================================
# 主函数 / Main Function
# =============================================================================

def main():
    """主函数 - 测试基本面分析"""
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
        results = run_fundamental_analysis(stock_code, stock_name)

        # 打印结果
        print(f"\n{'='*60}")
        print(f"基本面分析结果 / Fundamental Analysis Results")
        print(f"{'='*60}")
        print(f"\n基本面评分 Fundamental Score: {results['score']}/100")
        print(f"评估结果 Assessment: {results['assessment']}")

        if results['reasons']:
            print(f"\n亮点 Highlights:")
            for reason in results['reasons']:
                print(f"  ✓ {reason}")

    except Exception as e:
        print(f"分析失败 Analysis failed: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    main()
