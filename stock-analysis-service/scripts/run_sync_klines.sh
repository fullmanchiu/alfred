#!/bin/bash
# 股票K线数据同步定时任务执行脚本

# 进入脚本所在目录
cd "$(dirname "$0")/.."

# 加载环境变量
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# 激活虚拟环境并执行同步脚本
source venv/bin/activate
python scheduler/sync_klines.py
