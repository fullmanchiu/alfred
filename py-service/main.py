#!/usr/bin/env python3
"""
股票分析微服务
提供实时行情、技术指标计算等功能
"""

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
import logging
import uuid
import time

# 导入模块
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from modules import data_fetcher, technical_analysis
from scheduler import sync_klines
from executor.task_executor import get_task_manager
from action_handlers import get_registry, invoke, register_action, ActionResult

# 旧的 executors 模块已废弃，功能迁移到 executor/task_executor.py

# 配置日志（使用统一日志模块）
from logging_config import setup_logging, get_logger
setup_logging(service_name='py-service', log_level='INFO')
logger = get_logger('main')

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


@app.get("/api/stock/{code}/fundamental", response_model=ApiResponse)
async def get_fundamental_analysis(code: str):
    """
    获取股票基本面分析

    Args:
        code: 股票代码（如 "000001"）

    Returns:
        基本面分析结果
    """
    try:
        logger.info(f"分析股票 {code} 的基本面")

        # 获取实时数据来提取基本信息
        realtime_data = data_fetcher.fetch_realtime_data(code)

        if not realtime_data:
            raise HTTPException(status_code=404, detail=f"未找到股票 {code} 的数据")

        # 简单的基本面评分逻辑
        score = 50  # 默认分数
        reasons = []

        # 根据涨跌幅调整评分
        change = realtime_data.get('change', 0)
        if change > 5:
            reasons.append("股价表现强势")
            score += 10
        elif change < -5:
            reasons.append("股价表现疲弱")
            score -= 10
        else:
            reasons.append("股价表现平稳")

        # 根据成交量调整
        volume = realtime_data.get('volume', 0)
        if volume > 0:
            reasons.append("有成交活跃度")

        # 添加基本信息
        name = realtime_data.get('name', code)
        reasons.append(f"股票名称: {name}")

        # 确保分数在 0-100 范围内
        score = max(0, min(100, score))

        return ApiResponse(
            success=True,
            message="基本面分析成功",
            data={
                "score": score,
                "reasons": reasons if reasons else ["暂无详细分析"]
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"基本面分析失败: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"基本面分析失败: {str(e)}")


@app.get("/health")
async def health_check():
    """健康检查"""
    return {"status": "healthy"}


# ==================== 统一通讯协议 API ====================

class CommRequest(BaseModel):
    """统一通讯请求"""
    action: str
    payload: Dict[str, Any] = {}


class CommResponse(BaseModel):
    """统一通讯响应"""
    success: bool
    code: int = 0
    message: Optional[str] = None
    data: Optional[Dict[str, Any]] = None


@app.get("/api/actions")
async def list_actions():
    """列出所有可用的操作"""
    registry = get_registry()
    return {"actions": registry.list_actions()}


@app.post("/api/invoke", response_model=CommResponse)
async def handle_invoke(request: CommRequest):
    """
    统一调用入口

    通讯协议：
    请求：{ "action": "操作标识", "payload": { 业务参数 } }
    响应：{ "success": true/false, "code": 0, "message": "消息", "data": { 返回数据 } }
    """
    logger.info(f"收到调用请求: action={request.action}")
    result = invoke(request.action, request.payload)

    return CommResponse(
        success=result.success,
        code=result.code,
        message=result.message,
        data=result.data
    )


# ==================== 内置操作处理器 ====================

@register_action("stock.realtime")
def action_stock_realtime(payload: Dict[str, Any]) -> ActionResult:
    """获取股票实时行情"""
    code = payload.get("code")
    if not code:
        return ActionResult(success=False, code=400, message="缺少 code 参数")

    data = data_fetcher.fetch_realtime_data(code)
    if not data:
        return ActionResult(success=False, code=404, message=f"未找到股票 {code} 的数据")

    return ActionResult(success=True, data=data)


@register_action("stock.technical")
def action_stock_technical(payload: Dict[str, Any]) -> ActionResult:
    """获取股票技术指标"""
    import pandas as pd
    from datetime import datetime, timedelta

    code = payload.get("code")
    days = payload.get("days", 90)

    if not code:
        return ActionResult(success=False, code=400, message="缺少 code 参数")

    end_date = datetime.now().strftime('%Y-%m-%d')
    start_date = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')

    df = data_fetcher.fetch_stock_data(code, start_date, end_date)
    if df is None or df.empty:
        return ActionResult(success=False, code=404, message=f"未找到股票 {code} 的历史数据")

    df_with_indicators = technical_analysis.calculate_all_indicators(df)
    latest = df_with_indicators.iloc[-1]

    indicators = {
        "tradeDate": latest.name.strftime('%Y-%m-%d'),
        "ma5": float(latest['MA5']) if pd.notna(latest['MA5']) else None,
        "ma10": float(latest['MA10']) if pd.notna(latest['MA10']) else None,
        "ma20": float(latest['MA20']) if pd.notna(latest['MA20']) else None,
        "macd": float(latest['MACD']) if pd.notna(latest['MACD']) else None,
        "rsi": float(latest['RSI']) if pd.notna(latest['RSI']) else None,
        "kdjK": float(latest['K']) if pd.notna(latest['K']) else None,
        "kdjD": float(latest['D']) if pd.notna(latest['D']) else None,
    }

    return ActionResult(success=True, data=indicators)


@register_action("stock.fundamental")
def action_stock_fundamental(payload: Dict[str, Any]) -> ActionResult:
    """获取股票基本面分析"""
    code = payload.get("code")
    if not code:
        return ActionResult(success=False, code=400, message="缺少 code 参数")

    realtime_data = data_fetcher.fetch_realtime_data(code)
    if not realtime_data:
        return ActionResult(success=False, code=404, message=f"未找到股票 {code} 的数据")

    score = 50
    reasons = []

    change = realtime_data.get('change', 0)
    if change > 5:
        reasons.append("股价表现强势")
        score += 10
    elif change < -5:
        reasons.append("股价表现疲弱")
        score -= 10
    else:
        reasons.append("股价表现平稳")

    reasons.append(f"股票名称: {realtime_data.get('name', code)}")

    return ActionResult(
        success=True,
        data={"score": max(0, min(100, score)), "reasons": reasons}
    )


@register_action("calculator.add")
def action_calculator_add(payload: Dict[str, Any]) -> ActionResult:
    """计算器加法 - 用于测试 WebSocket 通讯"""
    a = payload.get("a")
    b = payload.get("b")

    if a is None or b is None:
        return ActionResult(success=False, code=400, message="缺少参数 a 或 b")

    try:
        num_a = float(a)
        num_b = float(b)
        result = num_a + num_b

        return ActionResult(
            success=True,
            data={"result": result, "a": num_a, "b": num_b},
            message=f"{num_a} + {num_b} = {result}"
        )
    except (ValueError, TypeError) as e:
        return ActionResult(success=False, code=400, message=f"参数类型错误: {str(e)}")


# ==================== 通用任务 API ====================

class TaskExecuteRequest(BaseModel):
    """任务执行请求"""
    taskType: str
    params: Dict[str, Any]


class TaskCancelRequest(BaseModel):
    """任务取消请求"""
    executionId: str


@app.on_event("startup")
async def startup_event():
    """应用启动时初始化"""
    # 初始化任务管理器（导入 executors 时会自动注册）
    task_manager = get_task_manager()
    registered_types = task_manager.get_registered_types()
    logger.info(f"任务管理器已初始化，已注册类型: {registered_types}")

    # 启动任务调度器
    from scheduler.task_scheduler import start_scheduler
    start_scheduler()
    logger.info("任务调度器已初始化")

    # 初始化 WebSocket 客户端（连接到 Java）
    from python_to_java_websocket import init_websocket_client
    # 不传url参数，使用从 JAVA_BASE_URL 环境变量读取的默认值
    ws_client = init_websocket_client()

    # 设置消息处理器
    def handle_java_message(data: dict):
        """处理来自 Java 的 WebSocket 消息"""
        msg_type = data.get('type')
        logger.info(f"收到 Java 消息: type={msg_type}")

        if msg_type == 'request':
            # 处理请求消息
            from action_handlers import invoke

            payload = data.get('payload', {})
            action = payload.get('action')
            request_id = data.get('requestId')

            logger.info(f"处理请求: action={action}, requestId={request_id}")

            # 调用 action handler
            result = invoke(action, payload)

            # 构造响应（直接发送，包含 requestId）
            response = {
                "type": "response",
                "requestId": request_id,
                "payload": {
                    "success": result.success,
                    "code": result.code,
                    "message": result.message,
                    "data": result.data
                },
                "timestamp": int(time.time() * 1000)
            }

            # 直接使用 ws_client.send() 发送响应
            ws_client.send(response)
            logger.info(f"已发送响应: requestId={request_id}, success={result.success}")

    ws_client.set_message_handler(handle_java_message)
    logger.info("WebSocket 客户端已初始化，连接到 Java")



@app.on_event("shutdown")
async def shutdown_event():
    """应用关闭时清理"""
    # 关闭 WebSocket 客户端
    from python_to_java_websocket import close_websocket_client
    close_websocket_client()
    logger.info("WebSocket 客户端已关闭")

    # 停止任务调度器
    from scheduler.task_scheduler import stop_scheduler
    stop_scheduler()
    logger.info("任务调度器已关闭")


@app.get("/api/tasks/types", response_model=ApiResponse)
async def get_task_types():
    """获取支持的任务类型"""
    task_manager = get_task_manager()
    return ApiResponse(
        success=True,
        data={
            "types": task_manager.get_registered_types()
        }
    )


@app.post("/api/tasks/execute", response_model=ApiResponse)
async def execute_task(request: TaskExecuteRequest):
    """
    执行任务

    Args:
        request: 任务执行请求，包含 taskType 和 params

    Returns:
        执行结果
    """
    try:
        logger.info(f"收到任务执行请求: taskType={request.taskType}")

        task_manager = get_task_manager()
        execution = task_manager.execute_task(request.taskType, request.params)

        return ApiResponse(
            success=execution.status.value == "completed",
            message=execution.error or "执行成功",
            data={
                "executionId": execution.execution_id,
                "status": execution.status.value,
                "progress": execution.progress,
                "result": execution.result,
                "error": execution.error
            }
        )

    except Exception as e:
        logger.error(f"任务执行失败: {str(e)}", exc_info=True)
        return ApiResponse(
            success=False,
            message=f"任务执行失败: {str(e)}",
            data=None
        )


@app.post("/api/tasks/execute-async", response_model=ApiResponse)
async def execute_task_async(request: TaskExecuteRequest):
    """
    异步执行任务

    Returns:
        executionId
    """
    try:
        logger.info(f"收到异步任务执行请求: taskType={request.taskType}")

        task_manager = get_task_manager()
        execution_id = task_manager.execute_task_async(request.taskType, request.params)

        return ApiResponse(
            success=True,
            message="任务已提交",
            data={
                "executionId": execution_id
            }
        )

    except Exception as e:
        logger.error(f"任务提交失败: {str(e)}", exc_info=True)
        return ApiResponse(
            success=False,
            message=f"任务提交失败: {str(e)}",
            data=None
        )


@app.get("/api/tasks/status/{execution_id}", response_model=ApiResponse)
async def get_task_status(execution_id: str):
    """查询任务状态"""
    task_manager = get_task_manager()
    execution = task_manager.get_execution(execution_id)

    if not execution:
        return ApiResponse(
            success=False,
            message=f"未找到执行记录: {execution_id}",
            data=None
        )

    return ApiResponse(
        success=True,
        data={
            "executionId": execution.execution_id,
            "taskType": execution.task_type,
            "status": execution.status.value,
            "progress": execution.progress,
            "result": execution.result,
            "error": execution.error,
            "startedAt": execution.started_at.isoformat() if execution.started_at else None,
            "completedAt": execution.completed_at.isoformat() if execution.completed_at else None
        }
    )


@app.post("/api/tasks/cancel", response_model=ApiResponse)
async def cancel_task(request: TaskCancelRequest):
    """取消任务"""
    task_manager = get_task_manager()
    success = task_manager.cancel_execution(request.executionId)

    return ApiResponse(
        success=success,
        message="取消成功" if success else "取消失败，任务可能已完成或不存在",
        data=None
    )


# ==================== 任务调度器 API ====================

@app.get("/api/scheduler/status", response_model=ApiResponse)
async def get_scheduler_status():
    """获取调度器状态"""
    from scheduler.task_scheduler import get_scheduler_status
    status = get_scheduler_status()
    return ApiResponse(
        success=True,
        data=status
    )


@app.post("/api/scheduler/resync", response_model=ApiResponse)
async def resync_scheduler():
    """重新同步调度器任务"""
    from scheduler.task_scheduler import resync_tasks
    status = resync_tasks()
    return ApiResponse(
        success=True,
        message="任务同步完成",
        data=status
    )


# ==================== 同步任务 API（兼容旧接口） ====================

class SyncRequest(BaseModel):
    """同步请求"""
    stock_code: str
    task_id: Optional[int] = None
    days: Optional[int] = 365


@app.post("/api/sync/execute", response_model=ApiResponse)
async def execute_sync(request: SyncRequest):
    """
    执行数据同步

    Args:
        request: 同步请求参数

    Returns:
        同步结果
    """
    try:
        logger.info(f"收到同步请求: stock_code={request.stock_code}, task_id={request.task_id}")

        result = sync_klines.execute_sync(
            stock_code=request.stock_code,
            task_id=request.task_id
        )

        return ApiResponse(
            success=result.get('success', False),
            message=result.get('message', ''),
            data={
                'records_count': result.get('records_count', 0),
                'total_fetched': result.get('total_fetched', 0),
                'task_id': result.get('task_id')
            }
        )

    except Exception as e:
        logger.error(f"执行同步失败: {str(e)}", exc_info=True)
        return ApiResponse(
            success=False,
            message=f"同步失败: {str(e)}",
            data=None
        )


@app.get("/api/sync/status/{task_id}", response_model=ApiResponse)
async def get_sync_status(task_id: int):
    """
    查询同步状态

    Args:
        task_id: 任务ID

    Returns:
        任务状态
    """
    # 简单实现：返回任务ID
    # 实际生产环境中应该从数据库或缓存中查询任务状态
    return ApiResponse(
        success=True,
        message="状态查询成功",
        data={
            'task_id': task_id,
            'status': 'completed'
        }
    )


# ==================== WebSocket 端点 ====================

from websocket.connection_manager import manager
from websocket.message_router import router


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket 端点，接受来自 Java 的连接"""
    client_id = str(uuid.uuid4())
    await manager.connect(websocket, client_id)

    try:
        while True:
            # 接收消息
            data = await websocket.receive_text()
            logger.info(f"收到 WebSocket 消息: {data}")

            # 路由消息
            await router.handle_message(websocket, data)

    except WebSocketDisconnect:
        await manager.disconnect(websocket)
        logger.info(f"WebSocket 客户端断开: {client_id}")

    except Exception as e:
        logger.error(f"WebSocket 错误: {str(e)}", exc_info=True)
        await manager.disconnect(websocket)


if __name__ == "__main__":
    import uvicorn

    # 启动 FastAPI
    uvicorn.run(app, host="0.0.0.0", port=8001, log_level="info")
