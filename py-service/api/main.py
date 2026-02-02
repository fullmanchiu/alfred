"""
股票分析微服务 - FastAPI 接口
Stock Analysis Microservice

提供 HTTP REST API 接口供 Alfred 后端调用
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
import sys
import os
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 添加父目录到路径以导入 modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# 导入分析模块
from modules import data_fetcher, technical_analysis, fundamental_analysis, risk_management

app = FastAPI(
    title="Stock Analysis Microservice",
    description="股票技术分析、基本面分析和AI报告生成服务",
    version="1.0.0"
)

# CORS 配置（允许 Alfred 后端调用）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境应该限制具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== 请求/响应模型 ====================

class StockAnalyzeRequest(BaseModel):
    """股票分析请求"""
    code: str  # 股票代码，如 "sh.600000"
    start_date: Optional[str] = None  # 开始日期 YYYY-MM-DD
    end_date: Optional[str] = None  # 结束日期 YYYY-MM-DD
    include_ai: bool = True  # 是否包含AI分析


class HealthResponse(BaseModel):
    """健康检查响应"""
    status: str
    service: str
    version: str


# ==================== 核心接口 ====================

@app.get("/api/health", response_model=HealthResponse, tags=["系统"])
async def health_check():
    """
    健康检查接口

    用于服务监控和负载均衡健康检查
    """
    return {
        "status": "ok",
        "service": "stock-analysis-service",
        "version": "1.0.0"
    }


@app.post("/api/stock/analyze", tags=["股票分析"], deprecated=True)
async def analyze_stock(request: StockAnalyzeRequest):
    """
    综合分析股票

    返回技术分析、基本面分析和AI分析报告
    """
    try:
        # 设置默认日期范围（最近3个月）
        if not request.end_date:
            end_date = datetime.now().strftime("%Y-%m-%d")
        else:
            end_date = request.end_date

        if not request.start_date:
            start_date = (datetime.now() - timedelta(days=90)).strftime("%Y-%m-%d")
        else:
            start_date = request.start_date

        # 1. 获取股票数据
        df = data_fetcher.fetch_stock_data(request.code, start_date, end_date)
        if df is None or df.empty:
            raise HTTPException(status_code=404, detail=f"无法获取股票 {request.code} 的数据")

        # 2. 计算技术指标
        df_with_indicators = technical_analysis.calculate_all_indicators(df)

        # 3. 运行完整的技术分析
        technical_score = technical_analysis.analyze_trend(df_with_indicators)

        # 4. 基本面分析
        fundamental_score, fundamental_reasons = fundamental_analysis.calculate_fundamental_score(df_with_indicators)

        # 5. 获取实时数据
        realtime_data = data_fetcher.fetch_realtime_data(request.code)

        # 6. 运行风险分析
        risk_results = risk_management.run_risk_analysis(request.code, realtime_data.get('name', '未知'), df_with_indicators)

        # 7. 构建 AI 分析所需的完整 stock_data
        stock_data = {
            'info': {
                'code': request.code,
                'name': realtime_data.get('name', '未知')
            },
            'quote': realtime_data,
            'indicators': technical_score,  # 使用 trend_analysis 结果
            'risk_results': risk_results,
            'financial': {},  # 暂时为空
            'time_range': f"{start_date} 至 {end_date}"
        }

        # 8. AI 分析报告（如果需要）
        ai_report = None
        if request.include_ai:
            try:
                # 创建 AI 分析器实例
                ai = ai_analyzer.AIAnalyzer()

                # 调用流式分析并收集结果
                report_chunks = []
                for chunk in ai.analyze_stream(stock_data, analysis_mode='comprehensive'):
                    report_chunks.append(chunk)

                ai_report = ''.join(report_chunks)

            except Exception as e:
                # AI 分析失败不影响其他数据返回
                import traceback
                error_detail = traceback.format_exc()
                ai_report = f"AI 分析生成失败: {str(e)}\n\n详细信息:\n{error_detail}"

        # 7. 转换 DataFrame 为字典（用于 JSON 序列化）
        technical_indicators = df_with_indicators.tail(1).to_dict('records')[0] if not df_with_indicators.empty else {}

        # 返回结果
        return {
            "success": True,
            "data": {
                "stock_code": request.code,
                "stock_name": realtime_data.get("name", "未知"),
                "realtime_data": {
                    "current_price": realtime_data.get("price", 0),
                    "change_percent": realtime_data.get("change", 0) * 100,
                    "volume": realtime_data.get("volume", 0),
                    "market_cap": realtime_data.get("total_cap", 0),
                    "open": realtime_data.get("open", 0),
                    "high": realtime_data.get("high", 0),
                    "low": realtime_data.get("low", 0),
                    "pre_close": realtime_data.get("pre_close", 0),
                },
                "technical_analysis": {
                    "score": technical_score.get("signal_stats", {}).get("buy", 0) * 20,
                    "trend": technical_score.get("overall_signal_cn", "未知"),
                    "strength": technical_score.get("overall_signal", "未知"),
                    "indicators": {
                        "ma": technical_indicators.get("MA5", 0),
                        "macd": technical_indicators.get("MACD", 0),
                        "rsi": technical_indicators.get("RSI", 0),
                        "boll_upper": technical_indicators.get("BB_Upper", 0),
                        "boll_lower": technical_indicators.get("BB_Lower", 0),
                    }
                },
                "fundamental_analysis": {
                    "score": fundamental_score,
                    "reasons": fundamental_reasons
                },
                "ai_report": ai_report
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"分析失败: {str(e)}")


@app.get("/api/stock/{code}/info", tags=["股票信息"])
async def get_stock_info(code: str):
    """
    获取股票基本信息

    - code: 股票代码（如 sh.600000）
    """
    try:
        realtime_data = data_fetcher.fetch_realtime_data(code)

        return {
            "success": True,
            "data": {
                "code": code,
                "name": realtime_data.get("stock_name", "未知"),
                "current_price": realtime_data.get("current_price", 0),
                "change_percent": realtime_data.get("change_percent", 0),
                "volume": realtime_data.get("volume", 0),
                "market_cap": realtime_data.get("market_cap", 0)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取股票信息失败: {str(e)}")


@app.get("/api/stock/{code}/technical", tags=["股票分析"])
async def get_technical_analysis(code: str, days: int = 30):
    """
    获取技术分析

    - code: 股票代码
    - days: 分析天数（默认30天）
    """
    try:
        end_date = datetime.now().strftime("%Y-%m-%d")
        start_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")

        df = data_fetcher.fetch_stock_data(code, start_date, end_date)
        if df is None or df.empty:
            raise HTTPException(status_code=404, detail="无法获取股票数据")

        df_with_indicators = technical_analysis.calculate_all_indicators(df)
        trend_analysis = technical_analysis.analyze_trend(df_with_indicators)

        # 获取最新指标
        latest = df_with_indicators.tail(1).to_dict('records')[0]

        return {
            "success": True,
            "data": {
                "code": code,
                "trend": trend_analysis,
                "indicators": {
                    "ma_5": latest.get("MA_CLOSE_5", 0),
                    "ma_10": latest.get("MA_CLOSE_10", 0),
                    "ma_20": latest.get("MA_CLOSE_20", 0),
                    "macd": latest.get("MACD", 0),
                    "macd_signal": latest.get("MACD_SIGNAL", 0),
                    "rsi": latest.get("RSI", 0),
                    "kdj_k": latest.get("KDJ_K", 0),
                    "kdj_d": latest.get("KDJ_D", 0),
                    "boll_upper": latest.get("BOLL_UPPER", 0),
                    "boll_middle": latest.get("BOLL_MIDDLE", 0),
                    "boll_lower": latest.get("BOLL_LOWER", 0),
                }
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"技术分析失败: {str(e)}")


@app.get("/api/stock/{code}/fundamental", tags=["股票分析"])
async def get_fundamental_analysis(code: str):
    """
    获取基本面分析

    - code: 股票代码
    """
    try:
        end_date = datetime.now().strftime("%Y-%m-%d")
        start_date = (datetime.now() - timedelta(days=90)).strftime("%Y-%m-%d")

        df = data_fetcher.fetch_stock_data(code, start_date, end_date)
        if df is None or df.empty:
            raise HTTPException(status_code=404, detail="无法获取股票数据")

        score, reasons = fundamental_analysis.calculate_fundamental_score(df)

        return {
            "success": True,
            "data": {
                "code": code,
                "score": score,
                "reasons": reasons
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"基本面分析失败: {str(e)}")


@app.post("/api/stock/{code}/ai-report", tags=["股票分析"], deprecated=True)
async def generate_ai_report(code: str, start_date: Optional[str] = None):
    """
    生成AI分析报告

    - code: 股票代码
    - start_date: 分析开始日期（可选，默认最近3个月）
    """
    try:
        if not start_date:
            start_date = (datetime.now() - timedelta(days=90)).strftime("%Y-%m-%d")
        end_date = datetime.now().strftime("%Y-%m-%d")

        # 获取数据
        df = data_fetcher.fetch_stock_data(code, start_date, end_date)
        if df is None or df.empty:
            raise HTTPException(status_code=404, detail="无法获取股票数据")

        df_with_indicators = technical_analysis.calculate_all_indicators(df)
        realtime_data = data_fetcher.fetch_realtime_data(code)

        # 生成 AI 报告
        report = ai_analyzer.generate_comprehensive_report(
            stock_code=code,
            df=df_with_indicators,
            realtime_data=realtime_data
        )

        return {
            "success": True,
            "data": {
                "code": code,
                "report": report,
                "generated_at": datetime.now().isoformat()
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 报告生成失败: {str(e)}")


# ==================== 启动配置 ====================

if __name__ == "__main__":
    import uvicorn

    print("🚀 启动股票分析微服务...")
    print("📍 服务地址: http://0.0.0.0:8001")
    print("📚 API文档: http://0.0.0.0:8001/docs")

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=False  # 生产环境设置为 False
    )
