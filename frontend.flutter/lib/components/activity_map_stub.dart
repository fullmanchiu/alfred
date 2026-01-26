import 'package:flutter/material.dart';
import 'dart:convert' as convert;

// 平台抽象类
abstract class ActivityMapPlatform {
  Widget buildMap({
    required List<dynamic> points,
    required VoidCallback onReady,
    required VoidCallback onDataSent,
  });

  void sendRouteData(List<dynamic> points);
}

// 默认实现（非 Web 和非移动平台）
class DefaultActivityMapPlatform extends ActivityMapPlatform {
  @override
  Widget buildMap({
    required List<dynamic> points,
    required VoidCallback onReady,
    required VoidCallback onDataSent,
  }) {
    Future.delayed(const Duration(seconds: 2), onReady);
    return _buildPlaceholderMap();
  }

  @override
  void sendRouteData(List<dynamic> points) {
    // 桌面平台不支持发送数据
  }

  Widget _buildPlaceholderMap() {
    return Container(
      width: double.infinity,
      height: double.infinity,
      decoration: BoxDecoration(
        color: Colors.grey[100],
        borderRadius: BorderRadius.circular(12),
      ),
      child: const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.map_outlined, size: 48, color: Colors.grey),
            SizedBox(height: 8),
            Text('桌面端地图暂不可用'),
          ],
        ),
      ),
    );
  }
}

// 导出默认平台实现
final ActivityMapPlatform = DefaultActivityMapPlatform();
