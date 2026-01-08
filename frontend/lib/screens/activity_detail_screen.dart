import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../components/activity_map.dart';

class ActivityDetailScreen extends StatefulWidget {
  final int activityId;

  const ActivityDetailScreen({super.key, required this.activityId});

  @override
  State<ActivityDetailScreen> createState() => _ActivityDetailScreenState();
}

class _ActivityDetailScreenState extends State<ActivityDetailScreen> {
  Map<String, dynamic> _activity = {};
  bool _isLoading = true;

  // 格式化日期时间
  String _formatDateTime(String? dateString) {
    if (dateString == null) return '--';
    try {
      final date = DateTime.parse(dateString);
      return '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')} ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
    } catch (e) {
      return dateString;
    }
  }

  // 格式化时长
  String _formatDuration(int? seconds) {
    if (seconds == null) return '--';
    final hours = seconds ~/ 3600;
    final minutes = (seconds % 3600) ~/ 60;
    final secs = seconds % 60;

    if (hours > 0) {
      return '${hours}:${minutes.toString().padLeft(2, '0')}:${secs.toString().padLeft(2, '0')}';
    } else {
      return '${minutes}:${secs.toString().padLeft(2, '0')}';
    }
  }

  // 加载活动详情
  Future<void> _loadActivityDetail() async {
    try {
      final data = await ApiService.getActivityDetail(widget.activityId);
      setState(() {
        _activity = data;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('加载活动详情失败: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  void initState() {
    super.initState();
    _loadActivityDetail();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_activity['name'] ?? '活动详情'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit),
            onPressed: () {
              // TODO: 实现编辑功能
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('编辑功能开发中...')),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.delete),
            onPressed: () {
              // TODO: 实现删除功能
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('删除功能开发中...')),
              );
            },
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 活动基本信息
                  Card(
                    elevation: 4,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _activity['name'] ?? '未命名活动',
                            style: const TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            _formatDateTime(_activity['created_at']),
                            style: TextStyle(
                              color: Colors.grey[600],
                              fontSize: 16,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: _getActivityTypeColor(_activity['type']).withOpacity(0.1),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              _getActivityTypeName(_activity['type']),
                              style: TextStyle(
                                color: _getActivityTypeColor(_activity['type']),
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // 主要统计数据
                  Row(
                    children: [
                      Expanded(
                        child: _buildStatCard(
                          title: '距离',
                          value: _activity['distance'] != null
                              ? '${(_activity['distance'] / 1000).toStringAsFixed(2)} km'
                              : '--',
                          icon: Icons.straighten,
                          color: Colors.blue,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _buildStatCard(
                          title: '时长',
                          value: _formatDuration(_activity['duration']),
                          icon: Icons.access_time,
                          color: Colors.green,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: _buildStatCard(
                          title: '平均速度',
                          value: _activity['avg_speed'] != null
                              ? '${_activity['avg_speed'].toStringAsFixed(1)} km/h'
                              : '--',
                          icon: Icons.speed,
                          color: Colors.orange,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _buildStatCard(
                          title: '爬升',
                          value: _activity['total_elevation'] != null
                              ? '${_activity['total_elevation'].toInt()} m'
                              : '--',
                          icon: Icons.terrain,
                          color: Colors.purple,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // 心率和功率数据
                  Row(
                    children: [
                      Expanded(
                        child: _buildDetailCard(
                          title: '心率数据',
                          children: [
                            _buildDetailItem(
                              label: '平均心率',
                              value: _activity['avg_heart_rate'] != null
                                  ? '${_activity['avg_heart_rate'].toInt()} bpm'
                                  : '--',
                            ),
                            _buildDetailItem(
                              label: '最大心率',
                              value: _activity['max_heart_rate'] != null
                                  ? '${_activity['max_heart_rate'].toInt()} bpm'
                                  : '--',
                            ),
                            _buildDetailItem(
                              label: '卡路里消耗',
                              value: _activity['calories'] != null
                                  ? '${_activity['calories'].toInt()} kcal'
                                  : '--',
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: _buildDetailCard(
                          title: '功率数据',
                          children: [
                            _buildDetailItem(
                              label: '平均功率',
                              value: _activity['avg_power'] != null
                                  ? '${_activity['avg_power'].toInt()} W'
                                  : '--',
                            ),
                            _buildDetailItem(
                              label: '最大功率',
                              value: _activity['max_power'] != null
                                  ? '${_activity['max_power'].toInt()} W'
                                  : '--',
                            ),
                            _buildDetailItem(
                              label: '踏频',
                              value: _activity['avg_cadence'] != null
                                  ? '${_activity['avg_cadence'].toInt()} rpm'
                                  : '--',
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // 分段数据
                  if (_activity['laps'] != null && _activity['laps'].isNotEmpty) ...[
                    Card(
                      elevation: 4,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              '分段数据',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 12),
                            SingleChildScrollView(
                              scrollDirection: Axis.horizontal,
                              child: DataTable(
                                columns: const [
                                  DataColumn(label: Text('分段')),
                                  DataColumn(label: Text('时长')),
                                  DataColumn(label: Text('距离')),
                                  DataColumn(label: Text('平均心率')),
                                  DataColumn(label: Text('平均功率')),
                                ],
                                rows: (_activity['laps'] as List).map((lap) {
                                  return DataRow(
                                    cells: [
                                      DataCell(Text('#${lap['lap_index'] + 1}')),
                                      DataCell(Text(_formatDuration(lap['elapsed_time']))),
                                      DataCell(Text('${(lap['distance'] / 1000).toStringAsFixed(2)} km')),
                                      DataCell(Text(lap['avg_heart_rate'] != null
                                          ? '${lap['avg_heart_rate'].toInt()} bpm'
                                          : '--')),
                                      DataCell(Text(lap['avg_power'] != null
                                          ? '${lap['avg_power'].toInt()} W'
                                          : '--')),
                                    ],
                                  );
                                }).toList(),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],

                  // GPS轨迹地图
                  if (_activity['points'] != null) ...[
                    const SizedBox(height: 16),
                    Card(
                      elevation: 4,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'GPS轨迹',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 12),
                            ActivityMap(points: _activity['points'] ?? []),
                          ],
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
    );
  }

  Widget _buildStatCard({
    required String title,
    required String value,
    required IconData icon,
    required Color color,
  }) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              color.withOpacity(0.1),
              color.withOpacity(0.2),
            ],
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.grey[600],
                  ),
                ),
                Icon(
                  icon,
                  color: color,
                  size: 20,
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              value,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailCard({
    required String title,
    required List<Widget> children,
  }) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            ...children,
          ],
        ),
      ),
    );
  }

  Widget _buildDetailItem({
    required String label,
    required String value,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              color: Colors.grey[600],
              fontSize: 14,
            ),
          ),
          Text(
            value,
            style: const TextStyle(
              fontWeight: FontWeight.w600,
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }

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