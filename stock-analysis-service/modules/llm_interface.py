"""
大模型接口模块
LLM Interface Module

将分析结果格式化为OpenAI兼容的JSON格式，便于大模型使用
"""

import json
import pandas as pd
from typing import Dict, Optional, List, Any
from datetime import datetime


def format_for_llm(
    stock_code: str,
    stock_name: str,
    technical_results: Optional[Dict] = None,
    valuation_results: Optional[Dict] = None,
    risk_results: Optional[Dict] = None,
    historical_data: Optional[pd.DataFrame] = None
) -> Dict[str, Any]:
    """
    将分析结果格式化为大模型可用的JSON
    
    Args:
        stock_code: 股票代码
        stock_name: 股票名称
        technical_results: 技术分析结果
        valuation_results: 估值分析结果
        risk_results: 风险分析结果
        historical_data: 历史数据DataFrame
    
    Returns:
        结构化的JSON字典
    """
    
    data = {
        'stock_info': {
            'code': stock_code,
            'name': stock_name,
            'analysis_date': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        },
        'technical_analysis': {},
        'valuation_analysis': {},
        'risk_analysis': {}
    }
    
    # 技术面数据
    if technical_results:
        trend = technical_results.get('trend_analysis', {})
        df = technical_results.get('df')
        
        # 技术指标
        indicators = {}
        if 'MA5' in df.columns:
            indicators['MA'] = {
                'MA5': float(df['MA5'].iloc[-1]),
                'MA10': float(df['MA10'].iloc[-1]),
                'MA20': float(df['MA20'].iloc[-1]),
                'MA60': float(df['MA60'].iloc[-1]),
                'signal': 'buy' if trend.get('ma_trend', {}).get('MA20', {}).get('direction') == 'up' else 'sell',
                'description': '价格位于所有均线之上，形成多头排列' if trend.get('ma_trend', {}).get('MA20', {}).get('direction') == 'up' else '价格位于均线之下'
            }
        
        if 'MACD' in df.columns:
            indicators['MACD'] = {
                'DIF': float(df['MACD'].iloc[-1]),
                'DEA': float(df['MACD_Signal'].iloc[-1]),
                'signal': trend.get('macd_signal', 'neutral'),
                'description': f"DIF({trend.get('macd_signal_cn', 'N/A')})"
            }
        
        if 'RSI' in df.columns:
            indicators['RSI'] = {
                'value': float(df['RSI'].iloc[-1]),
                'signal': trend.get('rsi_signal', 'neutral'),
                'description': trend.get('rsi_signal_cn', 'N/A')
            }
        
        # 新增指标
        if 'BIAS_20' in df.columns:
            indicators['BIAS'] = {
                'BIAS_20': float(df['BIAS_20'].iloc[-1]),
                'signal': trend.get('bias_signal', 'neutral'),
                'description': trend.get('bias_signal_cn', 'N/A')
            }
        
        if 'WR' in df.columns:
            indicators['WR'] = {
                'value': float(df['WR'].iloc[-1]),
                'signal': trend.get('wr_signal', 'neutral'),
                'description': trend.get('wr_signal_cn', 'N/A')
            }
        
        if 'VR' in df.columns:
            indicators['VR'] = {
                'value': float(df['VR'].iloc[-1]),
                'signal': trend.get('vr_signal', 'neutral'),
                'description': trend.get('vr_signal_cn', 'N/A')
            }
        
        if 'PDI' in df.columns:
            indicators['DMI'] = {
                'PDI': float(df['PDI'].iloc[-1]),
                'MDI': float(df['MDI'].iloc[-1]),
                'ADX': float(df['ADX'].iloc[-1]),
                'ADXR': float(df['ADXR'].iloc[-1]),
                'signal': trend.get('dmi_signal', 'neutral'),
                'description': trend.get('dmi_signal_cn', 'N/A')
            }
        
        if 'SAR' in df.columns:
            indicators['SAR'] = {
                'value': float(df['SAR'].iloc[-1]),
                'signal': trend.get('sar_signal', 'neutral'),
                'description': trend.get('sar_signal_cn', 'N/A')
            }
        
        if 'CCI' in df.columns:
            indicators['CCI'] = {
                'value': float(df['CCI'].iloc[-1]),
                'signal': trend.get('cci_signal', 'neutral'),
                'description': trend.get('cci_signal_cn', 'N/A')
            }
        
        data['technical_analysis'] = {
            'indicators': indicators,
            'signal_stats': trend.get('signal_stats', {}),
            'overall_signal': trend.get('overall_signal', 'neutral'),
            'overall_signal_cn': trend.get('overall_signal_cn', '中性'),
            'current_price': float(trend.get('current_price', 0)),
            'support_level': float(technical_results.get('future_prediction', {}).get('support_level', 0)),
            'resistance_level': float(technical_results.get('future_prediction', {}).get('resistance_level', 0))
        }
    
    # 基本面估值数据
    if valuation_results:
        pe = valuation_results.get('pe', {})
        pb = valuation_results.get('pb', {})
        dividend = valuation_results.get('dividend', {})
        peg = valuation_results.get('peg', {})
        ps = valuation_results.get('ps', {})
        comp_score = valuation_results.get('comprehensive_score', {})
        
        data['valuation_analysis'] = {
            'PE': {
                'current': pe.get('data', {}).get('current', None),
                'evaluation': pe.get('evaluation', {}),
                'score': pe.get('evaluation', {}).get('score', 0),
                'description': pe.get('evaluation', {}).get('evaluation_cn', 'N/A')
            },
            'PB': {
                'current': pb.get('data', {}).get('current', None),
                'evaluation': pb.get('evaluation', {}),
                'score': pb.get('evaluation', {}).get('score', 0),
                'description': pb.get('evaluation', {}).get('evaluation_cn', 'N/A')
            },
            'Dividend_Yield': {
                'current': dividend.get('data', {}).get('current', None),
                'evaluation': dividend.get('evaluation', {}),
                'score': dividend.get('evaluation', {}).get('score', 0),
                'description': dividend.get('evaluation', {}).get('evaluation_cn', 'N/A')
            },
            'PEG': {
                'current': peg.get('data', {}).get('current', None),
                'evaluation': peg.get('evaluation', {}),
                'score': peg.get('evaluation', {}).get('score', 0),
                'description': peg.get('evaluation', {}).get('evaluation_cn', 'N/A')
            },
            'PS': {
                'current': ps.get('data', {}).get('current', None),
                'evaluation': ps.get('evaluation', {}),
                'score': ps.get('evaluation', {}).get('score', 0),
                'description': ps.get('evaluation', {}).get('evaluation_cn', 'N/A')
            },
            'comprehensive_score': {
                'total_score': comp_score.get('total_score', 0),
                'rating': comp_score.get('rating', 'N/A'),
                'recommendation': comp_score.get('recommendation', 'N/A'),
                'detail_scores': comp_score.get('detail_scores', {})
            }
        }
    
    # 风险收益分析数据
    if risk_results:
        scenarios = []
        if 'risk_table' in risk_results and not risk_results['risk_table'].empty:
            for _, row in risk_results['risk_table'].iterrows():
                scenarios.append({
                    'scenario': row['情景'],
                    'target_price': float(row['目标价位'].replace('元', '')) if '目标价位' in row and 'N/A' not in row['目标价位'] else None,
                    'probability': float(row['概率'].replace('%', '')) / 100 if '概率' in row and 'N/A' not in row['概率'] else None,
                    'expected_return': float(row['预期收益'].replace('%', '')) / 100 if '预期收益' in row and 'N/A' not in row['预期收益'] else None,
                    'potential_loss': float(row['潜在损失'].replace('%', '')) / 100 if '潜在损失' in row and 'N/A' not in row['潜在损失'] else None,
                    'risk_reward_ratio': float(row['风险收益比'].replace('N/A', 'inf')) if '风险收益比' in row else None
                })
        
        data['risk_analysis'] = {
            'scenarios': scenarios,
            'expected_return': risk_results.get('expected_return', 0),
            'risk_reward_ratio': risk_results.get('risk_reward_ratio', 0),
            'stop_loss': risk_results.get('stop_losses', {}).get('建议止损位', None),
            'buying_strategy': risk_results.get('buying_strategy', []),
            'selling_strategy': risk_results.get('selling_strategy', []),
            'support_level': risk_results.get('support_level', None),
            'resistance_level': risk_results.get('resistance_level', None),
            'current_price': risk_results.get('current_price', None)
        }
    
    # 历史数据
    if historical_data is not None and not historical_data.empty:
        data['historical_data'] = {
            'dates': list(historical_data.index.strftime('%Y-%m-%d')),
            'prices': {
                'open': [float(x) for x in historical_data['open'].tolist()],
                'high': [float(x) for x in historical_data['high'].tolist()],
                'low': [float(x) for x in historical_data['low'].tolist()],
                'close': [float(x) for x in historical_data['close'].tolist()],
                'volume': [int(x) for x in historical_data['volume'].tolist()]
            }
        }
    
    return data


