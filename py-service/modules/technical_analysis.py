"""
技术分析模块
Technical Analysis Module

计算技术指标并分析未来走势
依赖 TA-Lib 进行专业技术分析
"""

import os
import numpy as np
import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from typing import Dict, Optional, Union
import warnings
warnings.filterwarnings('ignore')

import talib  # TA-Lib: 专业技术分析库


def safe_numeric(value, default=0.0):
    """
    安全地获取数值，如果值不是数值类型则返回默认值

    Args:
        value: 任意值
        default: 默认值

    Returns:
        float: 数值
    """
    if isinstance(value, (int, float, np.number)):
        return float(value)
    elif isinstance(value, dict):
        return default
    elif pd.isna(value):
        return default
    else:
        try:
            return float(value)
        except (ValueError, TypeError):
            return default


# 导入utils模块
try:
    from . import utils
except ImportError:
    import utils


# =============================================================================
# 技术指标计算 / Technical Indicator Calculation
# =============================================================================

def calculate_ma(df: pd.DataFrame, periods: list = [5, 10, 20, 60]) -> pd.DataFrame:
    """
    计算移动平均线（Moving Average，移动平均线）
    MA指标通过计算一段时间内价格的平均值来平滑价格波动
    """
    for period in periods:
        df[f'MA{period}'] = talib.SMA(df['close'], timeperiod=period)
    return df


def calculate_macd(df: pd.DataFrame, fastperiod: int = 12, slowperiod: int = 26, signalperiod: int = 9) -> pd.DataFrame:
    """
    计算MACD指标（Moving Average Convergence Divergence，指数平滑异同移动平均线）
    MACD由快线和慢线的离差值组成，用于判断趋势
    """
    df['MACD'], df['MACD_Signal'], df['MACD_Hist'] = talib.MACD(
        df['close'],
        fastperiod=fastperiod,
        slowperiod=slowperiod,
        signalperiod=signalperiod
    )
    return df

def calculate_rsi(df: pd.DataFrame, period: int = 14) -> pd.DataFrame:
    """
    计算RSI指标（Relative Strength Index，相对强弱指标）
    RSI衡量价格上涨和下跌的力度，范围0-100
    """
    df['RSI'] = talib.RSI(df['close'], timeperiod=period)
    return df


def calculate_bollinger_bands(df: pd.DataFrame, period: int = 20, nbdev: float = 2) -> pd.DataFrame:
    """
    计算布林带指标（Bollinger Bands，布林线）
    布林带由上轨、中轨、下轨组成，用于判断价格波动范围
    """
    df['BB_Upper'], df['BB_Middle'], df['BB_Lower'] = talib.BBANDS(
        df['close'],
        timeperiod=period,
        nbdevup=nbdev,
        nbdevdn=nbdev,
        matype=0
    )
    df['BB_Width'] = df['BB_Upper'] - df['BB_Lower']
    return df


def calculate_kdj(df: pd.DataFrame, n: int = 9, m1: int = 3, m2: int = 3) -> pd.DataFrame:
    """
    计算KDJ指标（Stochastic Oscillator，随机指标）
    KDJ通过计算最高价、最低价和收盘价的关系来判断超买超卖
    """
    low_list = df['low'].rolling(window=n, min_periods=1).min()
    high_list = df['high'].rolling(window=n, min_periods=1).max()
    rsv = (df['close'] - low_list) / (high_list - low_list) * 100
    df['K'] = rsv.ewm(com=m1-1, adjust=False).mean()
    df['D'] = df['K'].ewm(com=m2-1, adjust=False).mean()
    df['J'] = 3 * df['K'] - 2 * df['D']
    return df


def calculate_volume_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """计算成交量指标"""
    df['Volume_MA5'] = df['volume'].rolling(window=5).mean()
    df['Volume_MA10'] = df['volume'].rolling(window=10).mean()
    df['Volume_Ratio'] = df['volume'] / df['Volume_MA5']
    df['Price_Volume'] = (df['close'] - df['open']) * df['volume']
    return df


