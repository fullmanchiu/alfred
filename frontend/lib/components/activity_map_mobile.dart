import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'dart:convert' as convert;
import '../config/app_config.dart';

class ActivityMapPlatform {
  late WebViewController _controller;

  Widget buildMap({
    required List<dynamic> points,
    required VoidCallback onReady,
    required VoidCallback onDataSent,
  }) {
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageFinished: (String url) {
            // 延迟2秒后发送数据
            Future.delayed(const Duration(seconds: 2), () {
              onReady();
              onDataSent();
            });
          },
        ),
      )
      ..loadRequest(Uri.parse('${AppConfig.mapHtmlUrl}?t=${DateTime.now().millisecondsSinceEpoch}'));

    return WebViewWidget(controller: _controller);
  }

  void sendRouteData(List<dynamic> points) {
    if (points.isNotEmpty) {
      final routeData = {
        'type': 'updateRoute',
        'points': points.map((point) => {
          'latitude': point['latitude'],
          'longitude': point['longitude'],
        }).toList(),
      };

      _controller.runJavaScript(
        "window.postMessage(${convert.jsonEncode(routeData)}, '*');"
      );
    }
  }
}
