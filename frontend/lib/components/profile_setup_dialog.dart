import 'package:flutter/material.dart';

typedef ProfileSetupCallback = void Function(Map<String, dynamic> profileData);

class ProfileSetupDialog extends StatefulWidget {
  const ProfileSetupDialog({super.key, this.onProfileCompleted});
  
  final ProfileSetupCallback? onProfileCompleted;

  @override
  State<ProfileSetupDialog> createState() => _ProfileSetupDialogState();
}

class _ProfileSetupDialogState extends State<ProfileSetupDialog> {
  int _currentStep = 0;
  final _formKey = GlobalKey<FormState>();
  
  // 用户资料
  String _height = '170cm';
  String _weight = '60kg';
  String _weightUnit = 'kg'; // 'kg' 或 '斤'
  String _gender = '男性';
  String _birthYear = '1980年';

  final List<String> _heights = List.generate(51, (index) => '${150 + index}cm');
  // 根据单位生成不同的体重列表
  List<String> get _weights => _weightUnit == 'kg' 
      ? List.generate(151, (index) => '${30 + index}kg') // 30kg - 180kg
      : List.generate(301, (index) => '${60 + index}斤'); // 60斤 - 360斤（超过用户要求的300斤，给用户更多选择）
  final List<String> _weightUnits = ['kg', '斤'];
  final List<String> _genders = ['男性', '女性'];
  final List<String> _birthYears = List.generate(81, (index) => '${1950 + index}年');

  void _nextStep() {
    if (_currentStep < 2) {
      setState(() {
        _currentStep++;
      });
    } else {
      // 准备提交的资料
      final height = int.parse(_height.replaceAll('cm', ''));
      double weight = double.parse(_weight.replaceAll(RegExp(r'[^0-9.]'), ''));
      
      // 如果单位是斤，转换为kg
      if (_weightUnit == '斤') {
        weight = weight / 2;
      }
      
      // 生成生日字符串 (简化处理，使用1月1日)
      final birthYear = _birthYear.replaceAll('年', '');
      final birthday = '$birthYear-01-01';
      
      final profileData = {
        'height': height,
        'weight': weight.round(),
        'gender': _gender,
        'birthday': birthday,
      };
      
      // 调用回调函数传递资料
      if (widget.onProfileCompleted != null) {
        widget.onProfileCompleted!(profileData);
      }
      
      // 完成并关闭对话框
      Navigator.of(context).pop(true);
    }
  }

