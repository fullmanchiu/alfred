import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'weight_record_dialog.dart';
import '../services/api_service.dart';

class AddRecordMenuDialog extends StatefulWidget {
  final VoidCallback? onRecordSaved;

  const AddRecordMenuDialog({super.key, this.onRecordSaved});

  @override
  State<AddRecordMenuDialog> createState() => _AddRecordMenuDialogState();
}

class _AddRecordMenuDialogState extends State<AddRecordMenuDialog> {
  bool _isUploading = false;
  List<String> _selectedFileNames = [];

  Future<void> _pickFitFiles() async {
    try {
      print('开始选择文件...');
      FilePickerResult? result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['fit'],
        allowMultiple: true,
      );

      print('文件选择结果: $result');
      print('result 是否为空: ${result == null}');
      if (result != null) {
        print('files 长度: ${result.files.length}');
        print('files 是否为空: ${result.files.isEmpty}');
        print('第一个文件: ${result.files.isNotEmpty ? result.files.first.name : "无"}');
      }

      if (result != null) {
        print('result 不为空，检查文件数量: ${result.files.length}');
        if (result.files.isNotEmpty) {
          print('选择了 ${result.files.length} 个文件');

          // 先关闭当前对话框
          if (mounted) {
            Navigator.pop(context);
          }

          // 直接开始上传，不依赖当前widget的mounted状态
          _uploadFilesDirectly(result.files);
        } else {
          print('文件列表为空');
        }
      } else {
        print('没有选择文件');
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('没有选择文件'),
              backgroundColor: Colors.orange,
            ),
          );
        }
      }
    } catch (e) {
      print('文件选择异常: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('文件选择失败: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  // 直接上传文件，不依赖widget状态
  Future<void> _uploadFilesDirectly(List<PlatformFile> files) async {
    print('开始直接上传 ${files.length} 个文件');

    try {
      // 获取认证token
      print('获取认证token...');
      final headers = await ApiService.getHeaders();
      print('认证token获取成功');

      // Web平台文件上传
      final uploadUrl = '${ApiService.baseUrl}/api/v1/upload';
      print('上传URL: $uploadUrl');
      final request = http.MultipartRequest('POST', Uri.parse(uploadUrl));
      request.headers.addAll(headers);

      // 添加文件
      int validFiles = 0;
      for (var file in files) {
        print('处理文件: ${file.name}, 大小: ${file.size}, bytes是否为空: ${file.bytes == null}');
        if (file.bytes != null) {
          request.files.add(http.MultipartFile.fromBytes(
            'files',
            file.bytes!,
            filename: file.name,
          ));
          validFiles++;
        }
      }

      print('有效文件数: $validFiles');
      if (validFiles == 0) {
        throw Exception('没有有效的文件数据');
      }

      // 发送请求
      print('发送HTTP请求...');
      final streamedResponse = await request.send();
      print('响应状态码: ${streamedResponse.statusCode}');

      final response = await http.Response.fromStream(streamedResponse);
      print('响应内容: ${response.body}');

      if (response.statusCode == 200) {
        final responseData = jsonDecode(response.body);
        print('解析响应数据成功: $responseData');

        final activities = responseData['activities'] ?? [];
        print('活动数量: ${activities.length}');

        // 使用全局context显示结果
        if (mounted && context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('成功上传 ${activities.length} 个活动'),
              backgroundColor: Colors.green,
            ),
          );
        }

        if (widget.onRecordSaved != null) {
          widget.onRecordSaved!();
        }
      } else {
        throw Exception('上传失败: ${response.statusCode} - ${response.body}');
      }
    } catch (e) {
      print('上传异常: $e');
      if (mounted && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('上传失败: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _uploadFiles(List<PlatformFile> files) async {
    if (files.isEmpty) {
      print('没有文件需要上传');
      return;
    }

    print('开始上传 ${files.length} 个文件');
    setState(() {
      _isUploading = true;
    });

    try {
      // 获取认证token
      print('获取认证token...');
      final headers = await ApiService.getHeaders();
      print('认证token获取成功: ${headers.keys}');

      // Web平台文件上传
      final uploadUrl = '${ApiService.baseUrl}/api/v1/upload';
      print('上传URL: $uploadUrl');
      final request = http.MultipartRequest('POST', Uri.parse(uploadUrl));
      request.headers.addAll(headers);

      // 添加文件
      int validFiles = 0;
      for (var file in files) {
        print('处理文件: ${file.name}, 大小: ${file.size}, bytes是否为空: ${file.bytes == null}');
        if (file.bytes != null) {
          request.files.add(http.MultipartFile.fromBytes(
            'files',
            file.bytes!,
            filename: file.name,
          ));
          validFiles++;
        } else if (file.path != null) {
          // 移动端路径处理 - 暂时跳过，因为我们在Web平台
          print('移动端路径: ${file.path}');
        }
      }

      print('有效文件数: $validFiles');
      if (validFiles == 0) {
        throw Exception('没有有效的文件数据');
      }

      // 发送请求
      print('发送HTTP请求...');
      final streamedResponse = await request.send();
      print('响应状态码: ${streamedResponse.statusCode}');

      final response = await http.Response.fromStream(streamedResponse);
      print('响应内容: ${response.body}');

      if (response.statusCode == 200) {
        final responseData = jsonDecode(response.body);
        print('解析响应数据成功: $responseData');

        if (mounted) {
          final activities = responseData['data']?['activities'] ?? [];
          print('活动数量: ${activities.length}');
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('成功上传 ${activities.length} 个活动'),
              backgroundColor: Colors.green,
            ),
          );

          if (widget.onRecordSaved != null) {
            widget.onRecordSaved!();
          }

          // 确保关闭上传对话框
          Navigator.of(context, rootNavigator: true).pop();
        }
      } else {
        throw Exception('上传失败: ${response.statusCode} - ${response.body}');
      }
    } catch (e) {
      print('上传异常: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('上传失败: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isUploading = false;
          _selectedFileNames = [];
        });
      }
    }
  }

  void _showFitFileDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('上传FIT文件'),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('选择FIT文件进行上传'),
            SizedBox(height: 16),
            Text('点击下方按钮选择要上传的FIT文件'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('取消'),
          ),
          TextButton(
            onPressed: _pickFitFiles,
            child: const Text('选择文件'),
          ),
        ],
      ),
    );
  }

  void _showUploadDialog(BuildContext context, List<PlatformFile> files) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('上传FIT文件'),
        content: StatefulBuilder(
          builder: (context, setState) => Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('已选择文件：'),
              const SizedBox(height: 8),
              ...files.map((file) => Text(
                '• ${file.name}',
                style: const TextStyle(fontSize: 12),
              )).toList(),
              const SizedBox(height: 16),
              if (_isUploading) ...[
                const CircularProgressIndicator(),
                const SizedBox(height: 8),
                const Text('上传中...'),
              ],
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: _isUploading ? null : () => Navigator.pop(context),
            child: const Text('取消'),
          ),
          ElevatedButton(
            onPressed: _isUploading ? null : () async {
              setState(() {
                _selectedFileNames = files.map((file) => file.name).toList();
              });
              print('开始上传文件...');
              await _uploadFiles(files);
              if (mounted) {
                Navigator.pop(context);
              }
            },
            child: const Text('开始上传'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              '记录什么？',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 32),

            // 记体重按钮
            _buildMenuButton(
              icon: Icons.monitor_weight,
              label: '记体重',
              color: Colors.blue,
              onTap: () {
                Navigator.pop(context);
                _showWeightDialog(context);
              },
            ),

            const SizedBox(height: 16),

            // 记睡眠按钮
            _buildMenuButton(
              icon: Icons.bedtime,
              label: '记睡眠',
              color: Colors.purple,
              onTap: () {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('睡眠记录功能开发中...')),
                );
              },
            ),

            const SizedBox(height: 16),

            // 记运动按钮
            _buildMenuButton(
              icon: Icons.directions_run,
              label: '记运动',
              color: Colors.green,
              onTap: () {
                Navigator.pop(context);
                _showFitFileDialog(context);
              },
            ),

            const SizedBox(height: 16),

            // 记一笔按钮
            _buildMenuButton(
              icon: Icons.account_balance_wallet,
              label: '记一笔',
              color: Colors.orange,
              onTap: () {
                Navigator.pop(context);
                Navigator.pushNamed(context, '/accounting');
              },
            ),

            const SizedBox(height: 32),

            // 取消按钮
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('取消'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMenuButton({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withOpacity(0.3)),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: color,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                icon,
                color: Colors.white,
                size: 24,
              ),
            ),
            const SizedBox(width: 16),
            Text(
              label,
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w500,
                color: color,
              ),
            ),
            const Spacer(),
            Icon(
              Icons.arrow_forward_ios,
              color: color,
              size: 20,
            ),
          ],
        ),
      ),
    );
  }

  void _showWeightDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => WeightRecordDialog(onRecordSaved: widget.onRecordSaved),
    );
  }
}