def calculate_atr(df: pd.DataFrame, period: int = 14) -> pd.DataFrame:
    """
    计算ATR指标（Average True Range，平均真实波幅）
    ATR量化价格波动幅度，用于风控与止损

    Args:
        df: 股票数据DataFrame，必须包含'high', 'low', 'close'列
        period: 计算周期，默认14

    Returns:
        包含ATR列的DataFrame

    ATR计算公式：
    TR = max(最高价-最低价, |最高价-前一日收盘价|, |最低价-前一日收盘价|)
    ATR = TR的N日指数移动平均

    用途：
    - 量化价格波动幅度
    - 设置止损位（通常使用ATR的2-3倍）
    - 评估波动风险
    """
    tr1 = df['high'] - df['low']
    tr2 = abs(df['high'] - df['close'].shift(1))
    tr3 = abs(df['low'] - df['close'].shift(1))
    tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    df['ATR'] = tr.ewm(span=period, adjust=False).mean()
    df['ATR_Ratio'] = df['ATR'] / df['close']  # ATR占价格的百分比
    return df


def calculate_turnover_rate(df: pd.DataFrame) -> pd.DataFrame:
    """
    计算换手率相关指标（Turnover Rate）
    反映市场关注度与流动性

    Args:
        df: 股票数据DataFrame，必须包含'turnover'列

    Returns:
        包含换手率指标列的DataFrame

    数据来源：akshare已提供turnover字段（单位：%）

    指标说明：
    - Turnover: 当日换手率
    - Turnover_MA5: 5日平均换手率
    - Turnover_MA20: 20日平均换手率
    - Turnover_Ratio: 当日换手率与5日均值的比值

    用途：
    - 判断市场热度
    - 评估流动性水平
    - 发现异常放量
    """
    if 'turnover' in df.columns:
        # 换手率已存在，计算相关指标
        df['Turnover_MA5'] = df['turnover'].rolling(window=5).mean()
        df['Turnover_MA20'] = df['turnover'].rolling(window=20).mean()
        # 避免除以0
        turnover_ma5_safe = df['Turnover_MA5'].copy()
        turnover_ma5_safe[turnover_ma5_safe == 0] = np.inf
        df['Turnover_Ratio'] = df['turnover'] / turnover_ma5_safe
    return df







def calculate_all_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """
    计算8个技术指标

    Args:
        df: 股票数据DataFrame

    Returns:
        包含所有指标的DataFrame
    """
    # 8个核心指标
    df = calculate_ma(df)
    df = calculate_macd(df)
    df = calculate_rsi(df)
    df = calculate_bollinger_bands(df)
    df = calculate_kdj(df)
    df = calculate_volume_indicators(df)
    df = calculate_atr(df)
    df = calculate_turnover_rate(df)

    return df


# =============================================================================
# 趋势分析 / Trend Analysis
# =============================================================================

