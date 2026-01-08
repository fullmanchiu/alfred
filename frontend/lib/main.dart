import 'package:flutter/material.dart';
import 'app.dart';
import 'services/api_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await ApiService.initialize();
  runApp(const AlfredApp());
}
