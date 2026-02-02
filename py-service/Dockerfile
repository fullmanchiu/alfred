# 股票分析微服务 Dockerfile
# Stock Analysis Microservice

FROM python:3.13-slim

# 设置工作目录
WORKDIR /app

# 安装系统依赖（TA-Lib 需要）
RUN apt-get update && apt-get install -y \
    wget \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# 安装 TA-Lib
RUN wget http://prdownloads.sourceforge.net/ta-lib/ta-lib-0.4.0-src.tar.gz && \
    tar -xzf ta-lib-0.4.0-src.tar.gz && \
    cd ta-lib && \
    ./configure --prefix=/usr && \
    make && \
    make install && \
    cd .. && \
    rm -rf ta-lib ta-lib-0.4.0-src.tar.gz

# 复制依赖文件
COPY requirements.txt .

# 安装 Python 依赖
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY api ./api
COPY modules ./modules

# 暴露端口
EXPOSE 8001

# 设置环境变量
ENV PYTHONUNBUFFERED=1
ENV PORT=8001

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8001/api/health')" || exit 1

# 启动命令
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
