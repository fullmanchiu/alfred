"""
风险管理模块
Risk Management Module

分析股票风险收益，包括概率估算、期望收益、止损策略、分批交易
"""

import pandas as pd
import numpy as np
from typing import Dict, Optional, List, Tuple
from datetime import datetime


# =============================================================================
# 概率估算 / Probability Estimation
# =============================================================================

def estimate_probability_technical(df: pd.DataFrame) -> Dict[str, float]:
    """
    基于技术指标估算概率
    
    Args:
        df: 股票数据DataFrame
    
    Returns:
        概率字典 {'bullish': 看涨概率, 'neutral': 中性概率, 'bearish': 看跌概率}
    """
    if df.empty:
        return {'bullish': 0.33, 'neutral': 0.34, 'bearish': 0.33}
    
    latest = df.iloc[-1]
    signals = []
    
    # MACD信号
    if 'MACD' in df.columns and 'MACD_Signal' in df.columns:
        if latest['MACD'] > latest['MACD_Signal']:
            signals.append(1)  # 看涨
        else:
            signals.append(-1)  # 看跌
    
    # RSI信号
    if 'RSI' in df.columns:
        if latest['RSI'] > 50:
            signals.append(1)
        else:
            signals.append(-1)
    
    # MA趋势信号
    if 'MA5' in df.columns and 'MA20' in df.columns:
        if latest['MA5'] > latest['MA20']:
            signals.append(1)
        else:
            signals.append(-1)
    
    # KDJ信号
    if 'K' in df.columns and 'D' in df.columns:
        if latest['K'] > latest['D']:
            signals.append(1)
        else:
            signals.append(-1)
    
    # 计算得分（-4到+4）
    total_score = sum(signals)
    
    # 转换为概率
    bullish_prob = max(0, min(1, (total_score + 4) / 8))
    bearish_prob = max(0, min(1, (4 - total_score) / 8))
    neutral_prob = 1 - bullish_prob - bearish_prob
    
    return {
        'bullish': bullish_prob,
        'neutral': neutral_prob,
        'bearish': bearish_prob
    }


def estimate_probability_bayesian(df: pd.DataFrame, window: int = 20) -> Dict[str, float]:
    """
    基于历史收益率分布估算概率（贝叶斯方法）
    
    Args:
        df: 股票数据DataFrame
        window: 回看窗口期
    
    Returns:
        概率字典
    """
    if len(df) < window:
        return {'bullish': 0.33, 'neutral': 0.34, 'bearish': 0.33, 'confidence': 0}
    
    # 计算日收益率
    returns = df['close'].pct_change().tail(window).dropna()
    
    # 定义涨跌阈值
    up_threshold = 0.02  # +2%
    down_threshold = -0.02  # -2%
    
    # 统计次数
    bullish_count = (returns > up_threshold).sum()
    bearish_count = (returns < down_threshold).sum()
    neutral_count = len(returns) - bullish_count - bearish_count
    
    # 使用拉普拉斯平滑
    bullish_prob = (bullish_count + 1) / (len(returns) + 3)
    bearish_prob = (bearish_count + 1) / (len(returns) + 3)
    neutral_prob = (neutral_count + 1) / (len(returns) + 3)
    
    # 置信度（基于样本大小）
    confidence = min(1.0, len(returns) / window)
    
    return {
        'bullish': bullish_prob,
        'neutral': neutral_prob,
        'bearish': bearish_prob,
        'confidence': confidence
    }


# =============================================================================
# 风险收益分析 / Risk-Reward Analysis
# =============================================================================

