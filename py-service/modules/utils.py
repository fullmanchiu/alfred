"""
工具函数模块
Utility Functions Module
"""

import pandas as pd
import re
from typing import Dict, Tuple


def validate_stock_code(stock_code: str) -> Tuple[bool, str]:
    """
    验证股票代码格式

    Args:
        stock_code: 股票代码

    Returns:
        (是否有效, 错误信息)
    """
    # 检查是否为6位数字
    if not stock_code or len(stock_code) != 6:
        return False, "股票代码必须是6位数字"

    if not stock_code.isdigit():
        return False, "股票代码只能包含数字"

    # 检查股票代码前缀
    # 上海证券交易所：600, 601, 603, 605, 688, 689, 688
    # 深圳证券交易所：000, 001, 002, 003, 300, 301
    valid_prefixes = [
        # 上海
        '600', '601', '603', '605', '688', '689',
        # 深圳
        '000', '001', '002', '003', '300', '301'
    ]

    prefix = stock_code[:3]
    if prefix not in valid_prefixes:
        return False, f"股票代码前缀 {prefix} 不有效"

    return True, ""


def generate_technical_markdown_report(
    stock_code: str,
    stock_name: str,
    trend_analysis: Dict,
    future_prediction: Dict
) -> str:
    """
    生成技术分析的Markdown报告

    Args:
        stock_code: 股票代码
        stock_name: 股票名称
        trend_analysis: 趋势分析结果
        future_prediction: 未来预测结果

    Returns:
        Markdown格式的报告字符串
    """
    report = f"""
{'='*80}
股票技术分析报告 Stock Technical Analysis Report
{'='*80}

【基本信息 Basic Information】
股票代码 Stock Code：{stock_code}
股票名称 Stock Name：{stock_name}
当前价格 Current Price：{trend_analysis['current_price']:.2f} 元
近期涨跌 Recent Change：{trend_analysis['price_change']:+.2f}%

【技术指标分析 Technical Indicators Analysis】
1. 均线系统 Moving Average (MA) - 移动平均线
"""
    for ma, data in trend_analysis['ma_trend'].items():
        direction = '↑' if data.get('direction') == 'up' else '↓'
        report += f"   {ma}: {data.get('current', 'N/A')} ({direction} {data.get('change', 0):+.2f}%)\n"
    
    report += f"""
   说明：MA指标通过计算一段时间内价格的平均值来平滑价格波动
   Note: MA smooths price fluctuations by calculating average price over a period

2. MACD指标 MACD Indicator - 指数平滑异同移动平均线
   当前信号 Current Signal：{trend_analysis.get('macd_signal_cn', 'N/A')} ({trend_analysis.get('macd_signal', 'N/A')})
   未来预测 Future Prediction：{future_prediction.get('macd_prediction_cn', 'N/A')} ({future_prediction.get('macd_prediction', 'N/A')})
   
   说明：MACD由快线和慢线的离差值组成，用于判断趋势
   Note: MACD consists of divergence between fast and slow lines to determine trend

3. RSI指标 RSI Indicator - 相对强弱指标 Relative Strength Index
   当前值 Current Value：{trend_analysis.get('rsi_value', 'N/A')}
   信号 Signal：{trend_analysis.get('rsi_signal_cn', 'N/A')} ({trend_analysis.get('rsi_signal', 'N/A')})
   
   说明：RSI衡量价格上涨和下跌的力度，范围0-100
   Note: RSI measures strength of price gains/losses, range 0-100
   • RSI > 70: 超买区域 Overbought (股票可能超买，价格可能回调 Stock may be overbought)
   • RSI < 30: 超卖区域 Oversold (股票可能超卖，价格可能反弹 Stock may be oversold)

4. KDJ指标 KDJ Indicator - 随机指标 Stochastic Oscillator
   信号 Signal：{trend_analysis.get('kdj_signal_cn', 'N/A')} ({trend_analysis.get('kdj_signal', 'N/A')})
   
   说明：KDJ通过计算最高价、最低价和收盘价的关系来判断超买超卖
   Note: KDJ determines overbought/oversold by calculating relationship between high, low and close prices

5. 布林带 Bollinger Bands - 布林线
   信号 Signal：{trend_analysis.get('bb_signal_cn', 'N/A')} ({trend_analysis.get('bb_signal', 'N/A')})
   
   说明：布林带由上轨、中轨、下轨组成，用于判断价格波动范围
   Note: Bollinger Bands consist of upper, middle and lower rails to determine price fluctuation range

【核心指标 Core Indicators】
6. ATR指标（平均真实波幅）
   当前值 Current Value：{trend_analysis.get('atr_value', 'N/A')}
   ATR占比 ATR Ratio：{trend_analysis.get('atr_ratio', 'N/A')}
   信号 Signal：{trend_analysis.get('atr_signal_cn', 'N/A')} ({trend_analysis.get('atr_signal', 'N/A')})

   说明：ATR量化价格波动幅度，用于风控与止损
   Note: ATR quantifies price volatility, used for risk control and stop-loss

7. 换手率指标 Turnover Rate
   当前值 Current Value：{trend_analysis.get('turnover_value', 'N/A')}%
   换手率比 Turnover Ratio：{trend_analysis.get('turnover_ratio', 'N/A')}
   信号 Signal：{trend_analysis.get('turnover_signal_cn', 'N/A')} ({trend_analysis.get('turnover_signal', 'N/A')})

   说明：换手率反映市场关注度与流动性
   Note: Turnover rate reflects market attention and liquidity

【走势分析 Trend Analysis】
综合信号 Overall Signal：{trend_analysis.get('overall_signal_cn', 'N/A')} ({trend_analysis.get('overall_signal', 'N/A')})
"""

    # 根据综合信号生成操作建议
    if trend_analysis.get('overall_signal') == 'bullish':
        buy_count = trend_analysis.get('signal_stats', {}).get('buy', 0)
        if buy_count >= 6:
            report += "建议买入，多数技术指标支持上涨\n"
            report += "- 可考虑首次建仓20-30%仓位\n"
            report += "- 密切关注成交量变化，确认上涨动能\n"
        else:
            report += "建议关注，技术面偏多\n"
            report += "- 可小仓位试探性买入\n"
            report += "- 建议等待更多技术指标确认\n"
    elif trend_analysis.get('overall_signal') == 'bearish':
        sell_count = trend_analysis.get('signal_stats', {}).get('sell', 0)
        if sell_count >= 3:
            report += "建议卖出，多数技术指标支持下跌\n"
            report += "- 建议逐步减仓或清仓\n"
            report += "- 严格设置止损位，控制风险\n"
        else:
            report += "建议谨慎，技术面偏空\n"
            report += "- 不建议盲目加仓\n"
            report += "- 建议等待反弹后减仓\n"
    else:
        report += "建议观望，技术面中性\n"
        report += "- 当前多空力量较为均衡\n"
        report += "- 建议等待明确信号出现\n"
        report += "- 可考虑短线波段操作\n"
    
    report += f"""

【未来走势预测 Future Trend Prediction】
支撑位 Support Level：{future_prediction.get('support_level', 'N/A'):.2f} 元
压力位 Resistance Level：{future_prediction.get('resistance_level', 'N/A'):.2f} 元
预测区间 Predicted Range：
   上限 Upper：{future_prediction.get('predicted_range', {}).get('upper', 'N/A'):.2f} 元
   中枢 Middle：{future_prediction.get('predicted_range', {}).get('middle', 'N/A'):.2f} 元
   下限 Lower：{future_prediction.get('predicted_range', {}).get('lower', 'N/A'):.2f} 元
"""

    # 安全地获取波动率
    volatility = future_prediction.get('volatility', 0) or 0
    if isinstance(volatility, dict):
        volatility = 0
    trend_strength = future_prediction.get('trend_strength', 0) or 0
    if isinstance(trend_strength, dict):
        trend_strength = 0

    report += f"""
波动率 Volatility：{volatility*100:.2f}%
趋势强度 Trend Strength：{trend_strength}/2

【技术指标说明 Technical Indicators Guide】
• MA (Moving Average): 移动平均线 - 定趋势：判断多空方向与支撑阻力
• MACD: 异同移动平均线 - 测动量：衡量趋势强度，预警转折
• RSI: 相对强弱指标 - 看情绪：判断短期超买或超卖状态
• KDJ: 随机指标 - 抓灵敏：捕捉短期极值反转点
• Bollinger Bands: 布林带 - 观通道：提供动态价格波动区间与压力支撑
• VOL: 成交量 - 验真伪：确认价格变动背后的资金真实性
• ATR: 平均真实波幅 - 量波动：量化价格波幅，用于风控与止损
• Turnover Rate: 换手率 - 察热度：反映市场关注度与流动性

【风险提示 Risk Warning】
1. 技术分析仅供参考，不构成投资建议 Technical analysis is for reference only, not investment advice
2. 股市有风险，投资需谨慎 Stock market has risks, invest cautiously
3. 建议结合基本面分析综合判断 Combine with fundamental analysis for comprehensive judgment
4. 严格执行止损策略，控制风险 Strictly follow stop-loss strategy, control risk

{'='*80}
报告生成时间 Report Generated Time：{pd.Timestamp.now().strftime('%Y-%m-%d %H:%M:%S')}
{'='*80}
"""
    
    return report


