"""
AI分析引擎模块
直接对接LLM API，生成投资建议和详细报告
"""

import os
import json
import re
from typing import Dict, Optional
from datetime import datetime
import logging
import pandas as pd

logger = logging.getLogger(__name__)


class AIAnalyzer:
    """AI分析引擎"""

    def __init__(self):
        """初始化AI分析器"""
        self.provider = os.getenv('LLM_PROVIDER', 'custom')
        self.api_key = self._get_api_key()
        self.model = self._get_model()
        self.base_url = self._get_base_url()
        self.timeout = int(os.getenv('CUSTOM_TIMEOUT', '60'))  # 默认60秒超时

        # API参数优化（控制输出长度）
        self.max_tokens = int(os.getenv('CUSTOM_MAX_TOKENS', '3500'))  # 控制在3500 tokens以内（约2500-3000中文字符）
        self.temperature = float(os.getenv('CUSTOM_TEMPERATURE', '0.7'))  # 提高到0.7，更丰富多样

        # 调试配置：是否保存提示词到文件
        self.save_prompt_debug = os.getenv('SAVE_PROMPT_DEBUG', 'false').lower() == 'true'

        # 验证配置
        self._validate_config()

    def _get_api_key(self) -> Optional[str]:
        """获取API密钥"""
        if self.provider == 'openai':
            return os.getenv('OPENAI_API_KEY')
        elif self.provider == 'anthropic':
            return os.getenv('ANTHROPIC_API_KEY')
        elif self.provider == 'custom':
            # 优先使用阿里云官方环境变量名
            return os.getenv('DASHSCOPE_API_KEY') or os.getenv('CUSTOM_API_KEY')
        return None

    def _get_model(self) -> str:
        """获取模型名称"""
        if self.provider == 'openai':
            return os.getenv('OPENAI_MODEL', 'gpt-4')
        elif self.provider == 'anthropic':
            return os.getenv('ANTHROPIC_MODEL', 'claude-3-5-sonnet-20241022')
        elif self.provider == 'custom':
            return os.getenv('CUSTOM_MODEL', 'gpt-4')
        return 'gpt-4'

    def _get_base_url(self) -> Optional[str]:
        """获取API基础URL"""
        if self.provider == 'openai':
            return os.getenv('OPENAI_BASE_URL', 'https://api.openai.com/v1')
        elif self.provider == 'anthropic':
            return None  # Anthropic不需要base_url
        elif self.provider == 'custom':
            return os.getenv('CUSTOM_BASE_URL')
        return None

    def _validate_config(self):
        """验证配置是否完整"""
        if not self.api_key:
            raise ValueError(f"未设置API密钥，请在环境变量中设置 {self._get_api_key_env_name()}")

        if self.provider == 'custom' and not self.base_url:
            raise ValueError("使用自定义API时，必须设置 CUSTOM_BASE_URL 环境变量")

    def _get_api_key_env_name(self) -> str:
        """获取API密钥环境变量名称"""
        if self.provider == 'openai':
            return 'OPENAI_API_KEY'
        elif self.provider == 'anthropic':
            return 'ANTHROPIC_API_KEY'
        elif self.provider == 'custom':
            return 'DASHSCOPE_API_KEY 或 CUSTOM_API_KEY'
        return 'API_KEY'

    def analyze_stream(self, stock_data: Dict, analysis_mode: str = 'comprehensive'):
        """
        流式分析股票数据

        Args:
            stock_data: 包含所有分析数据的字典
            analysis_mode: 分析模式
                - 'comprehensive': 综合分析（默认，长期价值投资）
                - 'short_term': 短线交易（1-10天，技术面为主）

        Yields:
            str: AI生成的文本片段（Markdown格式）
        """
        try:
            # 准备提示词
            print(f"📝 准备AI分析提示词（流式，模式: {analysis_mode}）...")
            prompt = self._prepare_prompt(stock_data, analysis_mode=analysis_mode)
            print(f"✅ 提示词准备完成，长度: {len(prompt)} 字符")

            # 获取股票代码（用于后续处理）
            stock_code = stock_data.get('info', {}).get('code', None)

            # 获取系统提示词
            system_prompt = self._get_system_prompt()

            # 保存调试信息（如果配置开启）
            if self.save_prompt_debug:
                self._save_llm_input_debug(prompt, system_prompt, stock_code)

            # 调用流式LLM
            print(f"🌐 调用流式LLM API (provider={self.provider}, model={self.model})...")

            # 生成流式响应
            accumulated_text = ""

            # 根据provider选择不同的流式调用方式
            if self.provider == 'custom' or self.provider == 'openai':
                for chunk in self._call_openai_stream(prompt, system_prompt):
                    accumulated_text += chunk
                    yield chunk
            elif self.provider == 'anthropic':
                for chunk in self._call_anthropic_stream(prompt, system_prompt):
                    accumulated_text += chunk
                    yield chunk
            else:
                raise Exception(f"不支持的provider: {self.provider}")

            print(f"✅ 流式响应完成，总长度: {len(accumulated_text)} 字符")

        except Exception as e:
            print(f"❌ 流式AI分析失败: {str(e)}")
            logger.error(f"流式AI分析失败: {str(e)}")
            # 返回错误信息
            yield f"\n\n### ❌ AI分析失败\n\n{str(e)}\n"

    def _call_openai_stream(self, prompt: str, system_prompt: str):
        """
        调用OpenAI兼容API的流式接口

        Yields:
            str: 文本片段
        """
        try:
            import openai

            client = openai.OpenAI(
                api_key=self.api_key,
                base_url=self.base_url,
                timeout=self.timeout
            )

            print(f"  📦 使用模型: {self.model}")
            print(f"  ⚙️  参数配置: max_tokens={self.max_tokens}, temperature={self.temperature}")
            print(f"  📤 开始流式请求...")

            stream = client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                temperature=self.temperature,
                max_tokens=self.max_tokens,
                stream=True  # 启用流式输出
            )

            for chunk in stream:
                if chunk.choices[0].delta.content is not None:
                    yield chunk.choices[0].delta.content

        except ImportError:
            raise Exception("请安装openai库: pip install openai")
        except Exception as e:
            raise Exception(f"OpenAI API流式调用失败: {str(e)}")

    def _call_anthropic_stream(self, prompt: str, system_prompt: str):
        """
        调用Claude API的流式接口

        Yields:
            str: 文本片段
        """
        try:
            import anthropic

            client = anthropic.Anthropic(
                api_key=self.api_key,
                timeout=self.timeout
            )

            print(f"  📦 使用模型: {self.model}")
            print(f"  ⚙️  参数配置: max_tokens={self.max_tokens}, temperature={self.temperature}")
            print(f"  📤 开始流式请求...")

            stream = client.messages.create(
                model=self.model,
                max_tokens=self.max_tokens,
                temperature=self.temperature,
                system=system_prompt,
                messages=[
                    {"role": "user", "content": prompt}
                ],
                stream=True  # 启用流式输出
            )

            for event in stream:
                if event.type == 'content_block_delta':
                    if event.delta.text:
                        yield event.delta.text

        except ImportError:
            raise Exception("请安装anthropic库: pip install anthropic")
        except Exception as e:
            raise Exception(f"Claude API流式调用失败: {str(e)}")

    def _prepare_prompt(self, stock_data: Dict, analysis_mode: str = 'comprehensive') -> str:
        """
        准备AI提示词 - 从磁盘读取CSV文件

        Args:
            stock_data: 股票数据
            analysis_mode: 分析模式

        Returns:
            完整的提示词字符串
        """
        # 获取用户提示词模板（不含数据）
        prompt_template = self._generate_improved_prompt(stock_data, None, analysis_mode=analysis_mode)

        # 获取股票代码
        stock_code = stock_data.get('info', {}).get('code', '')
        if not stock_code:
            raise Exception("无法获取股票代码")

        # 数据目录
        data_dir = os.path.join(os.path.dirname(__file__), '..', 'data', stock_code)

        # 收集CSV数据
        csv_parts = []

        # 1. 历史K线数据（带时间范围）
        hist_data_path = os.path.join(data_dir, 'baostock_raw.csv')
        if os.path.exists(hist_data_path):
            with open(hist_data_path, 'r', encoding='utf-8') as f:
                hist_content = f.read()
                # 提取时间范围
                lines = hist_content.strip().split('\n')
                if len(lines) > 1:
                    start_date = lines[1].split(',')[0]
                    end_date = lines[-1].split(',')[0]
                    csv_parts.append(f"# Historical K-line: {start_date} to {end_date}\n{hist_content}")
                else:
                    csv_parts.append(f"# Historical K-line\n{hist_content}")

        # 2. 实时行情数据
        realtime_data_path = os.path.join(data_dir, 'realtime_raw.csv')
        if os.path.exists(realtime_data_path):
            with open(realtime_data_path, 'r', encoding='utf-8') as f:
                csv_parts.append(f"# Realtime Quote\n{f.read()}")

        # 3. 财务数据（提取时间范围）
        import glob
        financial_files = glob.glob(os.path.join(data_dir, 'financial_*.csv'))
        if financial_files:
            with open(financial_files[0], 'r', encoding='utf-8') as f:
                content = f.read()
                # 提取时间范围
                lines = content.strip().split('\n')
                if len(lines) > 1:
                    # 第一行是列名，第二行是最新的季度，最后一行是最早的季度
                    try:
                        # 提取最新季度（第二行第一列）
                        latest_quarter = lines[1].split(',')[0]
                        # 提取最早季度（最后一行第一列）
                        earliest_quarter = lines[-1].split(',')[0]
                        time_range = f": {earliest_quarter} to {latest_quarter}"
                    except:
                        time_range = ""
                    csv_parts.append(f"# Financial Data{time_range}\n{content}")
                else:
                    csv_parts.append(f"# Financial Data\n{content}")

        # 拼接所有CSV数据
        data_content = "\n".join(csv_parts)

        # 将数据内容插入到提示词模板的 {data_content} 占位符位置
        full_prompt = prompt_template.replace('{data_content}', data_content)

        # 替换 {code} 占位符
        full_prompt = full_prompt.replace('{code}', stock_code)

        return full_prompt

    def _generate_improved_prompt(self, stock_data: Dict, llm_data: Dict, analysis_mode: str = 'comprehensive') -> str:
        """
        从文件读取用户提示词模板

        Args:
            stock_data: 股票数据
            llm_data: LLM数据
            analysis_mode: 分析模式
                - 'comprehensive': 综合分析（默认，长期价值投资）
                - 'short_term': 短线交易（1-10天，技术面为主）
        """
        try:
            # 根据分析模式选择提示词文件
            if analysis_mode == 'short_term':
                prompt_filename = 'short_term_prompt.txt'
            else:
                prompt_filename = 'user_prompt.txt'

            prompt_path = os.path.join(os.path.dirname(__file__), '..', 'prompts', prompt_filename)

            with open(prompt_path, 'r', encoding='utf-8') as f:
                prompt = f.read().strip()
                print(f"✓ 使用分析模式: {analysis_mode} ({prompt_filename})")
                return prompt
        except Exception as e:
            print(f"⚠️ 读取用户提示词文件失败: {str(e)}，使用默认提示词")
            return """请分析以下数据，生成专业的股票投资分析报告。

请生成包含以下内容的报告：
1. 投资评级（强烈买入/买入/持有/卖出/强烈卖出）+ 星级评分
2. 技术面分析（趋势、点位、信号）
3. 基本面分析（估值、财务质量）
4. 资金面分析（风险收益、配置建议）
5. 操作建议（买入/卖出价格区间、仓位、止损）
6. 风险提示（至少3个主要风险点）

使用Markdown格式输出报告，保持专业、客观、可操作。"""

    def _format_shareholder_changes(self, changes: list) -> str:
        """格式化增减持信息"""
        if not changes:
            return "近3个月无增减持记录"

        result = []
        for change in changes[:5]:  # 最多显示5条
            result.append(
                f"- {change.get('date', '')}：{change.get('shareholder', '')} "
                f"{change.get('type', '')} {change.get('amount', '')}股 "
                f"({change.get('ratio', '')}%)"
            )
        return "\n".join(result)

    def _is_macd_golden_cross(self, indicators: Dict) -> bool:
        """判断MACD是否金叉"""
        macd_data = indicators.get('macd', {})
        dif = macd_data.get('dif', 0)
        dea = macd_data.get('dea', 0)
        return dif > dea

    def _build_raw_data_for_llm(self, stock_data: Dict) -> str:
        """
        构建原始CSV数据，不做任何处理和重组

        Args:
            stock_data: 完整的股票数据字典

        Returns:
            CSV格式的原始数据文本
        """
        info = stock_data.get('info', {})
        indicators = stock_data.get('indicators', {})
        quote = stock_data.get('quote', {})
        financial = stock_data.get('financial', {})

        # 用于收集CSV数据
        csv_parts = []

        # ===== 1. 历史K线数据（CSV格式）=====
        df = indicators.get('df')
        if df is not None and hasattr(df, 'iloc') and len(df) > 0:
            # 直接转CSV，不做任何处理
            csv_parts.append("# 历史K线数据\n")
            csv_parts.append(df.to_csv(index=True))
            csv_parts.append("\n")

        # ===== 2. 实时行情数据（CSV格式）=====
        if quote:
            csv_parts.append("# 实时行情数据\n")
            quote_df = pd.DataFrame([quote])
            csv_parts.append(quote_df.to_csv(index=False))
            csv_parts.append("\n")

        # ===== 3. 财务数据（CSV格式）=====
        if financial:
            csv_parts.append("# 财务数据\n")
            # 扁平化财务数据为DataFrame
            financial_rows = []
            if 'valuation' in financial:
                for key, val in financial['valuation'].items():
                    financial_rows.append({'类别': '估值', '指标': key, '数值': val})
            if 'profitability' in financial:
                for key, val in financial['profitability'].items():
                    financial_rows.append({'类别': '盈利能力', '指标': key, '数值': val})
            if 'growth' in financial:
                for key, val in financial['growth'].items():
                    financial_rows.append({'类别': '成长性', '指标': key, '数值': val})
            if 'solvency' in financial:
                for key, val in financial['solvency'].items():
                    financial_rows.append({'类别': '偿债能力', '指标': key, '数值': val})

            if financial_rows:
                financial_df = pd.DataFrame(financial_rows)
                csv_parts.append(financial_df.to_csv(index=False))

        # 拼接所有CSV数据
        return "\n".join(csv_parts)

    def _save_prompt_to_file(self, prompt: str, system_prompt: str = None, stock_code: str = None, stock_data: Dict = None, llm_data: Dict = None):
        """
        将完整提示词和 JSON 数据保存到文件，方便调试和优化

        Args:
            prompt: 用户提示词
            system_prompt: 系统提示词（可选）
            stock_code: 股票代码（用于文件名）
            stock_data: 原始股票数据（可选）
            llm_data: LLM 格式的数据（可选）
        """
        try:
            # 创建 prompts 目录（如果不存在）
            if not os.path.exists('prompts'):
                os.makedirs('prompts')
                print(f"  📁 创建 prompts 目录")

            # 生成文件名：股票代码_时间戳.md
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            if stock_code:
                filename = f"prompts/{stock_code}_{timestamp}.md"
                json_filename = f"prompts/{stock_code}_{timestamp}_raw_data.json"  # 改名为 raw_data
            else:
                filename = f"prompts/prompt_{timestamp}.md"
                json_filename = f"prompts/prompt_{timestamp}_raw_data.json"

            # 构建纯基础数据（不含加工结论）
            raw_data = self._build_raw_data_for_llm(stock_data) if stock_data else None

            # 构建完整内容
            content = f"""# AI 分析提示词

**生成时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
**股票代码**: {stock_code or 'N/A'}
**Provider**: {self.provider}
**Model**: {self.model}

---

## System Prompt（系统提示词）

```markdown
{system_prompt or '(未设置 system prompt)'}
```

---

## User Prompt（用户提示词）

```markdown
{prompt}
```

---

## 提示词统计

- System Prompt 长度: {len(system_prompt) if system_prompt else 0} 字符
- User Prompt 长度: {len(prompt)} 字符
- 总长度: {(len(system_prompt) if system_prompt else 0) + len(prompt)} 字符

---

## 数据文件

⚠️ **重要说明**:
- `raw_data.json`: 只包含**原始基础数据**（数值），不含任何分析结论
- 这是发送给 LLM 的纯净数据源，避免指向性影响 AI 判断

JSON 数据已保存至: `{json_filename}`
"""

            # 写入提示词文件
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(content)

            print(f"  💾 提示词已保存到: {filename}")

            # 保存原始基础数据（不含加工结论）
            json_data = {
                'metadata': {
                    '生成时间': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                    '股票代码': stock_code or 'N/A',
                    'Provider': self.provider,
                    'Model': self.model,
                    '说明': '此文件只包含原始基础数据，不含任何分析结论、评分或建议'
                },
                'raw_data': raw_data  # 只保存纯净的基础数据
            }

            with open(json_filename, 'w', encoding='utf-8') as f:
                json.dump(json_data, f, ensure_ascii=False, indent=2, default=str)

            print(f"  💾 原始数据已保存到: {json_filename}")

        except Exception as e:
            print(f"  ⚠️ 保存提示词失败: {str(e)}")

    def _get_system_prompt(self) -> str:
        """从文件读取系统提示词"""
        try:
            prompt_path = os.path.join(os.path.dirname(__file__), '..', 'prompts', 'system_prompt.txt')
            with open(prompt_path, 'r', encoding='utf-8') as f:
                return f.read().strip()
        except Exception as e:
            print(f"⚠️ 读取系统提示词文件失败: {str(e)}，使用默认提示词")
            return """你是一位资深的A股市场分析师，拥有10年以上的投研经验。

你的任务是基于提供的JSON数据，生成专业的投资分析报告。

你需要：
1. 独立分析数据，给出客观判断
2. 引用具体数值支撑你的观点
3. 给出明确的操作建议（买入/持有/卖出）
4. 充分揭示风险"""

    def _save_llm_input_debug(self, user_prompt: str, system_prompt: str, stock_code: str = None):
        """
        保存发送给LLM的完整内容（用于调试）

        Args:
            user_prompt: 用户提示词（包含数据）
            system_prompt: 系统提示词
            stock_code: 股票代码（用于文件名）
        """
        try:
            # 创建debug目录（如果不存在）
            debug_dir = os.path.join(os.path.dirname(__file__), '..', 'prompts', 'debug')
            if not os.path.exists(debug_dir):
                os.makedirs(debug_dir)
                print(f"  📁 创建调试目录: {debug_dir}")

            # 生成文件名：股票代码_时间戳.md
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            if stock_code:
                filename = os.path.join(debug_dir, f"{stock_code}_{timestamp}.md")
            else:
                filename = os.path.join(debug_dir, f"prompt_{timestamp}.md")

            # 构建完整内容（包含元数据，但实际发送时不包含）
            content = f"""# LLM Input Debug

**Time**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
**Stock**: {stock_code or 'N/A'}
**Provider**: {self.provider}
**Model**: {self.model}
**System Prompt Length**: {len(system_prompt)} chars
**User Prompt Length**: {len(user_prompt)} chars
**Total Length**: {len(system_prompt) + len(user_prompt)} chars

---

## System Prompt (Sent to LLM)

```markdown
{system_prompt}
```

---

## User Prompt (Sent to LLM)

```markdown
{user_prompt}
```
"""

            # 写入文件
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(content)

            print(f"  💾 LLM输入已保存到: {filename}")

        except Exception as e:
            print(f"  ⚠️ 保存LLM输入失败: {str(e)}")
