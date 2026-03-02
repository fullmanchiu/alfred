# Python 微服务运行环境
# 使用 Micromamba（快速、小体积）

FROM mambaorg/micromamba:latest

# 设置工作目录
WORKDIR /opt/service

# 复制启动脚本
COPY entrypoint.sh /opt/service/entrypoint.sh
RUN chmod +x /opt/service/entrypoint.sh

# 暴露端口
EXPOSE 8001

# 设置环境变量
ENV PYTHONUNBUFFERED=1
ENV PORT=8001

# 预安装 requests 用于健康检查（安装到 base 环境）
RUN micromamba install -y -n base -c conda-forge requests && \
    micromamba clean -y -n base --all

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD micromamba run -n base python -c "import requests; requests.get('http://localhost:8001/', timeout=5)" || exit 1

# 启动命令（代码通过挂载载入到 /app）
CMD ["/opt/service/entrypoint.sh"]
