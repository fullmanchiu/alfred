import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import '../services/api_service.dart';

class UploadScreen extends StatefulWidget {
  const UploadScreen({super.key});

  @override
  State<UploadScreen> createState() => _UploadScreenState();
}

class _UploadScreenState extends State<UploadScreen> {
  bool _isUploading = false;
  List<String> _selectedFiles = [];
  String? _uploadStatus;
  int _uploadProgress = 0;

  Future<void> _pickFiles() async {
    FilePickerResult? result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['fit'],
      allowMultiple: true,
    );

    if (result != null) {
      setState(() {
        _selectedFiles = result.files.map((file) => file.name).toList();
        _uploadStatus = null;
      });
    }
  }

  Future<void> _uploadFiles() async {
    if (_selectedFiles.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('请先选择FIT文件')),
      );
      return;
    }

    setState(() {
      _isUploading = true;
      _uploadStatus = '正在上传...';
      _uploadProgress = 0;
    });

    try {
      final response = await ApiService.uploadFitFiles(_selectedFiles);

      setState(() {
        _isUploading = false;
        _uploadStatus = '上传成功！';
        _uploadProgress = 100;
      });

      if (response['data'] != null) {
        final activities = response['data']['activities'] ?? [];
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('成功上传 ${activities.length} 个活动'),
            backgroundColor: Colors.green,
          ),
        );
      }

      // 清空选中的文件
      setState(() {
        _selectedFiles = [];
      });

    } catch (e) {
      setState(() {
        _isUploading = false;
        _uploadStatus = '上传失败: $e';
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('上传失败: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('上传FIT文件'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // 文件选择按钮
            ElevatedButton.icon(
              onPressed: _isUploading ? null : _pickFiles,
              icon: const Icon(Icons.file_upload),
              label: const Text('选择FIT文件'),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.all(16),
              ),
            ),

            const SizedBox(height: 20),

            // 选中的文件列表
            if (_selectedFiles.isNotEmpty) ...[
              const Text(
                '已选择的文件：',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Expanded(
                child: ListView.builder(
                  itemCount: _selectedFiles.length,
                  itemBuilder: (context, index) {
                    final fileName = _selectedFiles[index].split('/').last;
                    return Card(
                      child: ListTile(
                        leading: const Icon(Icons.fitness_center),
                        title: Text(fileName),
                        trailing: IconButton(
                          icon: const Icon(Icons.close),
                          onPressed: () {
                            setState(() {
                              _selectedFiles.removeAt(index);
                            });
                          },
                        ),
                      ),
                    );
                  },
                ),
              ),

              const SizedBox(height: 16),

              // 上传按钮
              ElevatedButton.icon(
                onPressed: _isUploading ? null : _uploadFiles,
                icon: _isUploading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.cloud_upload),
                label: Text(_isUploading ? '上传中...' : '开始上传'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.blue,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.all(16),
                ),
              ),
            ] else ...[
              // 提示信息
              Expanded(
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.folder_open,
                        size: 80,
                        color: Colors.grey[400],
                      ),
                      const SizedBox(height: 16),
                      Text(
                        '还没有选择文件',
                        style: TextStyle(
                          fontSize: 18,
                          color: Colors.grey[600],
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        '点击上方按钮选择 .fit 文件',
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.grey[500],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],

            // 上传状态
            if (_uploadStatus != null) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: _uploadStatus!.contains('成功')
                    ? Colors.green.withOpacity(0.1)
                    : Colors.red.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Icon(
                      _uploadStatus!.contains('成功')
                        ? Icons.check_circle
                        : Icons.error,
                      color: _uploadStatus!.contains('成功')
                        ? Colors.green
                        : Colors.red,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        _uploadStatus!,
                        style: TextStyle(
                          color: _uploadStatus!.contains('成功')
                            ? Colors.green
                            : Colors.red,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            // 上传进度条
            if (_isUploading && _uploadProgress > 0) ...[
              const SizedBox(height: 16),
              LinearProgressIndicator(
                value: _uploadProgress / 100,
                backgroundColor: Colors.grey[300],
              ),
              const SizedBox(height: 8),
              Center(
                child: Text('$_uploadProgress%'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}