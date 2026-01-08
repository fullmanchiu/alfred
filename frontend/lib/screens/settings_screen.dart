import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import '../components/app_header.dart';
import '../services/api_service.dart';
import '../screens/login_screen.dart';
import '../screens/profile_screen.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _isDarkMode = false;
  bool _notificationsEnabled = true;
  bool _autoSync = true;

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  void _loadSettings() {
    // 从本地存储加载设置
    setState(() {
      // 这里可以从 SharedPreferences 等加载设置
      _isDarkMode = false; // 临时硬编码
    });
  }

  void _showLogoutDialog() {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('确认退出'),
          content: const Text('确定要退出登录吗？'),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.of(context).pop();
              },
              child: const Text('取消'),
            ),
            TextButton(
              onPressed: () {
                Navigator.of(context).pop();
                _logout();
              },
              child: const Text('确定'),
            ),
          ],
        );
      },
    );
  }

  Future<void> _logout() async {
    try {
      await ApiService.clearAccessToken();
      if (mounted) {
        Navigator.pushAndRemoveUntil(
          context,
          MaterialPageRoute(builder: (context) => const LoginScreen()),
          (Route<dynamic> route) => false,
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('退出失败: $e')),
        );
      }
    }
  }

  void _showChangePasswordDialog() {
    final currentPasswordController = TextEditingController();
    final newPasswordController = TextEditingController();
    final confirmPasswordController = TextEditingController();
    bool isLoading = false;

    showDialog(
      context: context,
      builder: (BuildContext context) {
        return StatefulBuilder(
          builder: (context, setState) {
            return AlertDialog(
              title: const Text('修改密码'),
              content: SizedBox(
                width: 400,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextField(
                      controller: currentPasswordController,
                      obscureText: true,
                      decoration: const InputDecoration(
                        labelText: '当前密码',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: newPasswordController,
                      obscureText: true,
                      decoration: const InputDecoration(
                        labelText: '新密码',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: confirmPasswordController,
                      obscureText: true,
                      decoration: const InputDecoration(
                        labelText: '确认新密码',
                        border: OutlineInputBorder(),
                      ),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: isLoading ? null : () {
                    Navigator.of(context).pop();
                  },
                  child: const Text('取消'),
                ),
                TextButton(
                  onPressed: isLoading ? null : () async {
                    if (newPasswordController.text != confirmPasswordController.text) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('两次输入的密码不一致')),
                      );
                      return;
                    }

                    if (newPasswordController.text.length < 6) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('密码至少需要6个字符')),
                      );
                      return;
                    }

                    setState(() {
                      isLoading = true;
                    });

                    try {
                      // 这里需要调用修改密码的API
                      // await ApiService.changePassword(currentPasswordController.text, newPasswordController.text);

                      Navigator.of(context).pop();
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('密码修改成功')),
                      );
                    } catch (e) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('密码修改失败: $e')),
                      );
                    } finally {
                      setState(() {
                        isLoading = false;
                      });
                    }
                  },
                  child: isLoading
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('确定'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const AppHeader(title: '设置'),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // 用户信息
          Card(
            child: ListTile(
              leading: const CircleAvatar(
                backgroundColor: Colors.orange,
                child: Icon(Icons.person, color: Colors.white),
              ),
              title: const Text('个人资料'),
              subtitle: const Text('管理您的个人信息'),
              trailing: const Icon(Icons.arrow_forward_ios),
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const ProfileScreen()),
                );
              },
            ),
          ),
          const SizedBox(height: 16),

          // 应用设置
          Text(
            '应用设置',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
              color: Colors.grey.shade600,
            ),
          ),
          const SizedBox(height: 8),
          Card(
            child: Column(
              children: [
                SwitchListTile(
                  secondary: const Icon(Icons.dark_mode, color: Colors.indigo),
                  title: const Text('深色模式'),
                  subtitle: const Text('切换应用主题'),
                  value: _isDarkMode,
                  onChanged: (value) {
                    setState(() {
                      _isDarkMode = value;
                    });
                    // TODO: 实现主题切换
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('主题切换功能开发中...')),
                    );
                  },
                ),
                const Divider(height: 1),
                SwitchListTile(
                  secondary: const Icon(Icons.notifications, color: Colors.orange),
                  title: const Text('推送通知'),
                  subtitle: const Text('接收运动提醒和通知'),
                  value: _notificationsEnabled,
                  onChanged: (value) {
                    setState(() {
                      _notificationsEnabled = value;
                    });
                  },
                ),
                const Divider(height: 1),
                SwitchListTile(
                  secondary: const Icon(Icons.sync, color: Colors.green),
                  title: const Text('自动同步'),
                  subtitle: const Text('自动同步运动数据'),
                  value: _autoSync,
                  onChanged: (value) {
                    setState(() {
                      _autoSync = value;
                    });
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // 身体设置
          Text(
            '健康设置',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
              color: Colors.grey.shade600,
            ),
          ),
          const SizedBox(height: 8),
          Card(
            child: ListTile(
              leading: const Icon(Icons.height, color: Colors.blue),
              title: const Text('身体数据'),
              subtitle: const Text('设置身高、体重等基础信息'),
              trailing: const Icon(Icons.arrow_forward_ios),
              onTap: () {
                Navigator.pushNamed(context, '/body_settings');
              },
            ),
          ),
          const SizedBox(height: 16),

          // 安全设置
          Text(
            '安全设置',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
              color: Colors.grey.shade600,
            ),
          ),
          const SizedBox(height: 8),
          Card(
            child: ListTile(
              leading: const Icon(Icons.lock, color: Colors.red),
              title: const Text('修改密码'),
              subtitle: const Text('更改您的登录密码'),
              trailing: const Icon(Icons.arrow_forward_ios),
              onTap: _showChangePasswordDialog,
            ),
          ),
          const SizedBox(height: 16),

          // 其他设置
          Text(
            '其他',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
              color: Colors.grey.shade600,
            ),
          ),
          const SizedBox(height: 8),
          Card(
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.info, color: Colors.grey),
                  title: const Text('关于 ColaFit'),
                  subtitle: const Text('版本信息和帮助'),
                  trailing: const Icon(Icons.arrow_forward_ios),
                  onTap: () {
                    _showAboutDialog();
                  },
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.privacy_tip, color: Colors.grey),
                  title: const Text('隐私政策'),
                  subtitle: const Text('查看数据使用政策'),
                  trailing: const Icon(Icons.arrow_forward_ios),
                  onTap: () {
                    // TODO: 实现隐私政策页面
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('功能开发中...')),
                    );
                  },
                ),
                const Divider(height: 1),
                if (kIsWeb)
                  ListTile(
                    leading: const Icon(Icons.computer, color: Colors.grey),
                    title: const Text('网页版'),
                    subtitle: const Text('当前使用网页版'),
                    trailing: const Icon(Icons.check, color: Colors.green),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // 退出登录
          Card(
            child: ListTile(
              leading: const Icon(Icons.logout, color: Colors.red),
              title: const Text('退出登录'),
              subtitle: const Text('安全退出您的账户'),
              onTap: _showLogoutDialog,
            ),
          ),
          const SizedBox(height: 32),

          // 版本信息
          Center(
            child: Text(
              'ColaFit v1.0.0',
              style: TextStyle(
                color: Colors.grey.shade500,
                fontSize: 12,
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showAboutDialog() {
    showAboutDialog(
      context: context,
      applicationName: 'ColaFit',
      applicationVersion: '1.0.0',
      applicationIcon: const Icon(Icons.directions_bike, size: 48),
      children: [
        const Text('专业的骑行运动数据管理平台'),
        const SizedBox(height: 16),
        const Text('功能特点:'),
        const Text('• FIT文件上传和分析'),
        const Text('• GPS轨迹地图显示'),
        const Text('• 运动数据统计'),
        const Text('• 健康数据管理'),
        const SizedBox(height: 16),
        const Text('© 2024 ColaFit Team'),
      ],
    );
  }
}