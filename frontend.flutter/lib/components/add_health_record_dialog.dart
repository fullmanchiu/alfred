import 'package:flutter/material.dart';
import '../services/api_service.dart';

class AddHealthRecordDialog extends StatefulWidget {
  const AddHealthRecordDialog({super.key});

  @override
  State<AddHealthRecordDialog> createState() => _AddHealthRecordDialogState();
}

class _AddHealthRecordDialogState extends State<AddHealthRecordDialog> {
  final _formKey = GlobalKey<FormState>();
  final Map<String, dynamic> _formData = {};
  bool _isLoading = false;

  @override
  Widget build(BuildContext context) {
    return Dialog(
      child: Container(
        width: MediaQuery.of(context).size.width * 0.7,
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.8,
        ),
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 标题
              const Text(
                '添加健康记录',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 20),

              // 可滚动的表单内容
              Expanded(
                child: SingleChildScrollView(
                  child: Column(
                    children: [
                      // 体重
                      _buildNumberField(
                        label: '体重 (kg)',
                        key: 'weight',
                        icon: Icons.line_weight,
                      ),
                      const SizedBox(height: 12),

                      // 体脂率
                      _buildNumberField(
                        label: '体脂率 (%)',
                        key: 'body_fat',
                        icon: Icons.fitness_center,
                      ),
                      const SizedBox(height: 12),

                      // 肌肉率
                      _buildNumberField(
                        label: '肌肉率 (%)',
                        key: 'muscle_rate',
                        icon: Icons.fitness_center,
                      ),
                      const SizedBox(height: 12),

                      // 水分率
                      _buildNumberField(
                        label: '水分率 (%)',
                        key: 'water_rate',
                        icon: Icons.water_drop,
                      ),
                      const SizedBox(height: 12),

                      // 骨量
                      _buildNumberField(
                        label: '骨量 (kg)',
                        key: 'bone_mass',
                        icon: Icons.health_and_safety,
                      ),
                      const SizedBox(height: 12),

                      // 蛋白质率
                      _buildNumberField(
                        label: '蛋白质率 (%)',
                        key: 'protein_rate',
                        icon: Icons.opacity,
                      ),
                      const SizedBox(height: 12),

                      // 基础代谢
                      _buildNumberField(
                        label: '基础代谢 (kcal)',
                        key: 'bmr',
                        icon: Icons.bolt,
                      ),
                      const SizedBox(height: 12),

                      // 内脏脂肪
                      _buildNumberField(
                        label: '内脏脂肪等级',
                        key: 'visceral_fat',
                        icon: Icons.favorite,
                      ),
                      const SizedBox(height: 12),

                      // 提示信息
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.blue[50],
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          children: [
                            Icon(Icons.info_outline, color: Colors.blue[600], size: 20),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                'BMI将根据您设置的身高和当前体重自动计算',
                                style: TextStyle(
                                  color: Colors.blue[600],
                                  fontSize: 14,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 20),

              // 按钮
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: _isLoading ? null : () => Navigator.pop(context),
                      child: const Text('取消'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: _isLoading ? null : _submitForm,
                      child: _isLoading
                          ? const CircularProgressIndicator(color: Colors.white, strokeWidth: 2)
                          : const Text('保存'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNumberField({
    required String label,
    required String key,
    required IconData icon,
  }) {
    return TextFormField(
      decoration: InputDecoration(
        labelText: label,
        border: const OutlineInputBorder(),
        prefixIcon: Icon(icon),
      ),
      keyboardType: TextInputType.number,
      validator: (value) {
        if (value != null && value.isNotEmpty) {
          if (double.tryParse(value) == null) {
            return '请输入有效的数字';
          }
        }
        return null;
      },
      onChanged: (value) {
        if (value.isNotEmpty) {
          _formData[key] = double.tryParse(value);
        }
      },
    );
  }

  Future<void> _submitForm() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      // 准备提交数据
      final submitData = <String, dynamic>{};

      // 只提交有值的字段
      _formData.forEach((key, value) {
        if (value != null) {
          submitData[key] = value;
        }
      });

      // 调用API更新健康数据（使用update接口而不是create）
      await ApiService.updateHealthProfile(submitData);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('健康数据更新成功！')),
        );
        Navigator.pop(context, true); // 返回true表示成功
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('更新失败：$e')),
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