def analyze_trend(df: pd.DataFrame, lookback_days: int = 20) -> Dict:
    """分析股票走势"""
    latest = df.iloc[-1]
    recent = df.tail(lookback_days)

    # 价格趋势 - 使用 safe_numeric 确保数值类型
    current_close = safe_numeric(latest['close'])
    prev_close = safe_numeric(df.iloc[-lookback_days]['close'])
    price_change = (current_close - prev_close) / prev_close * 100 if prev_close != 0 else 0

    # MA趋势分析
    ma_trend = {}
    ma_direction_count = 0  # 统计向上趋势的MA数量
    for period in [5, 10, 20, 60]:
        if f'MA{period}' in df.columns:
            current_ma = safe_numeric(latest[f'MA{period}'])
            prev_ma = safe_numeric(df.iloc[-lookback_days][f'MA{period}'])
            ma_change = (current_ma - prev_ma) / prev_ma * 100 if prev_ma != 0 else 0
            direction = 'up' if ma_change > 0 else 'down'
            ma_trend[f'MA{period}'] = {
                'current': current_ma,
                'change': ma_change,
                'direction': direction
            }
            if direction == 'up':
                ma_direction_count += 1

    # 判断MA整体信号
    ma_signal = 'neutral'
    ma_signal_cn = '中性'
    if ma_direction_count >= 3:
        ma_signal = 'bullish'
        ma_signal_cn = '多头排列'
    elif ma_direction_count <= 1:
        ma_signal = 'bearish'
        ma_signal_cn = '空头排列'

    # MACD分析
    macd_signal = 'neutral'
    macd_signal_cn = '中性'
    if 'MACD' in df.columns and 'MACD_Signal' in df.columns:
        if latest['MACD'] > latest['MACD_Signal'] and latest['MACD'] > 0:
            macd_signal = 'bullish'
            macd_signal_cn = '看涨'
        elif latest['MACD'] < latest['MACD_Signal'] and latest['MACD'] < 0:
            macd_signal = 'bearish'
            macd_signal_cn = '看跌'
        elif latest['MACD'] > latest['MACD_Signal']:
            macd_signal = 'weak_bullish'
            macd_signal_cn = '偏多'

    # RSI分析
    rsi_signal = 'neutral'
    rsi_signal_cn = '中性'
    if 'RSI' in df.columns:
        if latest['RSI'] > 70:
            rsi_signal = 'overbought'
            rsi_signal_cn = '超买（Overbought）'
        elif latest['RSI'] < 30:
            rsi_signal = 'oversold'
            rsi_signal_cn = '超卖（Oversold）'
        elif latest['RSI'] > 50:
            rsi_signal = 'bullish'
            rsi_signal_cn = '偏多（Bullish）'
        else:
            rsi_signal = 'bearish'
            rsi_signal_cn = '偏空（Bearish）'

    # KDJ分析
    kdj_signal = 'neutral'
    kdj_signal_cn = '中性'
    if 'K' in df.columns and 'D' in df.columns and 'J' in df.columns:
        k, d, j = latest['K'], latest['D'], latest['J']
        if j > 100:
            kdj_signal = 'overbought'
            kdj_signal_cn = '超买（Overbought）'
        elif j < 0:
            kdj_signal = 'oversold'
            kdj_signal_cn = '超卖（Oversold）'
        elif k > d:
            kdj_signal = 'bullish'
            kdj_signal_cn = '金叉（Bullish）'
        else:
            kdj_signal = 'bearish'
            kdj_signal_cn = '死叉（Bearish）'

    # 布林带分析
    bb_signal = 'neutral'
    bb_signal_cn = '中性'
    if 'BB_Upper' in df.columns and 'BB_Lower' in df.columns:
        bb_position = (latest['close'] - latest['BB_Lower']) / (latest['BB_Upper'] - latest['BB_Lower'])
        if bb_position > 0.8:
            bb_signal = 'near_upper'
            bb_signal_cn = '接近上轨'
        elif bb_position < 0.2:
            bb_signal = 'near_lower'
            bb_signal_cn = '接近下轨'
        else:
            bb_signal = 'middle'
            bb_signal_cn = '中轨区间'

    # 综合信号（8个指标：MA, MACD, RSI, KDJ, BOLL, ATR, VOL, 换手率）
    signals = [ma_signal, macd_signal, rsi_signal, kdj_signal, bb_signal]
    bullish_count = sum(1 for s in signals if 'bullish' in s or s in ['oversold', 'near_lower'])
    bearish_count = sum(1 for s in signals if 'bearish' in s or s in ['overbought', 'near_upper'])

    if bullish_count >= 2:
        overall_signal = 'bullish'
        overall_signal_cn = '看涨'
    elif bearish_count >= 2:
        overall_signal = 'bearish'
        overall_signal_cn = '看跌'
    else:
        overall_signal = 'neutral'
        overall_signal_cn = '中性'

    return {
        'price_change': price_change,
        'current_price': latest['close'],
        'ma_trend': ma_trend,
        'ma_signal': ma_signal,
        'ma_signal_cn': ma_signal_cn,
        'macd_signal': macd_signal,
        'macd_signal_cn': macd_signal_cn,
        'rsi_value': latest.get('RSI', None),
        'rsi_signal': rsi_signal,
        'rsi_signal_cn': rsi_signal_cn,
        'kdj_signal': kdj_signal,
        'kdj_signal_cn': kdj_signal_cn,
        'kdj_k': latest.get('K', None),
        'kdj_d': latest.get('D', None),
        'kdj_j': latest.get('J', None),
        'bb_signal': bb_signal,
        'bb_signal_cn': bb_signal_cn,
        # ATR指标
        'atr_value': latest.get('ATR', None),
        'atr_ratio': latest.get('ATR_Ratio', None),
        # VOL指标
        'volume': latest.get('volume', None),
        'volume_ma5': latest.get('Volume_MA5', None),
        'volume_ratio': latest.get('Volume_Ratio', None),
        # 换手率指标
        'turnover': latest.get('turnover', None),
        'turnover_ma5': latest.get('Turnover_MA5', None),
        'turnover_ratio': latest.get('Turnover_Ratio', None),
        'overall_signal': overall_signal,
        'overall_signal_cn': overall_signal_cn,
        # 信号统计（8个指标：MA, MACD, RSI, KDJ, BOLL）
        'signal_stats': {
            'buy': sum(1 for s in [ma_signal, macd_signal, rsi_signal, kdj_signal, bb_signal]
                     if any(sig in s for sig in ['bullish', 'weak_bullish', 'oversold', 'near_lower'])),
            'sell': sum(1 for s in [ma_signal, macd_signal, rsi_signal, kdj_signal, bb_signal]
                      if any(sig in s for sig in ['bearish', 'overbought', 'near_upper'])),
            'neutral': sum(1 for s in [ma_signal, macd_signal, rsi_signal, kdj_signal, bb_signal]
                            if s == 'neutral')
        }
    }


