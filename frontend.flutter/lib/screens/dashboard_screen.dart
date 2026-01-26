import 'package:flutter/material.dart';
import '../components/profile_setup_dialog.dart';
import '../components/add_record_menu_dialog.dart';
import '../components/app_header.dart';
import '../components/responsive_layout.dart';
import '../services/api_service.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  bool _hasProfile = false;
  Map<String, dynamic> _userProfile = {};
  Map<String, dynamic> _healthProfile = {};
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _checkProfileStatus();
  }

  Future<void> _checkProfileStatus() async {
    try {
      // 获取用户信息
      final userData = await ApiService.getUserProfile();
      if (!mounted) return;
      setState(() {
        _userProfile = userData;
      });
      
      // 尝试获取健康资料
      try {
        final healthData = await ApiService.getHealthProfile();
        if (!mounted) return;
        setState(() {
          _healthProfile = healthData['data'] ?? {};
          _hasProfile = _healthProfile.isNotEmpty;
          _isLoading = false;
        });

        // 如果没有健康资料，可选地显示引导弹窗
        // 注释掉，避免对老用户强制显示
        // if (!_hasProfile) {
        //   _showProfileSetupDialog();
        // }
      } catch (e) {
        // 获取健康资料失败
        if (!mounted) return;
        setState(() {
          _isLoading = false;
          _hasProfile = false;
          _healthProfile = {};
        });

        // 检查是否是token失效
        if (e.toString().contains('登录已过期')) {
          Navigator.pushReplacementNamed(context, '/login');
        } else {
          // 显示错误提示
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('获取健康数据失败：$e')),
          );
        }
      }
    } catch (e) {
      // 获取用户信息失败
      if (!mounted) return;
      setState(() {
        _isLoading = false;
      });

      // 检查是否是token失效
      if (e.toString().contains('登录已过期')) {
        Navigator.pushReplacementNamed(context, '/login');
      } else {
        _showProfileSetupDialog();
      }
    }
  }

  Future<void> _showProfileSetupDialog() async {
    // 延迟显示对话框，确保页面已渲染
    await Future.delayed(const Duration(milliseconds: 500));
    
    if (!mounted) return;
    
    final result = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (context) => ProfileSetupDialog(
        onProfileCompleted: (profileData) async {
          // 将资料保存到后端健康资料表
          try {
            await ApiService.createHealthProfile(profileData);
            // 更新成功，重新获取健康资料
            final healthData = await ApiService.getHealthProfile();
            if (!mounted) return;
            setState(() {
              _healthProfile = healthData['data'] ?? {};
              _hasProfile = true;
            });
          } catch (e) {
            // 更新失败，显示错误信息
            if (!mounted) return;
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('更新资料失败：$e')),
            );
          }
        },
      ),
    );
    
    if (result == true && mounted) {
      // 用户完成了资料填写
      setState(() {
        _hasProfile = true;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        body: Center(
          child: CircularProgressIndicator(),
        ),
      );
    }

    return Scaffold(
      appBar: const AppHeader(title: '健康'),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          showDialog(
            context: context,
            builder: (context) => AddRecordMenuDialog(
              onRecordSaved: () {
                _checkProfileStatus();
              },
            ),
          );
        },
        icon: const Icon(Icons.add),
        label: const Text('添加记录'),
        backgroundColor: Colors.blue,
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.endFloat,
      body: ResponsiveMargin(
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ResponsiveText(
                '仪表盘',
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
                mobileStyle: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
                tabletStyle: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                ),
                desktopStyle: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),

              // 健康数据卡片 - 使用响应式网格
              ResponsiveGrid(
                mobileColumns: 2,
                tabletColumns: 3,
                desktopColumns: 5,
                childAspectRatio: 1.4,
                spacing: 12,
                runSpacing: 12,
                children: [
                  _buildHealthCard(
                    title: '身高',
                    value: _healthProfile.containsKey('height') && _healthProfile['height'] != null ? '${_healthProfile['height']} cm' : '--',
                    icon: Icons.height,
                    color: Colors.blue,
                  ),
                  _buildHealthCard(
                    title: '体重',
                    value: _healthProfile.containsKey('weight') && _healthProfile['weight'] != null ? '${_healthProfile['weight']} kg' : '--',
                    icon: Icons.line_weight,
                    color: Colors.green,
                  ),
                  _buildHealthCard(
                    title: '体脂率',
                    value: _healthProfile.containsKey('body_fat') && _healthProfile['body_fat'] != null ? '${_healthProfile['body_fat']}%' : '--',
                    icon: Icons.fitness_center,
                    color: Colors.orange,
                  ),
                  _buildHealthCard(
                    title: 'BMI',
                    value: _healthProfile.containsKey('bmi') && _healthProfile['bmi'] != null ? '${_healthProfile['bmi']}' : '--',
                    icon: Icons.monitor_weight,
                    color: Colors.purple,
                  ),
                  _buildHealthCard(
                    title: '肌肉率',
                    value: _healthProfile.containsKey('muscle_rate') && _healthProfile['muscle_rate'] != null ? '${_healthProfile['muscle_rate']}%' : '--',
                    icon: Icons.fitness_center,
                    color: Colors.teal,
                  ),
                  _buildHealthCard(
                    title: '水分率',
                    value: _healthProfile.containsKey('water_rate') && _healthProfile['water_rate'] != null ? '${_healthProfile['water_rate']}%' : '--',
                    icon: Icons.water_drop,
                    color: Colors.lightBlue,
                  ),
                  _buildHealthCard(
                    title: '骨量',
                    value: _healthProfile.containsKey('bone_mass') && _healthProfile['bone_mass'] != null ? '${_healthProfile['bone_mass']} kg' : '--',
                    icon: Icons.health_and_safety,
                    color: Colors.brown,
                  ),
                  _buildHealthCard(
                    title: '蛋白质率',
                    value: _healthProfile.containsKey('protein_rate') && _healthProfile['protein_rate'] != null ? '${_healthProfile['protein_rate']}%' : '--',
                    icon: Icons.fitness_center,
                    color: Colors.amber,
                  ),
                  _buildHealthCard(
                    title: '基础代谢',
                    value: _healthProfile.containsKey('bmr') && _healthProfile['bmr'] != null ? '${_healthProfile['bmr']} kcal' : '--',
                    icon: Icons.bolt,
                    color: Colors.red,
                  ),
                  _buildHealthCard(
                    title: '内脏脂肪',
                    value: _healthProfile.containsKey('visceral_fat') && _healthProfile['visceral_fat'] != null ? '${_healthProfile['visceral_fat']}' : '--',
                    icon: Icons.favorite,
                    color: Colors.pink,
                  ),
                ],
              ),
                const SizedBox(height: 20),

              // 训练趋势卡片
              ResponsiveCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    ResponsiveText(
                      '训练趋势',
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                      mobileStyle: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 12),
                    ResponsiveGrid(
                      mobileColumns: 2,
                      tabletColumns: 3,
                      desktopColumns: 4,
                      childAspectRatio: 1.4,
                      spacing: 12,
                      runSpacing: 12,
                      children: [
                        _buildTrendCard(
                          title: '本周训练',
                          value: '3 次',
                          subtitle: '比上周增加1次',
                          icon: Icons.trending_up,
                          color: Colors.green,
                        ),
                        _buildTrendCard(
                          title: '总时长',
                          value: '5.2 小时',
                          subtitle: '比上周增加0.8小时',
                          icon: Icons.access_time,
                          color: Colors.blue,
                        ),
                        _buildTrendCard(
                          title: '总里程',
                          value: '89.5 公里',
                          subtitle: '比上周增加12.3公里',
                          icon: Icons.straighten,
                          color: Colors.orange,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // 原快捷操作按钮已移除，改为悬浮按钮
            ],
          ),
        ),
      ),
    );
  }
  
  Widget _buildHealthCard({
    required String title,
    required String value,
    required IconData icon,
    required Color color,
  }) {
    return ResponsiveCard(
      color: color.withOpacity(0.1),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  ResponsiveText(
                    title,
                    style: TextStyle(
                      fontSize: 13,
                      color: Colors.grey[700],
                      fontWeight: FontWeight.w600,
                    ),
                    mobileStyle: TextStyle(
                      fontSize: 12,
                      color: Colors.grey[700],
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 4),
                  ResponsiveText(
                    value,
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                    mobileStyle: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
            SizedBox(width: 6),
            Icon(
              icon,
              color: color,
              size: 20,
            ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildTrendCard({
    required String title,
    required String value,
    required String subtitle,
    required IconData icon,
    required Color color,
  }) {
    return ResponsiveCard(
      color: color.withOpacity(0.1),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: color, size: 20),
                const SizedBox(width: 6),
                Expanded(
                  child: ResponsiveText(
                    title,
                    style: TextStyle(
                      fontSize: 13,
                      color: Colors.grey[700],
                      fontWeight: FontWeight.w600,
                    ),
                    mobileStyle: TextStyle(
                      fontSize: 12,
                      color: Colors.grey[700],
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            ResponsiveText(
              value,
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
              mobileStyle: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 4),
            ResponsiveText(
              subtitle,
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey[600],
              ),
              mobileStyle: TextStyle(
                fontSize: 11,
                color: Colors.grey[600],
              ),
            ),
          ],
        ),
      ),
    );
  }
}