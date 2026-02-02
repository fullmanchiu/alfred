#!/usr/bin/env python3
"""
股票分析微服务
提供实时行情、技术指标计算等功能
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
import logging

# 导入模块
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from modules import data_fetcher, technical_analysis

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 创建FastAPI应用
app = FastAPI(
    title="Stock Analysis Microservice",
    description="股票数据获取和技术指标计算微服务",
    version="1.0.0"
)

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ApiResponse(BaseModel):
    """统一API响应格式"""
    success: bool
    message: Optional[str] = None
    data: Optional[Dict[str, Any]] = None


@app.get("/")
async def root():
    """根路径"""
    return {
        "service": "Stock Analysis Microservice",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/api/stock/{code}/realtime", response_model=ApiResponse)
async def get_realtime_data(code: str):
    """
    获取股票实时行情

    Args:
        code: 股票代码（如 "000001" 或 "sh.000001"）

    Returns:
        实时行情数据
    """
    try:
        logger.info(f"获取股票 {code} 的实时行情")

        # 获取实时数据
        realtime_data = data_fetcher.fetch_realtime_data(code)

        if not realtime_data:
            raise HTTPException(status_code=404, detail=f"未找到股票 {code} 的实时数据")

        return ApiResponse(
            success=True,
            message="获取实时行情成功",
            data=realtime_data
        )

    except Exception as e:
        logger.error(f"获取实时行情失败: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"获取实时行情失败: {str(e)}")


@app.get("/api/stock/{code}/technical", response_model=ApiResponse)
async def get_technical_indicators(code: str, days: int = 90):
    """
    获取股票技术指标

    Args:
        code: 股票代码（如 "000001"）
        days: 拉取天数，默认90天

    Returns:
        技术指标数据
    """
    try:
        logger.info(f"计算股票 {code} 的技术指标（最近{days}天）")

        # 拉取历史数据
        import pandas as pd
        from datetime import datetime, timedelta

        end_date = datetime.now().strftime('%Y-%m-%d')
        start_date = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')

        df = data_fetcher.fetch_stock_data(code, start_date, end_date)

        if df is None or df.empty:
            raise HTTPException(status_code=404, detail=f"未找到股票 {code} 的历史数据")

        # 计算技术指标
        df_with_indicators = technical_analysis.calculate_all_indicators(df)

        # 获取最新一天的指标
        latest = df_with_indicators.iloc[-1]

        indicators_data = {
            "trade_date": latest.name.strftime('%Y-%m-%d'),
            "ma5": float(latest['MA5']) if pd.notna(latest['MA5']) else None,
            "ma10": float(latest['MA10']) if pd.notna(latest['MA10']) else None,
            "ma20": float(latest['MA20']) if pd.notna(latest['MA20']) else None,
            "ma60": float(latest['MA60']) if pd.notna(latest['MA60']) else None,
            "macd": float(latest['MACD']) if pd.notna(latest['MACD']) else None,
            "macd_signal": float(latest['MACD_Signal']) if pd.notna(latest['MACD_Signal']) else None,
            "macd_hist": float(latest['MACD_Hist']) if pd.notna(latest['MACD_Hist']) else None,
            "rsi": float(latest['RSI']) if pd.notna(latest['RSI']) else None,
            "kdj_k": float(latest['K']) if pd.notna(latest['K']) else None,
            "kdj_d": float(latest['D']) if pd.notna(latest['D']) else None,
            "kdj_j": float(latest['J']) if pd.notna(latest['J']) else None,
            "boll_upper": float(latest['BB_Upper']) if pd.notna(latest['BB_Upper']) else None,
            "boll_middle": float(latest['BB_Middle']) if pd.notna(latest['BB_Middle']) else None,
            "boll_lower": float(latest['BB_Lower']) if pd.notna(latest['BB_Lower']) else None,
        }

        return ApiResponse(
            success=True,
            message="计算技术指标成功",
            data=indicators_data
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"计算技术指标失败: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"计算技术指标失败: {str(e)}")


@app.get("/health")
async def health_check():
    """健康检查"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001, log_level="info")
