import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../components/app_header.dart';

class RecordsScreen extends StatefulWidget {
  const RecordsScreen({super.key});

  @override
  State<RecordsScreen> createState() => _RecordsScreenState();
}

class _RecordsScreenState extends State<RecordsScreen> {
  List<Map<String, dynamic>> _healthRecords = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadHealthHistory();
  }

  Future<void> _loadHealthHistory() async {
    try {
      final historyData = await ApiService.getHealthHistory();
      setState(() {
        _healthRecords = List<Map<String, dynamic>>.from(historyData['data'] ?? []);
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('获取健康历史记录失败：$e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const AppHeader(title: 'Alfred'),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              '健康记录',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 20),
            
            if (_isLoading)
              const Center(
                child: CircularProgressIndicator(),
              )
            else if (_healthRecords.isEmpty)
              // 健康记录内容 - 空状态
              Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: const [
                    Icon(
                      Icons.history,
                      size: 80,
                      color: Colors.grey,
                    ),
                    SizedBox(height: 20),
                    Text(
                      '暂无健康记录',
                      style: TextStyle(
                        fontSize: 18,
                        color: Colors.grey,
                      ),
                    ),
                    SizedBox(height: 10),
                    Text(
                      '当您有健康数据时，这里会显示您的记录历史',
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              )
            else
              // 健康记录列表
              ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _healthRecords.length,
                itemBuilder: (context, index) {
                  final record = _healthRecords[index];
                  return _HealthRecordCard(record: record);
                },
              ),
          ],
        ),
      ),
    );
  }
}

// 健康记录卡片组件，支持折叠/展开
class _HealthRecordCard extends StatefulWidget {
  final Map<String, dynamic> record;
  const _HealthRecordCard({required this.record});

  @override
  State<_HealthRecordCard> createState() => _HealthRecordCardState();
}

class _HealthRecordCardState extends State<_HealthRecordCard> {
  bool _isExpanded = false;

  Widget _buildHealthRecordItem(String title, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey[200]!),
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
            style: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final record = widget.record;
    final createdAt = record['created_at'] ?? '';
    final formattedDate = createdAt.isNotEmpty ? createdAt.substring(0, 19) : '未知时间';

    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      margin: const EdgeInsets.only(bottom: 16),
      child: Column(
        children: [
          // 卡片头部 - 可点击展开/折叠
          InkWell(
            onTap: () {
              setState(() {
                _isExpanded = !_isExpanded;
              });
            },
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        formattedDate,
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Colors.blue,
                        ),
                      ),
                      const SizedBox(height: 8),
                      // 显示基本信息
                      Row(
                        children: [
                          Text(
                            record['height'] != null ? '身高: ${record['height']} cm  ' : '',
                            style: const TextStyle(fontSize: 14),
                          ),
                          Text(
                            record['weight'] != null ? '体重: ${record['weight']} kg  ' : '',
                            style: const TextStyle(fontSize: 14),
                          ),
                          Text(
                            record['bmi'] != null ? 'BMI: ${record['bmi']}' : '',
                            style: const TextStyle(fontSize: 14),
                          ),
                        ],
                      ),
                    ],
                  ),
                  Icon(
                    _isExpanded ? Icons.expand_less : Icons.expand_more,
                    color: Colors.blue,
                  ),
                ],
              ),
            ),
          ),
          
          // 展开内容
          if (_isExpanded)
            Padding(
              padding: const EdgeInsets.only(left: 16, right: 16, bottom: 16),
              child: Column(
                children: [
                  const Divider(),
                  const SizedBox(height: 12),
                  
                  // 健康数据卡片网格 - 只显示非基本信息
                  GridView.count(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    crossAxisCount: 2,
                    mainAxisSpacing: 12,
                    crossAxisSpacing: 12,
                    childAspectRatio: 1.5,
                    children: [
                      _buildHealthRecordItem('体脂率', record['body_fat'] != null ? '${record['body_fat']}%' : '--', Icons.fitness_center, Colors.orange),
                      _buildHealthRecordItem('肌肉率', record['muscle_rate'] != null ? '${record['muscle_rate']}%' : '--', Icons.health_and_safety, Colors.teal),
                      _buildHealthRecordItem('水分率', record['water_rate'] != null ? '${record['water_rate']}%' : '--', Icons.water_drop, Colors.lightBlue),
                      _buildHealthRecordItem('骨量', record['bone_mass'] != null ? '${record['bone_mass']} kg' : '--', Icons.health_and_safety, Colors.brown),
                      _buildHealthRecordItem('蛋白质率', record['protein_rate'] != null ? '${record['protein_rate']}%' : '--', Icons.fitness_center, Colors.amber),
                      _buildHealthRecordItem('基础代谢', record['bmr'] != null ? '${record['bmr']} kcal' : '--', Icons.bolt, Colors.red),
                      _buildHealthRecordItem('内脏脂肪', record['visceral_fat'] != null ? '${record['visceral_fat']}' : '--', Icons.favorite, Colors.pink),
                    ],
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}