import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;

// 条件导入
import 'activity_map_stub.dart'
    if (dart.library.html) 'activity_map_web.dart'
    if (dart.library.io) 'activity_map_mobile.dart';

class ActivityMap extends StatefulWidget {
  final List<dynamic> points;

  const ActivityMap({super.key, required this.points});

  @override
  State<ActivityMap> createState() => _ActivityMapState();
}

class _ActivityMapState extends State<ActivityMap> {
  bool _isLoading = true;
  final ActivityMapPlatform _platform = ActivityMapPlatform();

  @override
  void initState() {
    super.initState();

    if (widget.points.isNotEmpty) {
      // 所有平台延迟显示地图
      WidgetsBinding.instance.addPostFrameCallback((_) {
        Future.delayed(const Duration(seconds: 2), () {
          if (mounted) {
            setState(() {
              _isLoading = false;
            });
          }
        });
      });
    }
  }

  @override
  void didUpdateWidget(ActivityMap oldWidget) {
    super.didUpdateWidget(oldWidget);
    // 当points数据更新时重新发送路线数据
    if (widget.points != oldWidget.points && widget.points.isNotEmpty) {
      _sendRouteData();
    }
  }

  void _sendRouteData() {
    _platform.sendRouteData(widget.points);
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

    return Container(
      height: 300,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Stack(
        children: [
          _platform.buildMap(
            points: widget.points,
            onReady: () {
              if (mounted) {
                setState(() {
                  _isLoading = false;
                });
              }
            },
            onDataSent: () {
              _sendRouteData();
            },
          ),
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