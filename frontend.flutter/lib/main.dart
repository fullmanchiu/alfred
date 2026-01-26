import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_web_plugins/flutter_web_plugins.dart';
import 'package:provider/provider.dart';
import 'app.dart';
import 'services/api_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // 使用路径 URL 策略（让 URL 反映路由，刷新时保持页面）
  // 这样浏览器刷新时不会丢失当前页面
  usePathUrlStrategy();

  await ApiService.initialize();
  runApp(const AlfredApp());
}