def predict_future_trend(df: pd.DataFrame, days_ahead: int = 5) -> Dict:
    """预测未来走势（基于技术指标）"""
    latest = df.iloc[-1]
    latest_close = safe_numeric(latest['close'])

    # 基于MA的趋势预测
    ma_prediction = {}
    for period in [5, 10, 20]:
        if f'MA{period}' in df.columns:
            ma_values = df[f'MA{period}'].tail(5)
            ma_last = safe_numeric(ma_values.iloc[-1])
            ma_first = safe_numeric(ma_values.iloc[0])
            slope = (ma_last - ma_first) / 4
            ma_prediction[f'MA{period}'] = {
                'direction': 'up' if slope > 0 else 'down',
                'strength': abs(slope) / latest_close * 100 if latest_close != 0 else 0
            }

    # 基于MACD的预测
    macd_prediction = 'neutral'
    macd_prediction_cn = '中性'
    if 'MACD' in df.columns and 'MACD_Hist' in df.columns:
        macd_hist = df['MACD_Hist'].tail(3)
        try:
            if all(macd_hist[i] > macd_hist[i-1] for i in range(1, len(macd_hist))):
                macd_prediction = 'bullish'
                macd_prediction_cn = '看涨'
            elif all(macd_hist[i] < macd_hist[i-1] for i in range(1, len(macd_hist))):
                macd_prediction = 'bearish'
                macd_prediction_cn = '看跌'
        except:
            pass

    # 支撑位和压力位 - 使用 safe_numeric
    recent_high = safe_numeric(df['high'].tail(20).max())
    recent_low = safe_numeric(df['low'].tail(20).min())
    current_price = latest_close

    # 简单的价格预测（基于近期波动）
    volatility = safe_numeric(df['close'].pct_change().tail(20).std())
    predicted_range = {
        'upper': current_price * (1 + volatility * 1.5),
        'middle': current_price,
        'lower': current_price * (1 - volatility * 1.5)
    }

    # 趋势强度评估 - 使用 safe_numeric
    trend_strength = 0
    if 'MA20' in df.columns and 'MA60' in df.columns:
        ma20_last = safe_numeric(latest['MA20'])
        ma60_last = safe_numeric(latest['MA60'])
        ma20_prev = safe_numeric(df['MA20'].iloc[-5])
        if ma20_last > ma60_last:
            trend_strength += 1
        if ma20_last > ma20_prev:
            trend_strength += 1

    return {
        'ma_prediction': ma_prediction,
        'macd_prediction': macd_prediction,
        'macd_prediction_cn': macd_prediction_cn,
        'support_level': recent_low,
        'resistance_level': recent_high,
        'predicted_range': predicted_range,
        'trend_strength': trend_strength,
        'volatility': volatility,
        'prediction_days': days_ahead
    }


