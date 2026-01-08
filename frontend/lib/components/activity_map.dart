import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'dart:html' as html;
import 'dart:ui_web' as ui;
import 'dart:convert' as convert;
import 'package:webview_flutter/webview_flutter.dart' if (dart.library.io) 'package:webview_flutter/webview_flutter.dart';
import '../config/app_config.dart';

class ActivityMap extends StatefulWidget {
  final List<dynamic> points;

  const ActivityMap({super.key, required this.points});

  @override
  State<ActivityMap> createState() => _ActivityMapState();
}

class _ActivityMapState extends State<ActivityMap> {
  bool _isLoading = true;
  html.IFrameElement? _iframeElement;
  String? _iframeId;

  @override
  void initState() {
    super.initState();
    _iframeId = 'map-iframe-${DateTime.now().millisecondsSinceEpoch}';

    if (kIsWeb && widget.points.isNotEmpty) {
      // Web平台需要等待iframe加载完成
      WidgetsBinding.instance.addPostFrameCallback((_) {
        Future.delayed(const Duration(seconds: 2), () {
          if (mounted) {
            setState(() {
              _isLoading = false;
            });
            _sendRouteData();
          }
        });
      });
    } else if (!kIsWeb) {
      // 移动平台延迟显示地图
      Future.delayed(const Duration(seconds: 3), () {
        if (mounted) {
          setState(() {
            _isLoading = false;
          });
        }
      });
    }
  }

  void _sendRouteData() {
    // 在Web平台上，通过postMessage发送数据到iframe
    if (widget.points.isNotEmpty && kIsWeb && _iframeElement != null) {
      final routeData = {
        'type': 'updateRoute',
        'points': widget.points.map((point) => {
          'latitude': point['latitude'],
          'longitude': point['longitude'],
        }).toList(),
      };

      // 发送数据到iframe
      _iframeElement!.contentWindow?.postMessage(
        convert.jsonEncode(routeData),
        '*'
      );
    }
  }

  @override
  void didUpdateWidget(ActivityMap oldWidget) {
    super.didUpdateWidget(oldWidget);
    // 当points数据更新时重新发送路线数据
    if (widget.points != oldWidget.points && kIsWeb) {
      _sendRouteData();
    }
  }

  @override
  Widget build(BuildContext context) {
    if (widget.points.isEmpty) {
      return Container(
        height: 300,
        decoration: BoxDecoration(
          color: Colors.grey[200],
          borderRadius: BorderRadius.circular(12),
        ),
        child: const Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.map_outlined, size: 48, color: Colors.grey),
              SizedBox(height: 8),
              Text('暂无GPS轨迹数据'),
            ],
          ),
        ),
      );
    }

    if (kIsWeb) {
      // Web平台使用iframe
      return Container(
        height: 300,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey.shade300),
        ),
        child: Stack(
          children: [
            // 使用HtmlElementView来显示iframe
            _buildIframeMap(),
            if (_isLoading)
              Container(
                color: Colors.white,
                child: const Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      CircularProgressIndicator(),
                      SizedBox(height: 8),
                      Text('地图加载中...'),
                    ],
                  ),
                ),
              ),
          ],
        ),
      );
    } else {
      // 移动平台使用WebView
      return Container(
        height: 300,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey.shade300),
        ),
        child: Stack(
          children: [
            _buildWebViewMap(),
            if (_isLoading)
              Container(
                color: Colors.white,
                child: const Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      CircularProgressIndicator(),
                      SizedBox(height: 8),
                      Text('地图加载中...'),
                    ],
                  ),
                ),
              ),
          ],
        ),
      );
    }
  }

  Widget _buildIframeMap() {
    // 注册iframe元素
    if (_iframeId != null && _iframeElement == null) {
      _iframeElement = html.IFrameElement()
        ..src = '${AppConfig.mapHtmlUrl}?t=${DateTime.now().millisecondsSinceEpoch}'
        ..style.width = '100%'
        ..style.height = '100%'
        ..style.border = 'none'
        ..style.borderRadius = '12px';

      // 注册iframe元素到Flutter视图
      ui.platformViewRegistry.registerViewFactory(
        _iframeId!,
        (int viewId) => _iframeElement!,
      );
    }

    return HtmlElementView(
      viewType: _iframeId!,
    );
  }

  Widget _buildWebViewMap() {
    // 移动平台的WebView实现
    // 这里返回一个占位符，因为我们不包含webview_flutter包
    return Container(
      width: double.infinity,
      height: double.infinity,
      decoration: BoxDecoration(
        color: Colors.grey[100],
        borderRadius: BorderRadius.circular(12),
      ),
      child: const Center(
        child: Text('移动端地图'),
      ),
    );
  }
}