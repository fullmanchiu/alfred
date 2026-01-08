import 'package:flutter/material.dart';
import '../services/api_service.dart';

/// 认证辅助工具类
/// 用于统一处理登录状态检查和导航
class AuthHelper {
  /// 检查用户是否已登录
  static Future<bool> isLoggedIn() async {
    final token = await ApiService.getAccessToken();
    return token != null && token.isNotEmpty;
  }

  /// 验证登录状态，如果未登录则跳转到登录页面
  /// 返回 true 表示已登录，false 表示未登录并已跳转
  static Future<bool> checkLogin(BuildContext context) async {
    final loggedIn = await isLoggedIn();

    if (!loggedIn) {
      // 显示提示并跳转到登录页面
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('请先登录'),
            duration: Duration(seconds: 2),
            backgroundColor: Colors.orange,
          ),
        );

        // 跳转到登录页面
        Navigator.pushReplacementNamed(context, '/login');
      }
      return false;
    }

    return true;
  }

  /// 处理API调用中的认证错误
  /// 如果是登录过期（401），清除token并跳转到登录页面
  /// 返回 true 表示需要处理错误，false 表示可以继续
  static Future<bool> handleAuthError(
    BuildContext context,
    dynamic error, {
    String? customMessage,
  }) async {
    // 检查是否是认证相关的错误
    final errorMessage = error.toString();
    final isAuthError = errorMessage.contains('登录已过期') ||
        errorMessage.contains('401') ||
        errorMessage.contains('Unauthorized');

    if (isAuthError) {
      if (context.mounted) {
        // 显示提示
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(customMessage ?? '登录已过期，请重新登录'),
            duration: const Duration(seconds: 2),
            backgroundColor: Colors.orange,
            action: SnackBarAction(
              label: '去登录',
              textColor: Colors.white,
              onPressed: () {
                Navigator.pushReplacementNamed(context, '/login');
              },
            ),
          ),
        );

        // 延迟跳转，让用户看到提示
        await Future.delayed(const Duration(milliseconds: 1500));

        if (context.mounted) {
          // 清除所有路由栈，跳转到登录页
          Navigator.of(context).pushNamedAndRemoveUntil(
            '/login',
            (route) => false,
          );
        }
      }
      return true;
    }

    return false;
  }

  /// 安全执行需要认证的操作
  /// 在执行前检查登录状态，执行后处理认证错误
  static Future<T?> executeWithAuthCheck<T>({
    required BuildContext context,
    required Future<T> Function() operation,
    String? errorMessage,
  }) async {
    // 1. 检查登录状态
    final isLoggedIn = await checkLogin(context);
    if (!isLoggedIn) {
      return null;
    }

    // 2. 执行操作
    try {
      return await operation();
    } catch (e) {
      // 3. 处理认证错误
      final isAuthError = await handleAuthError(
        context,
        e,
        customMessage: errorMessage,
      );

      // 如果不是认证错误，重新抛出异常
      if (!isAuthError && context.mounted) {
        rethrow;
      }
      return null;
    }
  }
}
