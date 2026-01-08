import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../components/app_header.dart';

class BodySettingsScreen extends StatefulWidget {
  const BodySettingsScreen({super.key});

  @override
  State<BodySettingsScreen> createState() => _BodySettingsScreenState();
}

class _BodySettingsScreenState extends State<BodySettingsScreen> {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _heightController = TextEditingController();
  bool _isLoading = false;

  @override
  void dispose() {
    _heightController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const AppHeader(title: 'ColaFit'),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 说明
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.blue[50],
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    Icon(Icons.info_outline, color: Colors.blue[600]),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        '身高等基础信息一般不会变化，只需在首次使用或发生变化时设置。',
                        style: TextStyle(
                          color: Colors.blue[600],
                          fontSize: 14,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 30),

              // 身高输入
              TextFormField(
                controller: _heightController,
                decoration: const InputDecoration(
                  labelText: '身高 (cm)',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.height),
                  hintText: '请输入您的身高',
                ),
                keyboardType: TextInputType.number,
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return '请输入身高';
                  }
                  final height = double.tryParse(value);
                  if (height == null || height < 100 || height > 250) {
                    return '请输入有效的身高（100-250cm）';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 20),

              const Text(
                '提示：',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                '• 身高将用于计算BMI指数\n'
                '• 体重等数据请在"添加健康记录"中更新\n'
                '• 这些设置会影响健康数据的准确性',
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey,
                ),
              ),
              const Spacer(),

              // 保存按钮
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _saveSettings,
                  child: _isLoading
                      ? const CircularProgressIndicator(color: Colors.white)
                      : const Text('保存设置'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _saveSettings() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      // 只保存身高
      final height = double.parse(_heightController.text);

      await ApiService.updateHealthProfile({
        'height': height,
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('设置保存成功！')),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('保存失败：$e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }
}