def generate_fundamental_markdown_report(
    stock_code: str,
    stock_name: str,
    basic_info: Dict,
    financial_indicators: Dict,
    score: int,
    assessment: str
) -> str:
    """
    生成基本面分析的Markdown报告

    Args:
        stock_code: 股票代码
        stock_name: 股票名称
        basic_info: 基本信息
        financial_indicators: 财务指标
        score: 基本面评分
        assessment: 评估结果

    Returns:
        Markdown格式的报告字符串
    """
    report = f"""
{'='*80}
股票基本面分析报告 Stock Fundamental Analysis Report
{'='*80}

【基本信息 Basic Information】
股票代码 Stock Code：{stock_code}
股票名称 Stock Name：{stock_name}
"""

    # 添加基本信息
    if basic_info:
        if 'industry' in basic_info:
            report += f"所属行业 Industry：{basic_info.get('industry', 'N/A')}\n"
        if 'market_cap' in basic_info:
            report += f"总市值 Market Cap：{basic_info.get('market_cap', 'N/A')}\n"
        if 'pe_ttm' in basic_info:
            report += f"市盈率(PE) Price to Earnings：{basic_info.get('pe_ttm', 'N/A')}\n"
        if 'pb' in basic_info:
            report += f"市净率(PB) Price to Book：{basic_info.get('pb', 'N/A')}\n"

    report += f"""
【基本面评分 Fundamental Score】
评分 Score：{score}/100
评估 Assessment：{assessment}

"""

    # 添加财务指标
    if financial_indicators:
        report += """【财务指标 Financial Indicators】
"""

        if 'roe' in financial_indicators:
            report += f"净资产收益率 ROE：{financial_indicators.get('roe', 'N/A')}%\n"
        if 'gross_margin' in financial_indicators:
            report += f"毛利率 Gross Margin：{financial_indicators.get('gross_margin', 'N/A')}%\n"
        if 'net_margin' in financial_indicators:
            report += f"净利率 Net Margin：{financial_indicators.get('net_margin', 'N/A')}%\n"
        if 'debt_ratio' in financial_indicators:
            report += f"资产负债率 Debt Ratio：{financial_indicators.get('debt_ratio', 'N/A')}%\n"
        if 'current_ratio' in financial_indicators:
            report += f"流动比率 Current Ratio：{financial_indicators.get('current_ratio', 'N/A')}\n"
        if 'revenue_growth' in financial_indicators:
            report += f"营收增长率 Revenue Growth：{financial_indicators.get('revenue_growth', 'N/A')}%\n"
        if 'profit_growth' in financial_indicators:
            report += f"利润增长率 Profit Growth：{financial_indicators.get('profit_growth', 'N/A')}%\n"

    report += f"""
【投资建议 Investment Recommendation】
"""

    # 根据评分给出建议
    if score >= 80:
        report += "✓ 基本面优秀，可积极关注\n"
        report += "- 公司财务状况良好，盈利能力强\n"
        report += "- 建议作为长期投资标的\n"
        report += "- 可逢低逐步建仓\n"
    elif score >= 60:
        report += "✓ 基本面良好，可考虑投资\n"
        report += "- 公司财务状况稳定\n"
        report += "- 可适量配置仓位\n"
        report += "- 建议结合技术面选择买入时机\n"
    elif score >= 40:
        report += "⚠ 基本面一般，谨慎投资\n"
        report += "- 公司财务状况一般\n"
        report += "- 建议小仓位试探或观望\n"
        report += "- 需密切关注公司经营状况\n"
    else:
        report += "✗ 基本面较弱，不建议投资\n"
        report += "- 公司财务状况存在隐忧\n"
        report += "- 建议回避或等待改善\n"
        report += "- 严格控制仓位或不予配置\n"

    report += f"""
【风险提示 Risk Warning】
1. 基本面分析仅供参考，不构成投资建议 Fundamental analysis is for reference only
2. 股市有风险，投资需谨慎 Stock market has risks, invest cautiously
3. 建议结合技术分析和市场环境综合判断 Combine with technical analysis
4. 重点关注公司财报和行业动态 Focus on financial reports and industry trends

{'='*80}
报告生成时间 Report Generated Time：{pd.Timestamp.now().strftime('%Y-%m-%d %H:%M:%S')}
{'='*80}
"""

    return report
