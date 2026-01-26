import 'package:flutter/material.dart';
import '../services/api_service.dart';

class ErrorHandler {
  static void handleApiError(dynamic error, BuildContext context) {
    print('API Error: $error');
    
    String message;
    if (error.toString().contains('401')) {
      handleAuthError(context);
      return;
    } else if (error.toString().contains('Network')) {
      message = '网络连接失败，请检查网络设置';
    } else if (error.toString().contains('登录已过期') || error.toString().contains('登录已过期')) {
      handleAuthError(context);
      return;
    } else {
      message = error.toString().replaceAll('Exception: ', '').replaceAll('Error: ', '');
    }
    
    showErrorSnackBar(message, context);
  }
  
  static void showErrorSnackBar(String message, BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red,
        duration: const Duration(seconds: 3),
      ),
    );
  }
  
  static void showSuccessSnackBar(String message, BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.green,
        duration: const Duration(seconds: 2),
      ),
    );
  }
  
  static void showWarningSnackBar(String message, BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.orange,
        duration: const Duration(seconds: 3),
      ),
    );
  }
  
  static void handleAuthError(BuildContext context) {
    ApiService.clearAccessToken();
    Navigator.pushNamedAndRemoveUntil(context, '/login', (route) => false);
  }
  
  static String getErrorMessage(dynamic error) {
    if (error.toString().contains('Network')) {
      return '网络连接失败，请检查网络设置';
    } else if (error.toString().contains('401') || error.toString().contains('登录已过期')) {
      return '登录已过期，请重新登录';
    } else {
      return error.toString().replaceAll('Exception: ', '').replaceAll('Error: ', '');
    }
  }
}