def build_risk_reward_table(
    df: pd.DataFrame,
    current_price: float
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    构建风险收益对比表
    
    Args:
        df: 股票数据DataFrame
        current_price: 当前价格
    
    Returns:
        (风险收益表DataFrame, 风险指标DataFrame）
    """
    # 计算关键价位
    support_level = df['low'].tail(20).min()
    resistance_level = df['high'].tail(20).max()
    
    # 估算概率（使用技术指标方法）
    prob_tech = estimate_probability_technical(df)
    
    # 计算波动率（年化）
    daily_returns = df['close'].pct_change().dropna()
    volatility = daily_returns.std() * np.sqrt(252)
    
    # 计算最大回撤
    cumulative = (1 + daily_returns).cumprod()
    running_max = cumulative.expanding().max()
    drawdown = (cumulative - running_max) / running_max
    max_drawdown = drawdown.min()
    
    # 构建情景
    scenarios = ['看涨至压力位', '看涨至中位', '中性维持', '下跌至支撑位']
    targets = [
        resistance_level,
        current_price * 1.10,
        current_price,
        support_level
    ]
    probabilities = [
        prob_tech['bullish'],
        prob_tech['neutral'] + prob_tech['bullish'] * 0.3,
        prob_tech['neutral'],
        prob_tech['bearish']
    ]
    
    data = []
    for scenario, target, prob in zip(scenarios, targets, probabilities):
        expected_return = (target - current_price) / current_price
        potential_loss = abs(expected_return) if expected_return < 0 else 0
        
        risk_reward_ratio = abs(expected_return / potential_loss) if potential_loss != 0 else np.inf
        
        data.append({
            '情景': scenario,
            '目标价位': f'{target:.2f}',
            '概率': f'{prob:.1%}',
            '预期收益': f'{expected_return:+.2%}',
            '潜在损失': f'{potential_loss:.2%}',
            '风险收益比': f'{risk_reward_ratio:.2f}'
        })
    
    df_table = pd.DataFrame(data)
    
    # 风险指标
    risk_metrics = {
        '指标': ['当前价格', '支撑位', '压力位', '年化波动率', '最大回撤'],
        '数值': [
            f'{current_price:.2f}',
            f'{support_level:.2f}',
            f'{resistance_level:.2f}',
            f'{volatility:.2%}',
            f'{max_drawdown:.2%}'
        ]
    }
    
    return df_table, pd.DataFrame(risk_metrics)


def calculate_expected_return(
    bullish_prob: float,
    bullish_return: float,
    neutral_prob: float,
    neutral_return: float,
    bearish_prob: float,
    bearish_return: float
) -> float:
    """
    计算加权期望收益
    
    Args:
        bullish_prob: 看涨概率
        bullish_return: 看涨时的收益率
        neutral_prob: 中性概率
        neutral_return: 中性时的收益率
        bearish_prob: 看跌概率
        bearish_return: 看跌时的收益率
    
    Returns:
        期望收益率
    """
    expected = (
        bullish_prob * bullish_return +
        neutral_prob * neutral_return +
        bearish_prob * bearish_return
    )
    return expected


# =============================================================================
# 止损策略 / Stop-Loss Strategy
# =============================================================================

def calculate_stop_loss_bollinger(
    df: pd.DataFrame,
    current_price: float,
    safety_margin: float = 1.02
) -> float:
    """
    基于布林带计算止损位
    
    Args:
        df: 股票数据DataFrame
        current_price: 当前价格
        safety_margin: 安全边际（1.02表示比布林下轨低2%）
    
    Returns:
        止损价格
    """
    if 'BB_Lower' not in df.columns:
        # 如果没有布林带，先计算
        period = 20
        df['BB_Middle'] = df['close'].rolling(window=period).mean()
        std = df['close'].rolling(window=period).std()
        df['BB_Lower'] = df['BB_Middle'] - (std * 2)
    
    bb_lower = df['BB_Lower'].iloc[-1]
    stop_loss = bb_lower / safety_margin
    
    return max(stop_loss, current_price * 0.95)  # 最多止损5%


def calculate_stop_loss_atr(
    df: pd.DataFrame,
    current_price: float,
    atr_multiplier: float = 2.0
) -> float:
    """
    基于ATR（真实波动幅度）计算止损位
    
    Args:
        df: 股票数据DataFrame
        current_price: 当前价格
        atr_multiplier: ATR倍数（通常使用2-3倍）
    
    Returns:
        止损价格
    """
    # 计算ATR
    tr1 = df['high'] - df['low']
    tr2 = abs(df['high'] - df['close'].shift(1))
    tr3 = abs(df['low'] - df['close'].shift(1))
    tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    atr = tr.ewm(span=14, adjust=False).mean()
    
    latest_atr = atr.iloc[-1]
    stop_loss = current_price - (latest_atr * atr_multiplier)
    
    return max(stop_loss, current_price * 0.90)  # 最多止损10%


def calculate_stop_loss_support(
    df: pd.DataFrame,
    current_price: float,
    lookback_period: int = 20
) -> float:
    """
    基于支撑位计算止损位
    
    Args:
        df: 股票数据DataFrame
        current_price: 当前价格
        lookback_period: 回看周期
    
    Returns:
        止损价格
    """
    support_level = df['low'].tail(lookback_period).min()
    stop_loss = support_level * 0.98  # 支撑位下方2%
    
    return stop_loss


def calculate_comprehensive_stop_loss(
    df: pd.DataFrame,
    current_price: float
) -> Dict[str, float]:
    """
    综合计算多个止损位
    
    Args:
        df: 股票数据DataFrame
        current_price: 当前价格
    
    Returns:
        包含多种止损位的字典
    """
    stop_losses = {
        '布林带止损': calculate_stop_loss_bollinger(df, current_price),
        'ATR止损': calculate_stop_loss_atr(df, current_price),
        '支撑位止损': calculate_stop_loss_support(df, current_price),
        '固定比例止损': current_price * 0.95  # 5%固定止损
    }
    
    # 选择最严格的止损（最高的止损价格）
    best_stop_loss = max(stop_losses.values())
    stop_losses['建议止损位'] = best_stop_loss
    
    return stop_losses


# =============================================================================
# 分批交易策略 / Batch Trading Strategy
# =============================================================================

def calculate_buying_strategy(
    current_price: float,
    levels: int = 3,
    price_drop_pct: float = 0.02
) -> List[Dict]:
    """
    计算分批买入策略（金字塔策略）
    
    Args:
        current_price: 当前价格
        levels: 分批次数
        price_drop_pct: 每次加仓跌幅
    
    Returns:
        买入计划列表
    """
    buy_plan = []
    
    # 分批比例：初期小，后期大（金字塔）
    if levels == 3:
        shares_pct = [0.3, 0.3, 0.4]  # 30%, 30%, 40%
    elif levels == 4:
        shares_pct = [0.2, 0.2, 0.3, 0.3]
    else:
        shares_pct = [1/levels] * levels
    
    for i in range(levels):
        buy_price = current_price * (1 - price_drop_pct * i)
        
        if levels == 3:
            ranges = ['第一买入区间(当前-5%)', '第二买入区间(下跌10%)', '第三买入区间(下跌15%)']
            positions = ['40-50%', '60-70%', '80-90%']
            reasons = [
                '当前价格处于历史低位区间，极具投资价值',
                '若股价回落至此，估值极具吸引力，深度价值投资机会',
                '该区间属于严重低估区域，极具配置价值'
            ]
        elif levels == 4:
            ranges = [f'第{i+1}区间', f'第{i+1}区间', f'第{i+1}区间', f'第{i+1}区间']
            positions = ['20%', '40%', '60%', '80%']
            reasons = ['逐级加仓'] * 4
        else:
            ranges = [f'第{i+1}区间'] * levels
            positions = [f'{int(shares_pct[i]*100)}%'] * levels
            reasons = ['逐级加仓'] * levels
        
        buy_plan.append({
            '区间': ranges[i],
            '目标价格': f'{buy_price:.2f}',
            '建议仓位': positions[i],
            '理由': reasons[i]
        })
    
    return buy_plan


def calculate_selling_strategy(
    current_price: float,
    avg_cost: float,
    levels: int = 2
) -> List[Dict]:
    """
    计算分批卖出策略
    
    Args:
        current_price: 当前价格
        avg_cost: 平均成本
        levels: 分批次数
    
    Returns:
        卖出计划列表
    """
    sell_plan = []
    
    if levels == 2:
        profit_targets = [0.15, 0.25]  # 15%, 25%
        ranges = ['减仓区间(上涨15-20%)', '清仓区间(上涨25%+)']
        actions = ['逢高减仓30%', '分批清仓']
        reasons = [
            '估值回升至合理区间，可部分获利了结',
            '估值修复完成，风险收益比趋于中性'
        ]
    else:
        profit_targets = [i * 0.1 for i in range(1, levels + 1)]
        ranges = [f'第{i+1}区间'] * levels
        actions = [f'卖出{int(i*100/levels)}%'] * levels
        reasons = ['逐级减仓'] * levels
    
    for i in range(levels):
        target_price = avg_cost * (1 + profit_targets[i])
        profit = (target_price - avg_cost) / avg_cost * 100
        
        sell_plan.append({
            '区间': ranges[i],
            '目标价格': f'{target_price:.2f}',
            '预期收益率': f'{profit:.2f}%',
            '操作建议': actions[i],
            '理由': reasons[i]
        })
    
    return sell_plan


# =============================================================================
# 完整分析流程 / Complete Analysis Workflow
# =============================================================================

def run_risk_analysis(
    stock_code: str,
    stock_name: str,
    df: pd.DataFrame
) -> Dict:
    """
    运行完整的风险分析流程
    
    Args:
        stock_code: 股票代码
        stock_name: 股票名称
        df: 股票数据DataFrame
    
    Returns:
        包含分析结果的字典
    """
    print(f"\n{'='*60}")
    print(f"风险管理分析 / Risk Management Analysis")
    print(f"{'='*60}")
    print(f"股票代码 Stock Code: {stock_code}")
    print(f"股票名称 Stock Name: {stock_name}")
    print(f"{'='*60}")
    
    current_price = df['close'].iloc[-1]
    
    # 构建风险收益表
    print(f"🔄 正在构建风险收益表...")
    risk_table, risk_metrics = build_risk_reward_table(df, current_price)
    
    # 估算概率
    print(f"🔄 正在估算概率...")
    prob_tech = estimate_probability_technical(df)
    prob_bayes = estimate_probability_bayesian(df)
    
    # 计算止损位
    print(f"🔄 正在计算止损位...")
    stop_losses = calculate_comprehensive_stop_loss(df, current_price)
    
    # 计算分批交易策略
    print(f"🔄 正在制定分批交易策略...")
    buy_strategy = calculate_buying_strategy(current_price)
    sell_strategy = calculate_selling_strategy(current_price, current_price * 0.95)  # 假设成本低于当前5%
    
    # 计算期望收益
    support_level = df['low'].tail(20).min()
    resistance_level = df['high'].tail(20).max()
    bullish_return = (resistance_level - current_price) / current_price
    bearish_return = (support_level - current_price) / current_price
    expected_return = calculate_expected_return(
        prob_tech['bullish'], bullish_return,
        prob_tech['neutral'], 0,
        prob_tech['bearish'], bearish_return
    )
    
    # 计算风险收益比
    potential_loss = abs(bearish_return)
    risk_reward_ratio = abs(bullish_return / potential_loss) if potential_loss != 0 else np.inf
    
    print(f"✅ 风险管理分析完成！")
    print(f"   期望收益: {expected_return:.2%}")
    print(f"   风险收益比: {risk_reward_ratio:.2f}")
    
    return {
        'stock_code': stock_code,
        'stock_name': stock_name,
        'current_price': current_price,
        'risk_table': risk_table,
        'risk_metrics': risk_metrics,
        'probabilities': {
            'technical': prob_tech,
            'bayesian': prob_bayes
        },
        'expected_return': expected_return,
        'risk_reward_ratio': risk_reward_ratio,
        'stop_losses': stop_losses,
        'buying_strategy': buy_strategy,
        'selling_strategy': sell_strategy,
        'support_level': support_level,
        'resistance_level': resistance_level,
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    }


# =============================================================================
# 主函数 / Main Function
# =============================================================================

def main():
    """主函数 - 测试风险管理"""
    try:
        from .data_fetcher import load_config, load_data, fetch_stock_data, save_data
        from datetime import datetime, timedelta
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
    
    print(f"{'='*60}")
    print(f"风险管理分析测试 / Risk Management Analysis Test")
    print(f"{'='*60}")
    
    # 尝试加载已有数据
    df = load_data(stock_code, 'raw')
    
    if df is None:
        print(f"未找到历史数据，正在获取...")
        end_date = datetime.now()
        start_date = end_date - timedelta(days=5*365)
        
        try:
            df = fetch_stock_data(
                stock_code=stock_code,
                start_date=start_date.strftime('%Y-%m-%d'),
                end_date=end_date.strftime('%Y-%m-%d')
            )
            save_data(df, stock_code, 'raw')
        except Exception as e:
            print(f"获取数据失败 Failed to fetch data: {e}")
            return
    
    # 运行分析
    try:
        results = run_risk_analysis(stock_code, stock_name, df)
        
        # 打印结果
        print(f"\n{'='*60}")
        print(f"风险管理分析结果 / Risk Management Results")
        print(f"{'='*60}")
        print(f"\n当前价格 Current Price: {results['current_price']:.2f} 元")
        print(f"期望收益 Expected Return: {results['expected_return']:.2%}")
        print(f"风险收益比 Risk/Reward Ratio: {results['risk_reward_ratio']:.2f}")
        print(f"建议止损位 Stop Loss: {results['stop_losses']['建议止损位']:.2f} 元")
        
    except Exception as e:
        print(f"分析失败 Analysis failed: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    main()