def generate_llm_prompt(
    stock_code: str,
    stock_name: str,
    analysis_data: Dict
) -> str:
    """
    生成大模型Prompt
    
    Args:
        stock_code: 股票代码
        stock_name: 股票名称
        analysis_data: 分析结果字典
    
    Returns:
        Prompt字符串
    """
    
    stock_info = analysis_data.get('stock_info', {})
    technical = analysis_data.get('technical_analysis', {})
    valuation = analysis_data.get('valuation_analysis', {})
    risk = analysis_data.get('risk_analysis', {})
    
    prompt = f"""请基于以下数据分析股票 {stock_name} ({stock_code}) 的投资价值，并提供详细的投资建议。

## 当前状况
- 股票代码: {stock_code}
- 股票名称: {stock_name}
- 当前价格: {technical.get('current_price', 'N/A')}元
- 分析时间: {stock_info.get('analysis_date', 'N/A')}

## 技术面分析
- 综合信号: {technical.get('overall_signal_cn', 'N/A')} ({technical.get('overall_signal', 'N/A')})
- 当前价格: {technical.get('current_price', 'N/A')}元
- 支撑位: {technical.get('support_level', 'N/A')}元
- 压力位: {technical.get('resistance_level', 'N/A')}元
"""

    # 添加关键指标信息
    indicators = technical.get('indicators', {})
    if 'MA' in indicators:
        prompt += f"""
### MA（移动平均线）
- MA5: {indicators['MA']['MA5']}元
- MA10: {indicators['MA']['MA10']}元
- MA20: {indicators['MA']['MA20']}元
- MA60: {indicators['MA']['MA60']}元
- 信号: {indicators['MA']['signal_cn']}
- 说明: {indicators['MA']['description']}
"""

    if 'MACD' in indicators:
        prompt += f"""
### MACD（指数平滑异同移动平均线）
- DIF: {indicators['MACD']['DIF']}
- DEA: {indicators['MACD']['DEA']}
- 信号: {indicators['MACD']['signal_cn']}
- 说明: {indicators['MACD']['description']}
"""

    if 'RSI' in indicators:
        prompt += f"""
### RSI（相对强弱指标）
- RSI值: {indicators['RSI']['value']:.2f}
- 信号: {indicators['RSI']['signal_cn']}
- 说明: {indicators['RSI']['description']}
"""

    if 'DMI' in indicators:
        prompt += f"""
### DMI（趋向指标）
- PDI: {indicators['DMI']['PDI']:.2f}
- MDI: {indicators['DMI']['MDI']:.2f}
- ADX: {indicators['DMI']['ADX']:.2f}
- 信号: {indicators['DMI']['signal_cn']}
- 说明: {indicators['DMI']['description']}
"""

    # 信号统计
    signal_stats = technical.get('signal_stats', {})
    if signal_stats:
        prompt += f"""
### 技术信号统计
- 买入信号: {signal_stats.get('buy', 0)}个
- 卖出信号: {signal_stats.get('sell', 0)}个
- 中性信号: {signal_stats.get('neutral', 0)}个
"""

    # 基本面估值
    if valuation:
        prompt += f"""

## 基本面估值
"""
        pe = valuation.get('PE', {})
        pb = valuation.get('PB', {})
        dividend = valuation.get('Dividend_Yield', {})
        comp_score = valuation.get('comprehensive_score', {})
        
        if pe.get('current'):
            prompt += f"""
### PE（市盈率）
- 当前PE: {pe['current']:.2f}倍
- 评估: {pe['evaluation'].get('evaluation_cn', 'N/A')}
- 评分: {pe['evaluation'].get('score', 0)}/5
"""
        
        if pb.get('current'):
            prompt += f"""
### PB（市净率）
- 当前PB: {pb['current']:.2f}倍
- 评估: {pb['evaluation'].get('evaluation_cn', 'N/A')}
- 评分: {pb['evaluation'].get('score', 0)}/4
"""

        # 安全地获取股息率
        dividend_current = dividend.get('current')
        if dividend_current and isinstance(dividend_current, (int, float)):
            prompt += f"""
### 股息率
- 当前股息率: {dividend_current*100:.2f}%
- 评估: {dividend.get('evaluation', {}).get('evaluation_cn', 'N/A')}
- 评分: {dividend.get('evaluation', {}).get('score', 0)}/4
"""
        
        if comp_score.get('total_score'):
            prompt += f"""
### 综合估值评分
- 总分: {comp_score['total_score']}/100
- 评级: {comp_score.get('rating', 'N/A')}
- 建议: {comp_score.get('recommendation', 'N/A')}
"""

    # 风险收益分析
    if risk:
        prompt += f"""

## 风险收益分析
- 期望收益: {risk['expected_return']:.2%}
- 风险收益比: {risk['risk_reward_ratio']:.2f}
- 建议止损位: {risk['stop_loss']:.2f}元
"""

        scenarios = risk.get('scenarios', [])
        if scenarios:
            prompt += """
### 风险收益情景
"""
            for scenario in scenarios[:3]:  # 只取前3个
                prompt += f"""
- {scenario['scenario']}: 目标价{scenario['target_price']}元, 概率{scenario['probability']:.0%}, 预期收益{scenario['expected_return']:+.2%}
"""

    prompt += """

## 请回答以下问题：

1. **总体投资评级**
   - 给出明确的评级：强烈买入/买入/持有/卖出/强烈卖出
   - 评级理由（2-3句话）
   - 星级评分（1-5星）

2. **详细的买卖操作建议**
   - 买入：具体的价格区间、仓位比例、建仓方式
   - 持有：中短期和长期目标价位、预期收益
   - 卖出：分批止盈的价格区间、操作方式
   - 止损：明确的止损价位和止损理由

3. **主要风险提示**
   - 列出3-5个主要风险点
   - 每个风险给出简要的应对策略

4. **综合投资建议**
   - 基于技术面、基本面、风险面的综合判断
   - 给出明确的操作建议和理由
   - 特别关注的风险点和机会点

请提供详细、客观、专业的分析报告，使用简洁易懂的语言，避免专业术语堆砌。
"""

    return prompt


