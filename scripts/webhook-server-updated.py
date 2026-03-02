#!/usr/bin/env python3
"""
Alfred Webhook Server (支持股票分析微服务)
接收 GitHub Actions webhook 并触发自动部署
"""

import http.server
import json
import subprocess
import hmac
import hashlib
import os
import logging
from urllib.parse import urlparse

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/root/webhook/webhook-server.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# 环境变量
WEBHOOK_PORT = int(os.environ.get('WEBHOOK_PORT', '8080'))
WEBHOOK_SECRET = os.environ.get('WEBHOOK_SECRET', '')
ALLOWED_REPOS = os.environ.get('ALLOWED_REPOS', '').split(',')
DEPLOY_SCRIPT = '/root/alfred/deploy.sh'  # 部署脚本路径


class WebhookHandler(http.server.BaseHTTPRequestHandler):
    """Webhook 请求处理器"""

    def verify_signature(self, payload, signature, timestamp):
        """验证 webhook 签名"""
        if not WEBHOOK_SECRET:
            logger.warning("未配置 WEBHOOK_SECRET，跳过签名验证")
            return True

        # 构建预期的签名
        expected_payload = f"version={payload.get('version', '')}&timestamp={timestamp}"
        expected_sig = hmac.new(
            WEBHOOK_SECRET.encode(),
            expected_payload.encode(),
            hashlib.sha256
        ).digest()

        # Base64 编码
        import base64
        expected_sig_b64 = base64.b64encode(expected_sig).decode()

        # 使用 hmac.compare_digest 防止时序攻击
        return hmac.compare_digest(signature, expected_sig_b64)

    def send_http_response(self, status_code, content_type, body):
        """发送 HTTP 响应"""
        super().send_response(status_code)
        self.send_header('Content-Type', content_type)
        self.end_headers()
        self.wfile.write(body.encode('utf-8'))

    def send_json_response(self, status_code, data):
        """发送 JSON 响应"""
        self.send_http_response(
            status_code,
            'application/json',
            json.dumps(data, ensure_ascii=False, indent=2)
        )

    def do_GET(self):
        """处理 GET 请求（健康检查）"""
        if self.path == '/health':
            self.send_json_response(200, {
                "status": "ok",
                "service": "alfred-webhook-server",
                "version": "2.0.0"
            })
        else:
            self.send_json_response(404, {"error": "Not found"})

    def do_POST(self):
        """处理 POST 请求（webhook）"""
        try:
            # 读取请求体
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            payload = json.loads(body.decode('utf-8'))

            logger.info(f"收到 webhook: {payload.get('version', 'unknown')}")

            # 验证签名
            signature = self.headers.get('X-Webhook-Signature', '')
            timestamp = self.headers.get('X-Webhook-Timestamp', '')

            if not self.verify_signature(payload, signature, timestamp):
                logger.warning("签名验证失败")
                self.send_json_response(403, {"error": "Invalid signature"})
                return

            # 验证仓库
            repository = payload.get('repository', '')
            if ALLOWED_REPOS and repository not in ALLOWED_REPOS:
                logger.warning(f"不允许的仓库: {repository}")
                self.send_json_response(403, {"error": "Repository not allowed"})
                return

            # 提取 artifacts URL
            artifacts = payload.get('artifacts', {})
            version = payload.get('version', 'latest')
            backend_url = artifacts.get('backend', '')
            frontend_url = artifacts.get('frontend', '')
            python_service_url = artifacts.get('pythonService', '')  # Python服务

            logger.info(f"版本: {version}")
            logger.info(f"后端: {backend_url}")
            logger.info(f"前端: {frontend_url}")
            logger.info(f"Python服务: {python_service_url}")

            # 异步执行部署脚本
            subprocess.Popen([
                DEPLOY_SCRIPT,
                version,
                backend_url,
                frontend_url,
                python_service_url  # Python服务参数
            ])

            # 立即返回响应
            self.send_json_response(200, {
                "success": True,
                "message": "部署已触发",
                "version": version
            })

            logger.info("部署脚本已启动")

        except json.JSONDecodeError as e:
            logger.error(f"JSON 解析失败: {e}")
            self.send_json_response(400, {"error": "Invalid JSON"})
        except Exception as e:
            logger.error(f"处理 webhook 失败: {e}")
            self.send_json_response(500, {"error": str(e)})


def main():
    """启动 webhook 服务器"""
    logger.info(f"🚀 启动 Alfred Webhook Server v2.0.0")
    logger.info(f"📍 监听端口: {WEBHOOK_PORT}")
    logger.info(f"🔐 签名验证: {'启用' if WEBHOOK_SECRET else '禁用'}")
    logger.info(f"📁 允许的仓库: {ALLOWED_REPOS}")

    server = http.server.HTTPServer(('0.0.0.0', WEBHOOK_PORT), WebhookHandler)

    try:
        logger.info("✅ Webhook 服务器已启动")
        server.serve_forever()
    except KeyboardInterrupt:
        logger.info("⏹️  收到停止信号，正在关闭...")
        server.shutdown()
        logger.info("✅ Webhook 服务器已关闭")


if __name__ == '__main__':
    main()