# =============================================================================
# 图表绘制 / Chart Plotting
# =============================================================================

def create_plotly_chart(df: pd.DataFrame, stock_code: str) -> go.Figure:
    """
    创建Plotly交互式技术分析图表

    Args:
        df: 股票数据DataFrame
        stock_code: 股票代码

    Returns:
        Plotly Figure对象
    """
    fig = make_subplots(
        rows=4, cols=1,
        shared_xaxes=True,
        vertical_spacing=0.03,
        row_heights=[0.5, 0.15, 0.15, 0.2],
        subplot_titles=('股价走势 - Price Chart', 'MACD指标', 'RSI指标', '成交量 - Volume')
    )

    # 价格和均线
    fig.add_trace(
        go.Candlestick(
            x=df.index,
            open=df['open'],
            high=df['high'],
            low=df['low'],
            close=df['close'],
            name='K线'
        ), row=1, col=1
    )

    colors = ['blue', 'orange', 'purple', 'green']
    for i, period in enumerate([5, 10, 20, 60]):
        if f'MA{period}' in df.columns:
            fig.add_trace(
                go.Scatter(
                    x=df.index,
                    y=df[f'MA{period}'],
                    mode='lines',
                    name=f'MA{period}',
                    line=dict(color=colors[i])
                ), row=1, col=1
            )
    # 布林带
    if 'BB_Upper' in df.columns:
        fig.add_trace(
            go.Scatter(
                x=df.index,
                y=df['BB_Upper'],
                mode='lines',
                name='布林上轨',
                line=dict(color='rgba(0,0,0,0.3)'),
                fill=None
            ), row=1, col=1
        )
        fig.add_trace(
            go.Scatter(
                x=df.index,
                y=df['BB_Lower'],
                mode='lines',
                name='布林下轨',
                line=dict(color='rgba(0,0,0,0.3)'),
                fill='tonexty',
                fillcolor='rgba(0,0,0,0.1)'
            ), row=1, col=1
        )
    # MACD
    if 'MACD' in df.columns:
        fig.add_trace(
            go.Scatter(
                x=df.index,
                y=df['MACD'],
                mode='lines',
                name='MACD',
                line=dict(color='blue')
            ), row=2, col=1
        )
        fig.add_trace(
            go.Scatter(
                x=df.index,
                y=df['MACD_Signal'],
                mode='lines',
                name='Signal',
                line=dict(color='orange')
            ), row=2, col=1
        )
    # RSI
    if 'RSI' in df.columns:
        fig.add_trace(
            go.Scatter(
                x=df.index,
                y=df['RSI'],
                mode='lines',
                name='RSI',
                line=dict(color='purple')
            ), row=3, col=1
        )
        fig.add_hline(y=70, line_dash="dash", line_color="red", row=3, col=1)
        fig.add_hline(y=30, line_dash="dash", line_color="green", row=3, col=1)

    # 成交量
    colors_vol = ['red' if df['close'].iloc[i] >= df['open'].iloc[i] else 'green'
                  for i in range(len(df))]
    fig.add_trace(
        go.Bar(
            x=df.index,
            y=df['volume'],
            name='成交量',
            marker_color=colors_vol
        ), row=4, col=1
    )

    fig.update_layout(
        title=f'{stock_code} 技术分析',
        xaxis_rangeslider_visible=False,
        height=1200,
        showlegend=True
    )

    return fig