def save_llm_data(
    stock_code: str,
    stock_name: str,
    analysis_data: Dict,
    output_dir: str = None
) -> str:
    """
    保存LLM数据到JSON文件
    
    Args:
        stock_code: 股票代码
        stock_name: 股票名称
        analysis_data: 分析结果字典
        output_dir: 输出目录
    
    Returns:
        保存的文件路径
    """
    import os
    
    if output_dir is None:
        output_dir = os.path.join(os.path.dirname(__file__), '..', 'output', 'reports')
    
    os.makedirs(output_dir, exist_ok=True)
    
    # 格式化为LLM格式
    llm_data = format_for_llm(
        stock_code,
        stock_name,
        technical_results=analysis_data.get('technical_results'),
        valuation_results=analysis_data.get('valuation_results'),
        risk_results=analysis_data.get('risk_results'),
        historical_data=analysis_data.get('historical_data')
    )
    
    filename = f'{stock_code}_llm_data_{datetime.now().strftime("%Y%m%d")}.json'
    filepath = os.path.join(output_dir, filename)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(llm_data, f, ensure_ascii=False, indent=2)
    
    print(f"✓ LLM数据已保存至: {filepath}")
    
    return filepath


def save_llm_prompt(
    stock_code: str,
    stock_name: str,
    analysis_data: Dict,
    output_dir: str = None
) -> str:
    """
    保存LLM Prompt到文本文件
    
    Args:
        stock_code: 股票代码
        stock_name: 股票名称
        analysis_data: 分析结果字典
        output_dir: 输出目录
    
    Returns:
        保存的文件路径
    """
    import os
    
    if output_dir is None:
        output_dir = os.path.join(os.path.dirname(__file__), '..', 'output', 'reports')
    
    os.makedirs(output_dir, exist_ok=True)
    
    prompt = generate_llm_prompt(stock_code, stock_name, analysis_data)
    
    filename = f'{stock_code}_llm_prompt_{datetime.now().strftime("%Y%m%d")}.txt'
    filepath = os.path.join(output_dir, filename)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(prompt)
    
    print(f"✓ LLM Prompt已保存至: {filepath}")
    
    return filepath


