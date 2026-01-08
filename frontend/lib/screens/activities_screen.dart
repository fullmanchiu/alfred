import 'package:flutter/material.dart';
import '../components/app_header.dart';
import '../services/api_service.dart';

class ActivitiesScreen extends StatefulWidget {
  const ActivitiesScreen({super.key});

  @override
  State<ActivitiesScreen> createState() => _ActivitiesScreenState();
}

class _ActivitiesScreenState extends State<ActivitiesScreen> {
  List<dynamic> _activities = [];
  bool _isLoading = true;
  String _selectedType = '';

  // 格式化日期时间
  String _formatDateTime(String dateString) {
    try {
      final date = DateTime.parse(dateString);
      return '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')} ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
    } catch (e) {
      return dateString;
    }
  }

  // 格式化时长
  String _formatDuration(int? seconds) {
    if (seconds == null) return '未知';
    final hours = seconds ~/ 3600;
    final minutes = (seconds % 3600) ~/ 60;
    final secs = seconds % 60;

    if (hours > 0) {
      return '${hours}小时${minutes}分钟';
    } else if (minutes > 0) {
      return '${minutes}分钟${secs}秒';
    } else {
      return '${secs}秒';
    }
  }

  // 格式化距离
  String _formatDistance(double? distance) {
    if (distance == null) return '未知';
    if (distance >= 1000) {
      return '${(distance / 1000).toStringAsFixed(2)} km';
    } else {
      return '${distance.toStringAsFixed(1)} m';
    }
  }

  // 加载活动列表
  Future<void> _loadActivities() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final data = await ApiService.getActivities(type: _selectedType);
      setState(() {
        _activities = data['activities'] ?? [];
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _activities = [];
        _isLoading = false;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('加载活动失败: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  void initState() {
    super.initState();
    _loadActivities();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const AppHeader(
        title: '骑行',
      ),
      body: RefreshIndicator(
        onRefresh: _loadActivities,
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : _activities.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.directions_bike,
                          size: 80,
                          color: Colors.grey[400],
                        ),
                        const SizedBox(height: 16),
                        Text(
                          '暂无活动记录',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: Colors.grey[600],
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          '开始上传你的运动数据吧！',
                          style: TextStyle(
                            color: Colors.grey[500],
                          ),
                        ),
                      ],
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _activities.length,
                    itemBuilder: (context, index) {
                      final activity = _activities[index];
                      return Card(
                        elevation: 4,
                        margin: const EdgeInsets.only(bottom: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: InkWell(
                          onTap: () {
                            Navigator.pushNamed(
                              context,
                              '/activity_detail',
                              arguments: activity['id'],
                            );
                          },
                          borderRadius: BorderRadius.circular(12),
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // 活动头部
                                Row(
                                  children: [
                                    // 活动类型图标
                                    Container(
                                      width: 50,
                                      height: 50,
                                      decoration: BoxDecoration(
                                        color: _getActivityTypeColor(activity['type']).withOpacity(0.1),
                                        borderRadius: BorderRadius.circular(10),
                                      ),
                                      alignment: Alignment.center,
                                      child: Icon(
                                        _getActivityTypeIcon(activity['type']),
                                        color: _getActivityTypeColor(activity['type']),
                                        size: 24,
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    // 活动信息
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            activity['name'] ?? '未命名活动',
                                            style: const TextStyle(
                                              fontSize: 18,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            _formatDateTime(activity['created_at']),
                                            style: TextStyle(
                                              color: Colors.grey[600],
                                              fontSize: 14,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    // 活动类型标签
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 8,
                                        vertical: 4,
                                      ),
                                      decoration: BoxDecoration(
                                        color: _getActivityTypeColor(activity['type']).withOpacity(0.1),
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: Text(
                                        _getActivityTypeName(activity['type']),
                                        style: TextStyle(
                                          color: _getActivityTypeColor(activity['type']),
                                          fontSize: 12,
                                          fontWeight: FontWeight.w500,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 16),
                                // 活动数据
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                                  children: [
                                    // 距离
                                    Column(
                                      children: [
                                        Icon(
                                          Icons.straighten,
                                          color: Colors.blue,
                                          size: 20,
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          _formatDistance(activity['distance']),
                                          style: const TextStyle(
                                            fontSize: 16,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                        Text(
                                          '距离',
                                          style: TextStyle(
                                            color: Colors.grey[600],
                                            fontSize: 12,
                                          ),
                                        ),
                                      ],
                                    ),
                                    // 时长
                                    Column(
                                      children: [
                                        Icon(
                                          Icons.access_time,
                                          color: Colors.green,
                                          size: 20,
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          _formatDuration(activity['duration']),
                                          style: const TextStyle(
                                            fontSize: 16,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                        Text(
                                          '时长',
                                          style: TextStyle(
                                            color: Colors.grey[600],
                                            fontSize: 12,
                                          ),
                                        ),
                                      ],
                                    ),
                                    // 海拔增益
                                    Column(
                                      children: [
                                        Icon(
                                          Icons.terrain,
                                          color: Colors.orange,
                                          size: 20,
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          '${(activity['elevation_gain'] ?? 0).toInt()} m',
                                          style: const TextStyle(
                                            fontSize: 16,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                        Text(
                                          '爬升',
                                          style: TextStyle(
                                            color: Colors.grey[600],
                                            fontSize: 12,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
      ),
    );
  }

  // 获取活动类型图标
  IconData _getActivityTypeIcon(String? type) {
    switch (type) {
      case 'cycling':
        return Icons.directions_bike;
      case 'running':
        return Icons.directions_run;
      case 'walking':
        return Icons.directions_walk;
      default:
        return Icons.fitness_center;
    }
  }

  // 获取活动类型颜色
  Color _getActivityTypeColor(String? type) {
    switch (type) {
      case 'cycling':
        return Colors.orange;
      case 'running':
        return Colors.green;
      case 'walking':
        return Colors.blue;
      default:
        return Colors.grey;
    }
  }

  // 获取活动类型名称
  String _getActivityTypeName(String? type) {
    switch (type) {
      case 'cycling':
        return '骑行';
      case 'running':
        return '跑步';
      case 'walking':
        return '步行';
      default:
        return '运动';
    }
  }
}