import 'package:flutter/material.dart';
import '../services/api_service.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _checkLoginStatus();
  }

  Future<void> _checkLoginStatus() async {
    // 检查是否有访问令牌
    final accessToken = await ApiService.getAccessToken();
    
    if (accessToken == null) {
      // 没有令牌，跳转到登录页面
      _navigateToLogin();
    } else {
      // 有令牌，跳转到主页
      // 不再验证令牌有效性，由后端API处理
      _navigateToHub();
    }
  }

  void _navigateToLogin() {
    // 使用WidgetsBinding确保在导航之前，导航器已经完全初始化
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Navigator.pushReplacementNamed(context, '/login');
    });
  }

  void _navigateToHub() {
    // 使用WidgetsBinding确保在导航之前，导航器已经完全初始化
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Navigator.pushReplacementNamed(context, '/hub');
    });
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: CircularProgressIndicator(),
      ),
    );
  }
}