  void _prevStep() {
    if (_currentStep > 0) {
      setState(() {
        _currentStep--;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      child: Container(
        width: 500,
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // 步骤指示器
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _buildStepIndicator(0, '骑手'),
                const SizedBox(width: 16),
                Expanded(
                  child: Divider(
                    color: _currentStep > 0 ? Colors.green : Colors.grey,
                  ),
                ),
                const SizedBox(width: 16),
                _buildStepIndicator(1, '装备'),
                const SizedBox(width: 16),
                Expanded(
                  child: Divider(
                    color: _currentStep > 1 ? Colors.green : Colors.grey,
                  ),
                ),
                const SizedBox(width: 16),
                _buildStepIndicator(2, '骑行'),
              ],
            ),
            const SizedBox(height: 24),
            
            // 步骤内容
            _buildStepContent(),
            const SizedBox(height: 24),
            
            // 按钮组
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                if (_currentStep > 0)
                  ElevatedButton(
                    onPressed: _prevStep,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.grey,
                      foregroundColor: Colors.white,
                    ),
                    child: const Text('返回'),
                  )
                else
                  ElevatedButton(
                    onPressed: () => Navigator.of(context).pop(false),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.grey,
                      foregroundColor: Colors.white,
                    ),
                    child: const Text('取消'),
                  ),
                ElevatedButton(
                  onPressed: _nextStep,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.green,
                    foregroundColor: Colors.white,
                  ),
                  child: Text(_currentStep < 2 ? '下一步' : '完成'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStepIndicator(int step, String label) {
    bool isActive = _currentStep == step;
    bool isCompleted = _currentStep > step;
    
    return Column(
      children: [
        Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: isActive ? Colors.green : isCompleted ? Colors.green : Colors.grey,
          ),
          child: Center(
            child: isCompleted
                ? const Icon(Icons.check, color: Colors.white, size: 20)
                : Text(
                    '${step + 1}',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          label,
          style: TextStyle(
            color: isActive ? Colors.green : Colors.grey,
            fontSize: 12,
          ),
        ),
      ],
    );
  }

  Widget _buildStepContent() {
    switch (_currentStep) {
      case 0:
        return _buildStep1();
      case 1:
        return _buildStep2();
      case 2:
        return _buildStep3();
      default:
        return Container();
    }
  }

  Widget _buildStep1() {
    return Column(
      children: [
        const Text(
          '输入一些信息以开始使用 ColaFit',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 16),
        const Text(
          '该信息用于以下目的：',
          style: TextStyle(
            color: Colors.grey,
          ),
        ),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.grey[300]!),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildInfoItem('身体数据估计'),
              _buildInfoItem('为您优化的课程、教练信息'),
              _buildInfoItem('用于各种自行车统计和指标分析'),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildStep2() {
    return Form(
      key: _formKey,
      child: Column(
        children: [
          const Text(
            '请输入您的基础资料',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 24),
          
          _buildDropdownField('身高', _height, _heights, (value) {
            setState(() {
              _height = value!;
            });
          }),
          const SizedBox(height: 16),
          
          // 体重和单位选择
          Row(
            children: [
              Expanded(
                flex: 2,
                child: _buildDropdownField('体重', _weight, _weights, (value) {
                  setState(() {
                    _weight = value!;
                  });
                }),
              ),
              const SizedBox(width: 16),
              Expanded(
                flex: 1,
                child: _buildDropdownField('单位', _weightUnit, _weightUnits, (value) {
                  setState(() {
                    // 切换单位时，保持数值大致对应
                    final oldValue = double.parse(_weight.replaceAll(RegExp(r'[^0-9.]'), ''));
                    _weightUnit = value!;
                    
                    if (_weightUnit == '斤') {
                      // kg 转 斤
                      final newValue = (oldValue * 2).round();
                      _weight = '${newValue}斤';
                    } else {
                      // 斤 转 kg
                      final newValue = (oldValue / 2).round();
                      _weight = '${newValue}kg';
                    }
                  });
                }),
              ),
            ],
          ),
          const SizedBox(height: 16),
          
          _buildDropdownField('性别', _gender, _genders, (value) {
            setState(() {
              _gender = value!;
            });
          }),
          const SizedBox(height: 16),
          
          _buildDropdownField('出生年份', _birthYear, _birthYears, (value) {
            setState(() {
              _birthYear = value!;
            });
          }),
        ],
      ),
    );
  }

  Widget _buildStep3() {
    return Column(
      children: [
        const Text(
          '谢谢，请进行下一步。',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 24),
        ElevatedButton(
          onPressed: _nextStep,
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.pink,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 12),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
          ),
          child: const Text(
            '完成并进行下一步',
            style: TextStyle(fontSize: 16),
          ),
        ),
        const SizedBox(height: 16),
        TextButton(
          onPressed: () {
            setState(() {
              _currentStep = 0;
            });
          },
          child: const Text('返回第一步'),
        ),
      ],
    );
  }

  Widget _buildInfoItem(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          const Icon(
            Icons.check_circle,
            color: Colors.green,
            size: 16,
          ),
          const SizedBox(width: 8),
          Text(text),
        ],
      ),
    );
  }

  Widget _buildDropdownField(String label, String value, List<String> items, ValueChanged<String?> onChanged) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label),
        const SizedBox(height: 8),
        DropdownButtonFormField<String>(
          value: value,
          onChanged: onChanged,
          items: items.map((item) {
            return DropdownMenuItem<String>(
              value: item,
              child: Text(item),
            );
          }).toList(),
          decoration: InputDecoration(
            border: const OutlineInputBorder(),
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          ),
        ),
      ],
    );
  }
}