def save_chart(df: pd.DataFrame, stock_code: str, output_dir: str = None) -> str:
    """
    保存图表到HTML文件

    Args:
        df: 股票数据DataFrame
        stock_code: 股票代码
        output_dir: 输出目录

    Returns:
        保存的文件路径
    """
    from datetime import datetime

    if output_dir is None:
        output_dir = os.path.join(os.path.dirname(__file__), '..', 'output', 'charts')

    os.makedirs(output_dir, exist_ok=True)
    filename = f'{stock_code}_chart_{datetime.now().strftime("%Y%m%d")}.html'
    filepath = os.path.join(output_dir, filename)

    fig = create_plotly_chart(df, stock_code)
    fig.write_html(filepath)

    print(f"✓ 图表已保存至: {filepath}")
    return filepath


# =============================================================================
# Markdown报告生成 / Markdown Report Generation
# =============================================================================

def generate_markdown_report(
    stock_code: str,
    stock_name: str,
    df: pd.DataFrame
) -> str:
    """
    生成技术分析的Markdown报告

    Args:
        stock_code: 股票代码
        stock_name: 股票名称
        df: 股票数据DataFrame（包含已计算的指标）

    Returns:
        Markdown格式的报告字符串
    """
    # 分析趋势
    trend_analysis = analyze_trend(df)
    # 预测未来
    future_prediction = predict_future_trend(df)

    # 使用utils生成Markdown报告
    return utils.generate_technical_markdown_report(
        stock_code=stock_code,
        stock_name=stock_name,
        trend_analysis=trend_analysis,
        future_prediction=future_prediction
    )


# =============================================================================
# 完整分析流程 / Complete Analysis Workflow
# =============================================================================

def run_technical_analysis(
    stock_code: str,
    stock_name: str,
    df: pd.DataFrame
) -> Dict:
    """
    运行完整的技术分析流程

    Args:
        stock_code: 股票代码
        stock_name: 股票名称
        df: 股票数据DataFrame

    Returns:
        包含分析结果的字典
    """
    print(f"🔄 正在计算技术指标...")
    # 计算所有指标
    df = calculate_all_indicators(df)

    print(f"🔄 正在分析走势...")
    # 分析趋势
    trend_analysis = analyze_trend(df)

    print(f"🔄 正在预测未来走势...")
    # 预测未来
    future_prediction = predict_future_trend(df)

    print(f"✅ 技术分析完成！")

    return {
        'stock_code': stock_code,
        'stock_name': stock_name,
        'trend_analysis': trend_analysis,
        'future_prediction': future_prediction,
        'markdown_report': generate_markdown_report(stock_code, stock_name, df),
        'df': df  # 返回包含指标的DataFrame
    }


# =============================================================================
# 主函数 / Main Function
# =============================================================================

def main():
    """主函数 - 测试技术分析"""
    from .data_fetcher import load_config, load_data, fetch_stock_data, save_data
    from datetime import datetime, timedelta

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
    print(f"技术分析测试 / Technical Analysis Test")
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
        results = run_technical_analysis(stock_code, stock_name, df)

        # 打印结果
        print(f"\n{'='*60}")
        print(f"技术分析结果 / Technical Analysis Results")
        print(f"{'='*60}")
        print(f"\n综合信号 Overall Signal: {results['trend_analysis']['overall_signal_cn']}")
        print(f"当前价格 Current Price: {results['trend_analysis']['current_price']:.2f} 元")
        print(f"支撑位 Support Level: {results['future_prediction']['support_level']:.2f} 元")
        print(f"压力位 Resistance Level: {results['future_prediction']['resistance_level']:.2f} 元")

        # 保存图表
        save_chart(results['df'], stock_code)

        # 保存处理后的数据
        save_data(results['df'], stock_code, 'processed')

    except Exception as e:
        print(f"分析失败 Analysis failed: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    main()
