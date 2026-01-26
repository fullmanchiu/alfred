import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import './screens/home_screen.dart';
import './screens/activities_screen.dart';
import './screens/activity_detail_screen.dart';
import './screens/login_screen.dart';
import './screens/register_screen.dart';
import './screens/profile_screen.dart';
import './screens/settings_screen.dart';
import './screens/upload_screen.dart';
import './screens/splash_screen.dart';
import './screens/dashboard_screen.dart';
import './screens/records_screen.dart';
import './screens/body_settings_screen.dart';
import './screens/accounting_screen.dart';
import './screens/account_management_screen.dart';
import './screens/category_management_screen.dart';
import './screens/budget_management_screen.dart';
import './screens/statistics_screen.dart';
import './screens/hub_screen.dart';
import './screens/icon_test_page.dart';
import './screens/icon_reference_page.dart';
import './providers/accounting_provider.dart';
import './services/api_service.dart';
import './no_transition.dart';

class AlfredApp extends StatelessWidget {
  const AlfredApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AccountingProvider(),
      child: MaterialApp(
        title: 'Alfred',
        theme: ThemeData(
          primarySwatch: Colors.blue,
          // 完全禁用页面切换动画 - 使用自定义无动画过渡
          // 让应用表现像网页一样，没有左右平移效果
          pageTransitionsTheme: const PageTransitionsTheme(
            builders: {
              TargetPlatform.android: NoTransitionsBuilder(),
              TargetPlatform.iOS: NoTransitionsBuilder(),
              TargetPlatform.linux: NoTransitionsBuilder(),
              TargetPlatform.macOS: NoTransitionsBuilder(),
              TargetPlatform.windows: NoTransitionsBuilder(),
            },
          ),
        ),
        debugShowCheckedModeBanner: false,
        // 使用 onGenerateRoute 来支持路径 URL 策略和登录状态检查
        initialRoute: '/',
        onGenerateRoute: (settings) {
          return _generateRoute(settings);
        },
      ),
    );
  }

  static Route<dynamic> _generateRoute(RouteSettings settings) {
    // 不需要认证的路由
    final publicRoutes = {'/login', '/register'};

    // 需要认证的路由处理
    if (!publicRoutes.contains(settings.name)) {
      // 返回一个会检查登录状态的页面
      return MaterialPageRoute(
        settings: settings,
        builder: (context) => _AuthWrapper(
          targetRoute: settings.name ?? '/',
          args: settings.arguments,
        ),
      );
    }

    // 公开路由直接返回
    switch (settings.name) {
      case '/login':
        return MaterialPageRoute(builder: (_) => const LoginScreen());
      case '/register':
        return MaterialPageRoute(builder: (_) => const RegisterScreen());
      default:
        // 根路由，重定向到 hub 或 login
        return MaterialPageRoute(
          builder: (_) => _AuthWrapper(targetRoute: '/hub', args: null),
        );
    }
  }
}

// 认证包装器，在 initState 中检查登录状态
class _AuthWrapper extends StatefulWidget {
  final String targetRoute;
  final Object? args;

  const _AuthWrapper({required this.targetRoute, this.args});

  @override
  State<_AuthWrapper> createState() => _AuthWrapperState();
}

class _AuthWrapperState extends State<_AuthWrapper> {
  bool _isChecking = true;
  bool _isAuthenticated = false;

  @override
  void initState() {
    super.initState();
    // 设置401错误回调，触发登录跳转
    ApiService.onUnauthorized = () {
      if (mounted) {
        // 使用 Navigator 确保跳转到登录页并清除所有历史
        Navigator.of(context).pushNamedAndRemoveUntil('/login', (route) => false);
      }
    };
    _checkAuth();
  }

  @override
  void dispose() {
    // 清理回调
    ApiService.onUnauthorized = null;
    super.dispose();
  }

  Future<void> _checkAuth() async {
    final token = await ApiService.getAccessToken();
    if (mounted) {
      setState(() {
        _isChecking = false;
        _isAuthenticated = token != null;
      });

      // 如果未认证，跳转到登录页
      if (!_isAuthenticated) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          Navigator.pushReplacementNamed(context, '/login');
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isChecking) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (!_isAuthenticated) {
      return const SizedBox.shrink(); // 正在跳转到登录页
    }

    // 已认证，返回目标页面
    return _buildPage(widget.targetRoute, widget.args);
  }

  Widget _buildPage(String route, Object? args) {
    switch (route) {
      case '/hub':
        return const HubScreen();
      case '/home':
        return const HomeScreen();
      case '/dashboard':
        return const DashboardScreen();
      case '/activities':
        return const ActivitiesScreen();
      case '/activity_detail':
        if (args is int) {
          return ActivityDetailScreen(activityId: args);
        }
        return const Scaffold(
          body: Center(child: Text('错误：缺少活动ID')),
        );
      case '/profile':
        return const ProfileScreen();
      case '/settings':
        return const SettingsScreen();
      case '/upload':
        return const UploadScreen();
      case '/records':
        return const RecordsScreen();
      case '/body_settings':
        return const BodySettingsScreen();
      case '/accounting':
        return const AccountingScreen();
      case '/accounts':
        return const AccountManagementScreen();
      case '/categories':
        return const CategoryManagementScreen();
      case '/budgets':
        return const BudgetManagementScreen();
      case '/statistics':
        return const StatisticsScreen();
      case '/icon-test':
        return const IconTestPage();
      case '/icon-reference':
        return const IconReferencePage();
      default:
        return const HubScreen();
    }
  }
}
