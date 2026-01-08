import random
import json
import time
from datetime import datetime, timedelta
from typing import Dict, Optional
from app import config

# 阿里云SDK
from aliyunsdkcore.client import AcsClient
from aliyunsdkcore.acs_exception.exceptions import ServerException, ClientException
from aliyunsdkdysmsapi.request.v20170525.SendSmsRequest import SendSmsRequest


class PhoneVerificationService:
    """号码认证服务类（使用阿里云号码认证服务）"""
    
    def __init__(self):
        # 使用内存存储代替Redis
        self._storage = {}
        
        # 初始化阿里云客户端
        self.client = AcsClient(
            config.ALIYUN_ACCESS_KEY_ID,
            config.ALIYUN_ACCESS_KEY_SECRET,
            "cn-hangzhou"
        )
        
    def _get_verification_code_key(self, phone: str) -> str:
        """获取验证码存储键"""
        return f"sms_code:{phone}"
    
    def _get_send_frequency_key(self, phone: str) -> str:
        """获取发送频率限制键"""
        return f"sms_limit:{phone}"
    
    def generate_verification_code(self, length: int = config.CODE_LENGTH) -> str:
        """生成验证码"""
        return ''.join(random.choices('0123456789', k=length))
    
    def send_verification_code(self, phone_number: str) -> Dict:
        """
        发送号码认证验证码
        
        Args:
            phone_number: 手机号码
            
        Returns:
            Dict: 发送结果
        """
        try:
            # 检查发送频率
            freq_check = self.check_send_frequency(phone_number)
            if not freq_check["can_send"]:
                return {
                    "success": False,
                    "message": freq_check["message"]
                }
            
            # 生成验证码
            code = self.generate_verification_code()
            
            # 创建请求对象
            request = SendSmsRequest()
            request.set_SignName(config.ALIYUN_SMS_SIGN_NAME)
            request.set_TemplateCode(config.ALIYUN_SMS_TEMPLATE_CODE)
            request.set_PhoneNumbers(phone_number)
            # 正确设置模板参数，使用json.dumps生成JSON格式
            request.set_TemplateParam(json.dumps({"code": code}))
            
            # 调用阿里云发送短信
            try:
                response = self.client.do_action_with_exception(request)
                response_dict = json.loads(response.decode('utf-8'))
                
                if response_dict.get('Code') == 'OK':
                    # 存储验证码，设置过期时间
                    key = self._get_verification_code_key(phone_number)
                    self._storage[key] = {
                        "code": code,
                        "created_at": datetime.now().isoformat(),
                        "expires_at": (datetime.now() + timedelta(seconds=config.CODE_EXPIRE_SECONDS)).isoformat()
                    }
                    
                    # 更新发送频率记录
                    freq_key = self._get_send_frequency_key(phone_number)
                    self._storage[freq_key] = {
                        "last_sent": datetime.now().isoformat()
                    }
                    
                    print(f"阿里云返回响应: {json.dumps(response_dict)}")
                    return {
                        "success": True,
                        "message": "号码认证验证码发送成功"
                    }
                else:
                    error_message = f"阿里云返回错误: {response_dict.get('Code')} - {response_dict.get('Message')}"
                    print(error_message)
                    return {
                        "success": False,
                        "message": error_message
                    }
            except ServerException as e:
                error_message = f"阿里云服务器错误: {e.get_error_code()} - {e.get_error_msg()}"
                print(error_message)
                return {
                    "success": False,
                    "message": error_message
                }
            except ClientException as e:
                error_message = f"阿里云客户端错误: {e.get_error_code()} - {e.get_error_msg()}"
                print(error_message)
                return {
                    "success": False,
                    "message": error_message
                }
            
        except Exception as e:
            error_message = f"发送号码认证验证码异常: {str(e)}"
            print(error_message)
            return {
                "success": False,
                "message": error_message
            }
    
    def verify_code(self, phone_number: str, code: str) -> Dict:
        """
        验证验证码
        
        Args:
            phone_number: 手机号码
            code: 验证码
            
        Returns:
            Dict: 验证结果
        """
        try:
            key = self._get_verification_code_key(phone_number)
            
            # 检查验证码是否存在
            if key not in self._storage:
                return {
                    "success": False,
                    "message": "验证码不存在或已过期"
                }
            
            stored_data = self._storage[key]
            stored_code = stored_data["code"]
            expires_at = datetime.fromisoformat(stored_data["expires_at"])
            
            # 检查验证码是否过期
            if datetime.now() > expires_at:
                # 删除过期验证码
                del self._storage[key]
                return {
                    "success": False,
                    "message": "验证码已过期"
                }
            
            # 检查验证码是否正确
            if code != stored_code:
                return {
                    "success": False,
                    "message": "验证码错误"
                }
            
            # 验证成功，删除验证码
            del self._storage[key]
            
            return {
                "success": True,
                "message": "验证码验证成功"
            }
            
        except Exception as e:
            return {
                "success": False,
                "message": f"验证码验证失败: {str(e)}"
            }
    
    def check_send_frequency(self, phone_number: str) -> Dict:
        """
        检查发送频率限制
        
        Args:
            phone_number: 手机号码
            
        Returns:
            Dict: 检查结果
        """
        try:
            freq_key = self._get_send_frequency_key(phone_number)
            
            # 如果没有发送记录，允许发送
            if freq_key not in self._storage:
                return {
                    "can_send": True,
                    "message": "可以发送验证码"
                }
            
            freq_data = self._storage[freq_key]
            last_sent = datetime.fromisoformat(freq_data["last_sent"])
            
            # 检查是否在60秒内重复发送
            if datetime.now() - last_sent < timedelta(seconds=60):
                remaining_time = 60 - int((datetime.now() - last_sent).total_seconds())
                return {
                    "can_send": False,
                    "message": f"请等待{remaining_time}秒后再试",
                    "remaining_time": remaining_time
                }
            
            return {
                "can_send": True,
                "message": "可以发送验证码"
            }
            
        except Exception as e:
            return {
                "can_send": False,
                "message": f"检查发送频率时出错: {str(e)}"
            }