# =============================================================================
# 主函数 / Main Function
# =============================================================================

def main():
    """主函数 - 测试LLM接口"""
    print("LLM接口测试 / LLM Interface Test")
    print("=" * 60)
    
    # 模拟数据
    import pandas as pd
    
    # 创建模拟历史数据
    dates = pd.date_range(start='2025-01-01', periods=100, freq='D')
    np.random.seed(42)
    
    historical_data = pd.DataFrame({
        'date': dates,
        'open': np.random.uniform(100, 150, size=100),
        'high': np.random.uniform(100, 150, size=100),
        'low': np.random.uniform(100, 150, size=100),
        'close': np.random.uniform(100, 150, size=100),
        'volume': np.random.randint(100000, 1000000, size=100)
    })
    historical_data.set_index('date', inplace=True)
    
    # 模拟分析结果
    analysis_data = {
        'stock_code': '000596',
        'stock_name': '古井贡酒',
        'technical_results': {
            'trend_analysis': {
                'current_price': 135.99,
                'signal_stats': {'buy': 6, 'sell': 0, 'neutral': 4},
                'overall_signal': 'bullish',
                'overall_signal_cn': '看涨'
            },
            'future_prediction': {
                'support_level': 125.00,
                'resistance_level': 170.00
            }
        },
        'valuation_results': {
            'pe': {'data': {'current': 15.19}},
            'pb': {'data': {'current': 2.82}},
            'dividend': {'data': {'current': 0.0404}},
            'peg': {'data': {'current': 1.2}},
            'ps': {'data': {'current': 3.43}},
            'comprehensive_score': {
                'total_score': 85,
                'rating': '优秀',
                'recommendation': '强烈推荐'
            }
        },
        'risk_results': {
            'current_price': 135.99,
            'support_level': 125.00,
            'resistance_level': 170.00,
            'expected_return': 0.1012,
            'risk_reward_ratio': 1.8,
            'stop_losses': {'建议止损位': 125.00},
            'buying_strategy': [
                {'区间': '130-136', '目标价格': '133.00', '建议仓位': '40-50%'},
                {'区间': '120-130', '目标价格': '125.00', '建议仓位': '60-70%'},
                {'区间': '110-120', '目标价格': '115.00', '建议仓位': '80-90%'}
            ]
        },
        'historical_data': historical_data
    }
    
    # 生成LLM数据
    print("🔄 正在生成LLM数据...")
    llm_data = format_for_llm('000596', '古井贡酒', analysis_data)
    
    print("\n✅ LLM数据生成完成！")
    print(f"数据项数: {len(llm_data)}")
    print(f"股票信息: {llm_data['stock_info']}")
    print(f"技术分析: {len(llm_data.get('technical_analysis', {}))}个指标")
    print(f"基本面估值: {len(llm_data.get('valuation_analysis', {}))}个指标")
    print(f"风险分析: {len(llm_data.get('risk_analysis', {}))}个情景")
    
    # 保存文件
    print("\n🔄 正在保存文件...")
    json_file = save_llm_data('000596', '古井贡酒', analysis_data)
    prompt_file = save_llm_prompt('000596', '古井贡酒', analysis_data)
    
    print(f"\n✓ LLM数据已保存: {json_file}")
    print(f"✓ LLM Prompt已保存: {prompt_file}")


if __name__ == '__main__':
    main()
