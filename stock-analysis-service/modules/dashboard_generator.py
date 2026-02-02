"""
数据看板生成器模块
生成Tab 1数据看板的HTML，包含3个卡片（个股信息、技术指标、财务指标）

注意：增减持信息卡片已移除（AkShare无稳定API）
"""

from typing import Dict, List


class DashboardGenerator:
    """数据看板生成器"""

    def _format_display(self, value, unit='', decimal_places=2) -> str:
        """
        格式化显示值：将N/A、None等转换为"暂无"，有数据时带单位

        Args:
            value: 任意值
            unit: 可选单位（只有数值存在时才添加）
            decimal_places: 小数位数（默认2位）

        Returns:
            格式化后的字符串，如"15.5"、"15.5%"、"暂无"
        """
        # 没有数据时显示"暂无"
        if value is None or value == 'N/A':
            return '暂无'

        # 有数据时，格式化数值并添加单位
        if isinstance(value, (int, float)):
            if unit == '%':
                return f"{value:.{decimal_places}f}%"
            elif unit:
                return f"{value}{unit}"
            else:
                return f"{value:.{decimal_places}f}"

        # 如果是字符串，尝试转换为数值再格式化
        if isinstance(value, str):
            try:
                num_val = float(value)
                if unit == '%':
                    return f"{num_val:.{decimal_places}f}%"
                elif unit:
                    return f"{num_val}{unit}"
                else:
                    return f"{num_val:.{decimal_places}f}"
            except (ValueError, TypeError):
                pass

        return str(value)

    def generate(self, stock_data: Dict) -> str:
        """
        生成完整数据看板HTML（包含3个卡片：个股信息、技术指标、财务指标）

        增减持信息卡片已移除（AkShare无相关API）

        Args:
            stock_data: 包含所有数据的字典

        Returns:
            HTML字符串
        """
        html = "<div style='padding: 20px;'>"

        # 生成3个卡片
        html += self._generate_stock_info_card(
            stock_data.get('info', {}),
            stock_data.get('quote', {})
        )

        html += self._generate_technical_card(
            stock_data.get('indicators', {}),
            stock_data.get('indicators_interpretation', {})
        )

        html += self._generate_financial_card(
            stock_data.get('financial', {})
        )

        html += "</div>"
        return html

    def _generate_stock_info_card(self, info: Dict, quote: Dict) -> str:
        """生成个股信息卡片"""
        # 检测是否有实时数据（使用is_realtime标记）
        has_realtime_data = quote.get('is_realtime', False)

        # 直接使用数据值（已经是"暂无"或实际值）
        current_price = quote.get('current_price', '暂无')

        # 涨跌幅：有实时数据时才显示带颜色和箭头
        change_pct = quote.get('change_pct')
        if has_realtime_data and isinstance(change_pct, (int, float)):
            change_color = "#F5222D" if change_pct > 0 else "#52C41A" if change_pct < 0 else "#8C8C8C"
            change_arrow = "↑" if change_pct > 0 else "↓" if change_pct < 0 else "-"
            change_display = f"{change_arrow} {change_pct:.2f}%"
        else:
            change_color = "#8C8C8C"
            change_display = "暂无"

        # 其他字段直接使用原始值
        open_val = quote.get('open', '暂无')
        pre_close = quote.get('pre_close', '暂无')
        high_val = quote.get('high', '暂无')
        low_val = quote.get('low', '暂无')

        # 成交量：有实时数据时才格式化数字
        volume = quote.get('volume')
        if has_realtime_data and isinstance(volume, (int, float)):
            volume_display = self._format_number(volume)
        else:
            volume_display = "暂无"

        # 换手率：有实时数据时才显示%
        turnover = quote.get('turnover')
        if has_realtime_data and isinstance(turnover, (int, float)):
            turnover_display = f"{turnover:.2f}%"
        else:
            turnover_display = "暂无"

        # 生成提示条（如果没有实时数据）
        info_banner = ""
        if not has_realtime_data:
            info_banner = """
            <div style='background: #FFFBE6; border-left: 3px solid #FA8C16; padding: 10px 12px; margin-bottom: 12px; border-radius: 4px; font-size: 13px; color: #874600;'>
                <div style='display: flex; align-items: center; gap: 8px;'>
                    <span style='font-size: 16px;'>💡</span>
                    <span>
                        <strong>提示：</strong>当前显示为历史数据（非实时）。如需查看实时行情，请勾选左侧"获取实时数据"选项后重新分析。
                    </span>
                </div>
            </div>
            """

        return f"""
        <div style='background: white; border: 1px solid #E8E8E8; border-radius: 8px; padding: 16px; margin-bottom: 16px;'>
            <h3 style='margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #262626; border-bottom: 1px solid #F0F0F0; padding-bottom: 8px;'>
                🏢 个股信息
            </h3>
            {info_banner}
            <div style='display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;'>
                <div>
                    <div style='font-size: 12px; color: #8C8C8C; margin-bottom: 4px;'>股票代码</div>
                    <div style='font-size: 14px; color: #595959;'>{info.get('code', '暂无')}</div>
                </div>
                <div>
                    <div style='font-size: 12px; color: #8C8C8C; margin-bottom: 4px;'>股票名称</div>
                    <div style='font-size: 14px; color: #595959;'>{info.get('name', '暂无')}</div>
                </div>
                <div>
                    <div style='font-size: 12px; color: #8C8C8C; margin-bottom: 4px;'>当前价格</div>
                    <div style='font-size: 14px; color: #595959;'>{current_price}</div>
                </div>
                <div>
                    <div style='font-size: 12px; color: #8C8C8C; margin-bottom: 4px;'>涨跌幅</div>
                    <div style='font-size: 14px; color: {change_color};'>
                        {change_display}
                    </div>
                </div>
            </div>
            <div style='display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-top: 12px;'>
                <div>
                    <div style='font-size: 12px; color: #8C8C8C; margin-bottom: 4px;'>今开/昨收</div>
                    <div style='font-size: 14px; color: #595959;'>{open_val} / {pre_close}</div>
                </div>
                <div>
                    <div style='font-size: 12px; color: #8C8C8C; margin-bottom: 4px;'>最高/最低</div>
                    <div style='font-size: 14px; color: #595959;'>{high_val} / {low_val}</div>
                </div>
                <div>
                    <div style='font-size: 12px; color: #8C8C8C; margin-bottom: 4px;'>成交量</div>
                    <div style='font-size: 14px; color: #595959;'>{volume_display}</div>
                </div>
                <div>
                    <div style='font-size: 12px; color: #8C8C8C; margin-bottom: 4px;'>换手率</div>
                    <div style='font-size: 14px; color: #595959;'>{turnover_display}</div>
                </div>
            </div>
            <div style='background: #F0F5FF; border-left: 3px solid #1890FF; padding: 8px 12px; margin-top: 12px; border-radius: 4px;'>
                <div style='font-size: 12px; color: #595959;'>⚡ 快速解读：{self._get_market_status(change_pct)}，{self._get_turnover_status(turnover)}</div>
            </div>
        </div>
        """

    def _generate_technical_card(self, indicators: Dict, interpretation: Dict) -> str:
        """生成技术指标卡片"""
        # 适配 technical_analysis 模块返回的数据结构
        ma_trend = indicators.get('ma_trend', {})
        rsi_value = indicators.get('rsi_value', 'N/A')
        kdj_k = indicators.get('kdj_k', 'N/A')
        kdj_d = indicators.get('kdj_d', 'N/A')
        bb_signal_cn = indicators.get('bb_signal_cn', 'N/A')

        # 提取MA5、MA10、MA20、MA60的值
        ma5 = ma_trend.get('MA5', {}).get('current', 'N/A') if isinstance(ma_trend, dict) else 'N/A'
        ma10 = ma_trend.get('MA10', {}).get('current', 'N/A') if isinstance(ma_trend, dict) else 'N/A'
        ma20 = ma_trend.get('MA20', {}).get('current', 'N/A') if isinstance(ma_trend, dict) else 'N/A'
        ma60 = ma_trend.get('MA60', {}).get('current', 'N/A') if isinstance(ma_trend, dict) else 'N/A'

        # 格式化MA显示
        if isinstance(ma5, (int, float)):
            ma5_display = f"{ma5:.2f}"
        else:
            ma5_display = self._format_display(ma5)

        if isinstance(ma10, (int, float)):
            ma10_display = f"{ma10:.2f}"
        else:
            ma10_display = self._format_display(ma10)

        if isinstance(ma20, (int, float)):
            ma20_display = f"{ma20:.2f}"
        else:
            ma20_display = self._format_display(ma20)

        if isinstance(ma60, (int, float)):
            ma60_display = f"{ma60:.2f}"
        else:
            ma60_display = self._format_display(ma60)

        # 格式化RSI显示
        if isinstance(rsi_value, (int, float)):
            rsi_display = f"{rsi_value:.1f}"
        else:
            rsi_display = self._format_display(rsi_value)

        # 格式化KDJ显示
        if isinstance(kdj_k, (int, float)):
            k_display = f"{kdj_k:.1f}"
        else:
            k_display = self._format_display(kdj_k)

        if isinstance(kdj_d, (int, float)):
            d_display = f"{kdj_d:.1f}"
        else:
            d_display = self._format_display(kdj_d)

        # MACD信号
        macd_signal_cn = indicators.get('macd_signal_cn', '中性')

        # 获取布林带位置（如果有）
        bb_position = ""
        if bb_signal_cn != 'N/A':
            bb_position = bb_signal_cn

        # 获取其他指标的数据
        atr_value = indicators.get('atr_value', 'N/A')
        atr_ratio = indicators.get('atr_ratio', 'N/A')
        volume_ratio = indicators.get('volume_ratio', 'N/A')
        turnover = indicators.get('turnover', 'N/A')

        # 格式化ATR显示
        if isinstance(atr_value, (int, float)):
            atr_display = f"{atr_value:.3f}"
        else:
            atr_display = self._format_display(atr_value)

        if isinstance(atr_ratio, (int, float)):
            atr_ratio_display = f"{atr_ratio*100:.2f}%"
        else:
            atr_ratio_display = self._format_display(atr_ratio)

        # 格式化成交量比率
        if isinstance(volume_ratio, (int, float)):
            volume_ratio_display = f"{volume_ratio:.2f}"
        else:
            volume_ratio_display = self._format_display(volume_ratio)

        # 格式化换手率
        if isinstance(turnover, (int, float)):
            turnover_display = f"{turnover:.2f}%"
        else:
            turnover_display = self._format_display(turnover)

        return f"""
        <div style='background: white; border: 1px solid #E8E8E8; border-radius: 8px; padding: 16px; margin-bottom: 16px;'>
            <h3 style='margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #262626; border-bottom: 1px solid #F0F0F0; padding-bottom: 8px;'>
                📈 技术面分析
            </h3>

            <!-- 第一行：MA, MACD, RSI, KDJ -->
            <div style='display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 12px;'>
                <div>
                    <div style='font-size: 12px; color: #8C8C8C; margin-bottom: 4px;'>MA5/MA10/MA20/MA60</div>
                    <div style='font-size: 14px; color: #595959;'>{ma5_display} / {ma10_display} / {ma20_display} / {ma60_display}</div>
                </div>
                <div>
                    <div style='font-size: 12px; color: #8C8C8C; margin-bottom: 4px;'>MACD</div>
                    <div style='font-size: 14px; color: #595959;'>{macd_signal_cn}</div>
                </div>
                <div>
                    <div style='font-size: 12px; color: #8C8C8C; margin-bottom: 4px;'>RSI</div>
                    <div style='font-size: 14px; color: #595959;'>{rsi_display} {self._get_rsi_status(rsi_value)}</div>
                </div>
                <div>
                    <div style='font-size: 12px; color: #8C8C8C; margin-bottom: 4px;'>KDJ</div>
                    <div style='font-size: 14px; color: #595959;'>K={k_display} D={d_display}</div>
                </div>
            </div>

            <!-- 第二行：BOLL, ATR, VOL, 换手率 -->
            <div style='display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 12px;'>
                <div>
                    <div style='font-size: 12px; color: #8C8C8C; margin-bottom: 4px;'>BOLL布林带</div>
                    <div style='font-size: 14px; color: #595959;'>{bb_position if bb_position else '暂无'}</div>
                </div>
                <div>
                    <div style='font-size: 12px; color: #8C8C8C; margin-bottom: 4px;'>ATR波幅</div>
                    <div style='font-size: 14px; color: #595959;'>{atr_display} ({atr_ratio_display})</div>
                </div>
                <div>
                    <div style='font-size: 12px; color: #8C8C8C; margin-bottom: 4px;'>VOL量比</div>
                    <div style='font-size: 14px; color: #595959;'>{volume_ratio_display}</div>
                </div>
                <div>
                    <div style='font-size: 12px; color: #8C8C8C; margin-bottom: 4px;'>换手率</div>
                    <div style='font-size: 14px; color: #595959;'>{turnover_display}</div>
                </div>
            </div>

            <div style='background: #F0F5FF; border-left: 3px solid #1890FF; padding: 8px 12px; border-radius: 4px;'>
                <div style='font-size: 12px; color: #595959;'>⚡ 快速解读：{self._get_trend_summary(indicators)}</div>
            </div>
        </div>
        """

    def _generate_financial_card(self, financial: Dict) -> str:
        """生成财务数据卡片（PE、PB、PS、ROE、毛利率、净利率）"""
        valuation = financial.get('valuation', {})
        profitability = financial.get('profitability', {})

        # 获取数值
        pe = valuation.get('pe')
        pb = valuation.get('pb')
        ps = valuation.get('ps')
        roe = profitability.get('roe')
        gross_profit_margin = profitability.get('gross_profit_margin')
        net_profit_margin = profitability.get('net_profit_margin')

        # 格式化显示
        pe_display = f"{pe:.2f}" if isinstance(pe, (int, float)) else ""
        pb_display = f"{pb:.2f}" if isinstance(pb, (int, float)) else ""
        ps_display = f"{ps:.2f}" if isinstance(ps, (int, float)) else ""
        roe_display = f"{roe:.2f}%" if isinstance(roe, (int, float)) else ""
        gpm_display = f"{gross_profit_margin:.2f}%" if isinstance(gross_profit_margin, (int, float)) else ""
        npm_display = f"{net_profit_margin:.2f}%" if isinstance(net_profit_margin, (int, float)) else ""

        # 计算显示的列数
        items = []
        if pe_display: items.append(("PE（市盈率）", pe_display))
        if pb_display: items.append(("PB（市净率）", pb_display))
        if ps_display: items.append(("PS（市销率）", ps_display))
        if roe_display: items.append(("ROE", roe_display))
        if gpm_display: items.append(("毛利率", gpm_display))
        if npm_display: items.append(("净利率", npm_display))

        if not items:
            return ""  # 没有数据就不显示卡片

        # 生成财务快速解读
        financial_summary = self._get_financial_summary(financial)

        return f"""
        <div style='background: white; border: 1px solid #E8E8E8; border-radius: 8px; padding: 16px; margin-bottom: 16px;'>
            <h3 style='margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #262626; border-bottom: 1px solid #F0F0F0; padding-bottom: 8px;'>
                💰 财务指标
            </h3>
            <div style='display: grid; grid-template-columns: repeat({len(items)}, 1fr); gap: 16px;'>
                {"".join([f"<div><div style='font-size: 12px; color: #8C8C8C; margin-bottom: 4px;'>{label}</div><div style='font-size: 14px; color: #595959;'>{value}</div></div>" for label, value in items])}
            </div>
            <div style='background: #F0F5FF; border-left: 3px solid #1890FF; padding: 8px 12px; margin-top: 12px; border-radius: 4px;'>
                <div style='font-size: 12px; color: #595959;'>⚡ 快速解读：{financial_summary}</div>
            </div>
        </div>
        """

    # ========== 辅助方法 ==========

    def _format_number(self, num: float) -> str:
        """格式化数字"""
        # 确保是数字类型
        if not isinstance(num, (int, float)):
            return "N/A"

        if num >= 100000000:
            return f"{num/100000000:.2f}亿"
        elif num >= 10000:
            return f"{num/10000:.2f}万"
        return str(int(num))

    def _get_market_status(self, change_pct: float) -> str:
        """获取市场状态"""
        if not isinstance(change_pct, (int, float)):
            return "价格数据不足"

        if change_pct > 0:
            return "价格上涨"
        elif change_pct < 0:
            return "价格下跌"
        else:
            return "价格平盘"

    def _get_turnover_status(self, turnover: float) -> str:
        """获取换手率状态"""
        if not isinstance(turnover, (int, float)):
            return "换手率数据不足"

        if turnover < 1:
            return "交投清淡"
        elif turnover < 3:
            return "交投一般"
        elif turnover < 7:
            return "交投活跃"
        else:
            return "交投极度活跃"

    def _get_rsi_color(self, rsi: float) -> str:
        """获取RSI颜色"""
        if isinstance(rsi, (int, float)):
            if rsi > 70:
                return "#F5222D"  # 超买红色
            elif rsi < 30:
                return "#52C41A"  # 超卖绿色
        return "#8C8C8C"  # 中性灰色

    def _get_rsi_status(self, rsi: float) -> str:
        """获取RSI状态"""
        if isinstance(rsi, (int, float)):
            if rsi > 70:
                return "超买"
            elif rsi < 30:
                return "超卖"
        return "中性"

    def _get_trend_summary(self, indicators: Dict) -> str:
        """获取趋势总结"""
        summary_parts = []

        # MA趋势
        ma_signal_cn = indicators.get('ma_signal_cn', '')
        if ma_signal_cn and ma_signal_cn != 'N/A':
            summary_parts.append(f"均线{ma_signal_cn}")

        # MACD信号
        macd_signal_cn = indicators.get('macd_signal_cn', '')
        if macd_signal_cn and macd_signal_cn != 'N/A':
            summary_parts.append(f"MACD{macd_signal_cn}")

        # RSI信号
        rsi_signal_cn = indicators.get('rsi_signal_cn', '')
        if rsi_signal_cn and rsi_signal_cn != 'N/A':
            summary_parts.append(f"RSI{rsi_signal_cn}")

        # 综合信号
        overall_signal_cn = indicators.get('overall_signal_cn', '')
        if overall_signal_cn and overall_signal_cn != 'N/A':
            summary_parts.append(f"整体{overall_signal_cn}")

        return "；".join(summary_parts) if summary_parts else "数据不足"

    def _get_score_color(self, score: float) -> str:
        """获取评分颜色"""
        if score >= 80:
            return "#52C41A"  # 优秀绿色
        elif score >= 60:
            return "#FA8C16"  # 良好橙色
        else:
            return "#F5222D"  # 一般红色

    def _get_financial_summary(self, financial: Dict) -> str:
        """获取财务总结"""
        valuation = financial.get('valuation', {})
        score = financial.get('score', 0)

        summary_parts = []

        # 估值判断
        pe = valuation.get('pe', 0)
        # 确保pe是数字类型
        if isinstance(pe, (int, float)) and pe > 0:
            if pe < 10:
                summary_parts.append("估值偏低")
            elif pe > 30:
                summary_parts.append("估值偏高")
            else:
                summary_parts.append("估值合理")

        # 评分判断（确保score是数字）
        if isinstance(score, (int, float)):
            if score >= 80:
                summary_parts.append(f"财务状况优秀（{score}分）")
            elif score >= 60:
                summary_parts.append(f"财务状况良好（{score}分）")
            else:
                summary_parts.append(f"财务状况一般（{score}分）")

        return "；".join(summary_parts) if summary_parts else "数据不足"
