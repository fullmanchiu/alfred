import 'package:flutter/material.dart';
import 'dart:html' as html;
import 'dart:ui_web' as ui;
import 'dart:convert' as convert;
import '../config/app_config.dart';

class ActivityMapPlatform {
  html.IFrameElement? _iframeElement;
  String? _iframeId;
  bool _isRegistered = false;

  Widget buildMap({
    required List<dynamic> points,
    required VoidCallback onReady,
    required VoidCallback onDataSent,
  }) {
    _iframeId = 'map-iframe-${DateTime.now().millisecondsSinceEpoch}';

    // 先注册iframe
    _registerIframe();

    // 延迟2秒后通知准备好
    Future.delayed(const Duration(seconds: 2), () {
      onReady();
      onDataSent();
    });

    return HtmlElementView(
      viewType: _iframeId!,
    );
  }

  void _registerIframe() {
    if (_iframeId != null && !_isRegistered) {
      _iframeElement = html.IFrameElement()
        ..src = '${AppConfig.mapHtmlUrl}?t=${DateTime.now().millisecondsSinceEpoch}'
        ..style.width = '100%'
        ..style.height = '100%'
        ..style.border = 'none'
        ..style.borderRadius = '12px';

      ui.platformViewRegistry.registerViewFactory(
        _iframeId!,
        (int viewId) => _iframeElement!,
      );
      _isRegistered = true;
    }
  }

  void sendRouteData(List<dynamic> points) {
    if (points.isNotEmpty && _iframeElement != null) {
      final routeData = {
        'type': 'updateRoute',
        'points': points.map((point) => {
          'latitude': point['latitude'],
          'longitude': point['longitude'],
        }).toList(),
      };

      _iframeElement!.contentWindow?.postMessage(
        convert.jsonEncode(routeData),
        '*'
      );
    }
  }
}
