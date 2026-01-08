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
import './screens/hub_screen.dart';
import './providers/accounting_provider.dart';
import './services/api_service.dart';
import './no_transition.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await ApiService.initialize();
  runApp(const AlfredApp());
}

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
        initialRoute: '/',
        routes: {
          '/': (context) => const SplashScreen(),
          '/hub': (context) => const HubScreen(),
          '/home': (context) => const HomeScreen(),
          '/dashboard': (context) => const DashboardScreen(),
          '/activities': (context) => const ActivitiesScreen(),
          '/activity_detail': (context) {
            final args = ModalRoute.of(context)?.settings.arguments;
            if (args is int) {
              return ActivityDetailScreen(activityId: args);
            }
            return const Scaffold(
              body: Center(
                child: Text('错误：缺少活动ID'),
              ),
            );
          },
          '/login': (context) => const LoginScreen(),
          '/register': (context) => const RegisterScreen(),
          '/profile': (context) => const ProfileScreen(),
          '/settings': (context) => const SettingsScreen(),
          '/upload': (context) => const UploadScreen(),
          '/records': (context) => const RecordsScreen(),
          '/body_settings': (context) => const BodySettingsScreen(),
          '/accounting': (context) => const AccountingScreen(),
          '/accounts': (context) => const AccountManagementScreen(),
          '/categories': (context) => const CategoryManagementScreen(),
          '/budgets': (context) => const BudgetManagementScreen(),
        },
      ),
    );
  }
}
