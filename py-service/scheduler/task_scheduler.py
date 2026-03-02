"""
任务调度器
使用 APScheduler 实现定时任务调度，通过 Java API 获取任务配置
所有时间使用北京时间 (UTC+8)
"""
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from logging_config import get_logger
from java_client import java_client
import sys
import os
from datetime import timezone, timedelta

# 添加项目路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

logger = get_logger('task_scheduler')

# 北京时区 (UTC+8)
BEIJING_TZ = timezone(timedelta(hours=8))

# 创建调度器，配置使用北京时间
scheduler = BackgroundScheduler(timezone=BEIJING_TZ)


def execute_task_wrapper(task_name: str, task_type: str, params: dict):
    """
    任务执行包装器，供调度器调用
    使用新的任务执行器，通过 Java API 保存执行记录

    Args:
        task_name: 任务名称
        task_type: 任务类型
        params: 任务参数
    """
    try:
        logger.info(f"调度器开始执行任务: {task_name} (type={task_type})")

        # 导入新的任务执行器（延迟导入避免循环依赖）
        from executor.task_executor import submit_task

        # 通过任务执行器提交任务（自动创建执行记录并异步执行）
        submit_task(task_name, task_type, params)

    except Exception as e:
        logger.error(f"任务执行异常: {task_name}, error={str(e)}", exc_info=True)


def sync_scheduled_tasks():
    """从 Java API 同步任务到调度器"""
    try:
        # 获取所有启用自动执行的任务
        tasks = java_client.get_enabled_scheduled_tasks()
        logger.info(f"从 Java API 获取到 {len(tasks)} 个启用自动执行的任务")

        # 获取当前已注册的任务
        current_jobs = scheduler.get_jobs()
        current_job_ids = {job.id for job in current_jobs}

        # 需要添加的任务 ID（排除内部的定期同步任务）
        task_ids_to_add = {str(task['id']) for task in tasks}
        # 保留定期同步任务，不被移除
        internal_jobs = {'task_sync_retry'}

        # 移除已不存在或禁用自动执行的任务（保留内部任务）
        for job in current_jobs:
            if job.id not in task_ids_to_add and job.id not in internal_jobs:
                scheduler.remove_job(job.id)
                logger.info(f"移除任务: {job.id} ({job.name})")

        # 添加或更新任务
        for task in tasks:
            task_id = str(task['id'])
            task_name = task['name']
            task_type = task['taskType']

            # 解析 scheduleRule
            schedule_rule = task.get('scheduleRule')
            schedule_type = None
            cron_expr = None
            interval_seconds = None

            if schedule_rule:
                if schedule_rule.startswith('cron:'):
                    schedule_type = 'cron'
                    cron_expr = schedule_rule.split(':', 1)[1]
                elif schedule_rule.startswith('interval:'):
                    schedule_type = 'interval'
                    interval_seconds = int(schedule_rule.split(':', 1)[1])

            params = task.get('params') or {}

            # 移除旧任务（如果存在）
            if scheduler.get_job(task_id):
                scheduler.remove_job(task_id)

            # 根据调度类型添加任务
            try:
                if schedule_type == 'cron' and cron_expr:
                    scheduler.add_job(
                        func=execute_task_wrapper,
                        trigger=CronTrigger.from_crontab(cron_expr, timezone=BEIJING_TZ),
                        id=task_id,
                        name=task_name,
                        args=[task_name, task_type, params],
                        replace_existing=True
                    )
                    logger.info(f"添加 cron 任务: {task_name}, 表达式: {cron_expr} (北京时间)")

                elif schedule_type == 'interval' and interval_seconds:
                    scheduler.add_job(
                        func=execute_task_wrapper,
                        trigger=IntervalTrigger(seconds=interval_seconds),
                        id=task_id,
                        name=task_name,
                        args=[task_name, task_type, params],
                        replace_existing=True
                    )
                    logger.info(f"添加 interval 任务: {task_name}, 间隔: {interval_seconds}秒")
                else:
                    logger.warning(f"任务调度配置无效: {task_name}, scheduleRule={schedule_rule}")

            except Exception as e:
                logger.error(f"添加任务失败: {task_name}, error={str(e)}")

        logger.info(f"任务同步完成，当前调度器中有 {len(scheduler.get_jobs())} 个任务")

    except Exception as e:
        # Java 后端可能未启动，只记录警告，不阻止服务启动
        logger.warning(f"同步任务失败（Java 后端可能未启动）: {str(e)}")
        logger.info(f"调度器将继续运行，当前有 {len(scheduler.get_jobs())} 个任务")


def start_scheduler():
    """启动调度器"""
    if not scheduler.running:
        sync_scheduled_tasks()
        scheduler.start()

        # 添加定期重试同步任务（每30秒尝试同步一次，直到 Java 后端就绪）
        scheduler.add_job(
            func=sync_scheduled_tasks,
            trigger=IntervalTrigger(seconds=30),
            id='task_sync_retry',
            name='定期同步任务',
            replace_existing=True
        )

        logger.info("任务调度器已启动（每30秒自动同步任务）")
    else:
        logger.warning("任务调度器已在运行")


def stop_scheduler():
    """停止调度器"""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("任务调度器已停止")


def get_scheduler_status():
    """获取调度器状态"""
    jobs = scheduler.get_jobs()
    return {
        'running': scheduler.running,
        'job_count': len(jobs),
        'jobs': [
            {
                'id': job.id,
                'name': job.name,
                'next_run_time': job.next_run_time.isoformat() if job.next_run_time else None
            }
            for job in jobs
        ]
    }


def resync_tasks():
    """重新同步任务（可通过 API 调用）"""
    sync_scheduled_tasks()
    return get_scheduler_status()
