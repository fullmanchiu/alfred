import 'package:flutter/material.dart';
import '../services/api_service.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  Map<String, dynamic>? _userData;
  bool _isLoading = true;
  bool _isEditing = false;
  String? _errorMessage;

  final _formKey = GlobalKey<FormState>();
  final _nicknameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  final _locationController = TextEditingController();
  String? _selectedGender;

  @override
  void initState() {
    super.initState();
    _loadUserProfile();
  }

  Future<void> _loadUserProfile() async {
    try {
      final response = await ApiService.getUserProfile();
      setState(() {
        _userData = response['data'];
        _isLoading = false;
        _populateFields();
      });
    } catch (e) {
      setState(() {
        _errorMessage = e.toString();
        _isLoading = false;
      });
    }
  }

  void _populateFields() {
    if (_userData != null) {
      _nicknameController.text = _userData!['nickname'] ?? '';
      _phoneController.text = _userData!['phone'] ?? '';
      _emailController.text = _userData!['email'] ?? '';
      _locationController.text = _userData!['location'] ?? '';
      _selectedGender = _userData!['gender'];
    }
  }

  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final profileData = {
        'nickname': _nicknameController.text.trim(),
        'phone': _phoneController.text.trim(),
        'email': _emailController.text.trim(),
        'location': _locationController.text.trim(),
        'gender': _selectedGender,
      };

      await ApiService.updateProfile(profileData);

      // 重新加载数据
      await _loadUserProfile();

      setState(() {
        _isEditing = false;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('个人资料更新成功')),
        );
      }
    } catch (e) {
      setState(() {
        _errorMessage = e.toString();
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('个人资料'),
        actions: [
          if (!_isEditing)
            IconButton(
              icon: const Icon(Icons.edit),
              onPressed: () {
                setState(() {
                  _isEditing = true;
                });
              },
            )
          else
            TextButton(
              onPressed: _isLoading ? null : _saveProfile,
              child: _isLoading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('保存'),
            ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _errorMessage != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Text(
                      '加载失败: $_errorMessage',
                      style: const TextStyle(color: Colors.red),
                      textAlign: TextAlign.center,
                    ),
                  ),
                )
              : _userData == null
                  ? const Center(child: Text('无法获取用户数据'))
                  : SingleChildScrollView(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // 头像和基本信息
                          Card(
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Row(
                                children: [
                                  CircleAvatar(
                                    radius: 40,
                                    backgroundColor: Colors.orange.shade100,
                                    child: Text(
                                      _userData!['nickname']?.substring(0, 1).toUpperCase() ??
                                      _userData!['username']?.substring(0, 1).toUpperCase() ?? 'U',
                                      style: TextStyle(
                                        fontSize: 24,
                                        fontWeight: FontWeight.bold,
                                        color: Colors.orange.shade700,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 16),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          _userData!['nickname'] ?? _userData!['username'],
                                          style: const TextStyle(
                                            fontSize: 20,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                        Text(
                                          '@${_userData!['username']}',
                                          style: TextStyle(
                                            fontSize: 14,
                                            color: Colors.grey.shade600,
                                          ),
                                        ),
                                        if (_userData!['created_at'] != null)
                                          Text(
                                            '注册时间: ${_formatDate(_userData!['created_at'])}',
                                            style: TextStyle(
                                              fontSize: 12,
                                              color: Colors.grey.shade500,
                                            ),
                                          ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),

                          // 详细信息表单
                          Card(
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Form(
                                key: _formKey,
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      '个人信息',
                                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    const SizedBox(height: 16),

                                    // 昵称
                                    TextFormField(
                                      controller: _nicknameController,
                                      enabled: _isEditing,
                                      decoration: const InputDecoration(
                                        labelText: '昵称',
                                        border: OutlineInputBorder(),
                                        prefixIcon: Icon(Icons.person),
                                      ),
                                    ),
                                    const SizedBox(height: 16),

                                    // 性别
                                    DropdownButtonFormField<String>(
                                      value: _selectedGender,
                                      decoration: const InputDecoration(
                                        labelText: '性别',
                                        border: OutlineInputBorder(),
                                        prefixIcon: Icon(Icons.people),
                                      ),
                                      items: const [
                                        DropdownMenuItem(value: null, child: Text('未设置')),
                                        DropdownMenuItem(value: '男', child: Text('男')),
                                        DropdownMenuItem(value: '女', child: Text('女')),
                                      ],
                                      onChanged: _isEditing ? (value) {
                                        setState(() {
                                          _selectedGender = value;
                                        });
                                      } : null,
                                    ),
                                    const SizedBox(height: 16),

                                    // 手机号
                                    TextFormField(
                                      controller: _phoneController,
                                      enabled: _isEditing,
                                      decoration: const InputDecoration(
                                        labelText: '手机号',
                                        border: OutlineInputBorder(),
                                        prefixIcon: Icon(Icons.phone),
                                      ),
                                      keyboardType: TextInputType.phone,
                                    ),
                                    const SizedBox(height: 16),

                                    // 邮箱
                                    TextFormField(
                                      controller: _emailController,
                                      enabled: _isEditing,
                                      decoration: const InputDecoration(
                                        labelText: '邮箱',
                                        border: OutlineInputBorder(),
                                        prefixIcon: Icon(Icons.email),
                                      ),
                                      keyboardType: TextInputType.emailAddress,
                                    ),
                                    const SizedBox(height: 16),

                                    // 所在地
                                    TextFormField(
                                      controller: _locationController,
                                      enabled: _isEditing,
                                      decoration: const InputDecoration(
                                        labelText: '所在地',
                                        border: OutlineInputBorder(),
                                        prefixIcon: Icon(Icons.location_on),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),

                          // 统计信息
                          Card(
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '运动统计',
                                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(height: 16),
                                  Row(
                                    children: [
                                      Expanded(
                                        child: _buildStatItem(
                                          '总活动数',
                                          '0',
                                          Icons.directions_bike,
                                          Colors.blue,
                                        ),
                                      ),
                                      Expanded(
                                        child: _buildStatItem(
                                          '总里程',
                                          '0 km',
                                          Icons.straighten,
                                          Colors.green,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 16),
                                  Row(
                                    children: [
                                      Expanded(
                                        child: _buildStatItem(
                                          '总时长',
                                          '0 小时',
                                          Icons.access_time,
                                          Colors.orange,
                                        ),
                                      ),
                                      Expanded(
                                        child: _buildStatItem(
                                          '累计爬升',
                                          '0 m',
                                          Icons.trending_up,
                                          Colors.red,
                                        ),
                                      ),
                                    ],
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

  Widget _buildStatItem(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              color: Colors.grey.shade600,
            ),
          ),
        ],
      ),
    );
  }

  String _formatDate(String? dateString) {
    if (dateString == null) return '未知';
    try {
      final date = DateTime.parse(dateString);
      return '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
    } catch (e) {
      return dateString;
    }
  }
}