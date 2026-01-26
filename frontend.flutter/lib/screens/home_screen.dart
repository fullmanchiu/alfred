import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../screens/login_screen.dart';
import '../screens/dashboard_screen.dart';
import '../screens/settings_screen.dart';
import '../screens/profile_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  Map<String, dynamic> _userProfile = {};
  Map<String, dynamic> _activities = {};
  List<dynamic> _activityList = [];
  String _selectedActivityType = '';
  bool _isLoading = true;

  // 格式化日期时间
  String _formatDateTime(String dateString) {
    final date = DateTime.parse(dateString);
    return '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')} ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
  }

  // 格式化时长
  String _formatDuration(int seconds) {
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

  // 加载用户信息
  Future<void> _loadUserInfo() async {
    try {
      final data = await ApiService.getUserProfile();
      setState(() {
        _userProfile = data;
      });
    } catch (e) {
      // 保持默认值，不显示错误信息
    }
  }

  // 加载运动记录
  Future<void> _loadActivities() async {
    try {
      final data = await ApiService.getActivities(type: _selectedActivityType);
      setState(() {
        _activities = data;
        _activityList = data['activities'] ?? [];
      });
    } catch (e) {
      // 设置默认值，确保页面能正常展示
      setState(() {
        _activities = {
          'stats': {
            'total_activities': 0,
            'total_distance': 0,
            'total_duration': 0,
            'total_elevation': 0
          }
        };
        _activityList = [];
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  void initState() {
    super.initState();
    _checkLoginStatus();
  }
  
  Future<void> _checkLoginStatus() async {
    // 检查是否有访问令牌
    final accessToken = await ApiService.getAccessToken();
    
    if (accessToken == null) {
      // 没有令牌，跳转到登录页面
      WidgetsBinding.instance.addPostFrameCallback((_) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (context) => const LoginScreen()),
        );
      });
      return;
    }
    
    // 有令牌，验证令牌是否有效
    try {
      await ApiService.getUserProfile();
      // 令牌有效，跳转到仪表盘页面
      WidgetsBinding.instance.addPostFrameCallback((_) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (context) => const DashboardScreen()),
        );
      });
    } catch (e) {
      // 令牌无效，清除令牌并跳转到登录页面
      await ApiService.clearAccessToken();
      WidgetsBinding.instance.addPostFrameCallback((_) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (context) => const LoginScreen()),
        );
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Alfred'),
        actions: [
          IconButton(
            icon: const Icon(Icons.person),
            onPressed: () {
              // 跳转到个人资料页
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const ProfileScreen()),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: () {
              // 跳转到设置页
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const SettingsScreen()),
              );
            },
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  // 欢迎卡片
                  Card(
                    elevation: 8,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        children: [
                          // 头像和用户信息
                          Row(
                            children: [
                              // 头像
                              Container(
                                width: 80,
                                height: 80,
                                decoration: BoxDecoration(
                                  color: Colors.orange,
                                  borderRadius: BorderRadius.circular(40),
                                ),
                                alignment: Alignment.center,
                                child: Text(
                                  _userProfile['nickname']?.isNotEmpty == true
                                      ? _userProfile['nickname'][0].toUpperCase()
                                      : _userProfile['username']?.isNotEmpty == true
                                          ? _userProfile['username'][0].toUpperCase()
                                          : 'U',
                                  style: const TextStyle(
                                    fontSize: 32,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 16),
                              // 用户信息
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      _userProfile['nickname'] ?? _userProfile['username'] ?? '用户',
                                      style: const TextStyle(
                                        fontSize: 24,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      _userProfile['location'] ?? '未设置地区',
                                      style: const TextStyle(
                                        color: Colors.grey,
                                      ),
                                    ),
                                    const SizedBox(height: 8),
                                    // 编辑资料按钮
                                    TextButton.icon(
                                      onPressed: () {
                                        // 跳转到编辑资料页
                                      },
                                      icon: const Icon(Icons.edit, size: 16),
                                      label: const Text('编辑资料'),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 24),
                          // 快捷操作按钮
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              // 上传数据按钮
                              Expanded(
                                child: ElevatedButton.icon(
                                  onPressed: () {
                                    // 跳转到上传页
                                  },
                                  icon: const Icon(Icons.upload),
                                  label: const Text('上传数据'),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: Colors.orange,
                                    foregroundColor: Colors.white,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    padding: const EdgeInsets.symmetric(vertical: 16),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              // 查看活动按钮
                              Expanded(
                                child: OutlinedButton.icon(
                                  onPressed: () {
                                    Navigator.pushNamed(context, '/activities');
                                  },
                                  icon: const Icon(Icons.list),
                                  label: const Text('查看活动'),
                                  style: OutlinedButton.styleFrom(
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    padding: const EdgeInsets.symmetric(vertical: 16),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  // 功能介绍卡片
                  Card(
                    elevation: 8,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            '功能介绍',
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 16),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceAround,
                            children: [
                              // 功能卡片 1
                              Expanded(
                                child: Column(
                                  children: [
                                    Icon(
                                      Icons.directions_bike,
                                      size: 48,
                                      color: Colors.orange,
                                    ),
                                    const SizedBox(height: 8),
                                    const Text(
                                      '骑行记录',
                                      style: TextStyle(
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    const Text(
                                      '记录你的骑行轨迹',
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: Colors.grey,
                                      ),
                                      textAlign: TextAlign.center,
                                    ),
                                  ],
                                ),
                              ),
                              // 功能卡片 2
                              Expanded(
                                child: Column(
                                  children: [
                                    Icon(
                                      Icons.analytics,
                                      size: 48,
                                      color: Colors.blue,
                                    ),
                                    const SizedBox(height: 8),
                                    const Text(
                                      '数据分析',
                                      style: TextStyle(
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    const Text(
                                      '分析你的运动数据',
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: Colors.grey,
                                      ),
                                      textAlign: TextAlign.center,
                                    ),
                                  ],
                                ),
                              ),
                              // 功能卡片 3
                              Expanded(
                                child: Column(
                                  children: [
                                    Icon(
                                      Icons.auto_awesome,
                                      size: 48,
                                      color: Colors.green,
                                    ),
                                    const SizedBox(height: 8),
                                    const Text(
                                      'AI 建议',
                                      style: TextStyle(
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    const Text(
                                      '获取AI运动建议',
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: Colors.grey,
                                      ),
                                      textAlign: TextAlign.center,
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  // 最近活动卡片
                  Card(
                    elevation: 8,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            '最近活动',
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 16),
                          // 空状态或活动列表
                          _activityList.isEmpty
                              ? Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    const Icon(
                                      Icons.file_upload,
                                      size: 64,
                                      color: Colors.grey,
                                    ),
                                    const SizedBox(height: 16),
                                    const Text(
                                      '还没有运动记录',
                                      style: TextStyle(
                                        fontSize: 18,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    const SizedBox(height: 8),
                                    const Text(
                                      '开始上传你的运动数据吧！',
                                      style: TextStyle(
                                        color: Colors.grey,
                                      ),
                                    ),
                                    const SizedBox(height: 16),
                                    ElevatedButton.icon(
                                      onPressed: () {
                                        // 跳转到上传页
                                      },
                                      icon: const Icon(Icons.upload),
                                      label: const Text('上传数据'),
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: Colors.orange,
                                        foregroundColor: Colors.white,
                                        shape: RoundedRectangleBorder(
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                      ),
                                    ),
                                  ],
                                )
                              : // 只显示最近3条活动
                              ListView.builder(
                                  shrinkWrap: true,
                                  physics: const NeverScrollableScrollPhysics(),
                                  itemCount: _activityList.length > 3 ? 3 : _activityList.length,
                                  itemBuilder: (context, index) {
                                    final activity = _activityList[index];
                                    return Card(
                                      elevation: 4,
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      margin: const EdgeInsets.only(bottom: 12),
                                      child: Padding(
                                        padding: const EdgeInsets.all(12),
                                        child: Row(
                                          children: [
                                            // 运动类型图标
                                            Container(
                                              width: 50,
                                              height: 50,
                                              decoration: BoxDecoration(
                                                color: Colors.orange.withAlpha(25),
                                                borderRadius: BorderRadius.circular(10),
                                              ),
                                              alignment: Alignment.center,
                                              child: Icon(
                                                activity['type'] == 'cycling'
                                                    ? Icons.directions_bike
                                                    : activity['type'] == 'running'
                                                        ? Icons.directions_run
                                                        : activity['type'] == 'walking'
                                                            ? Icons.directions_walk
                                                            : Icons.fitness_center,
                                                color: Colors.orange,
                                                size: 24,
                                              ),
                                            ),
                                            const SizedBox(width: 12),
                                            // 运动信息
                                            Expanded(
                                              child: Column(
                                                crossAxisAlignment: CrossAxisAlignment.start,
                                                children: [
                                                  Row(
                                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                                    children: [
                                                      Text(
                                                        activity['name'] ?? '未命名运动',
                                                        style: const TextStyle(
                                                          fontWeight: FontWeight.bold,
                                                        ),
                                                      ),
                                                      Text(
                                                        activity['type'] == 'cycling'
                                                            ? '骑行'
                                                            : activity['type'] == 'running'
                                                                ? '跑步'
                                                                : activity['type'] == 'walking'
                                                                    ? '步行'
                                                                    : '运动',
                                                        style: const TextStyle(
                                                          color: Colors.grey,
                                                          fontSize: 12,
                                                        ),
                                                      ),
                                                    ],
                                                  ),
                                                  Text(
                                                    _formatDateTime(activity['created_at']),
                                                    style: const TextStyle(
                                                      color: Colors.grey,
                                                      fontSize: 12,
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            ),
                                            // 箭头图标
                                            const Icon(Icons.arrow_forward_ios, size: 14, color: Colors.grey),
                                          ],
                                        ),
                                      ),
                                    );
                                  },
                                ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}