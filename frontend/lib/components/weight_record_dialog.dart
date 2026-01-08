import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../services/api_service.dart';

class WeightRecordDialog extends StatefulWidget {
  final VoidCallback? onRecordSaved;
  const WeightRecordDialog({super.key, this.onRecordSaved});

  @override
  State<WeightRecordDialog> createState() => _WeightRecordDialogState();
}

class _WeightRecordDialogState extends State<WeightRecordDialog>
    with TickerProviderStateMixin {
  String _weightValue = '';
  bool _isKg = true;
  DateTime _selectedDate = DateTime.now();
  String _selectedTime = '早上';
  final List<String> _timeOptions = ['早上', '中午', '晚上'];
  
  // 最近三天数据
  late List<Map<String, dynamic>> _recentDays;

  // 扩展数据
  double _bodyFat = 0;
  double _muscleRate = 0;
  double _waterRate = 0;
  double _boneMass = 0;
  double _proteinRate = 0;
  int _visceralFat = 0;

  bool _isExpanded = false;
  
  // 初始化最近三天数据
  void _initRecentDays() {
    _recentDays = [
      {
        'display': '今天 (${DateFormat('yyyy-MM-dd').format(DateTime.now())})',
        'date': DateTime.now(),
        'label': '今天'
      },
      {
        'display': '昨天 (${DateFormat('yyyy-MM-dd').format(DateTime.now().subtract(Duration(days: 1)))})',
        'date': DateTime.now().subtract(Duration(days: 1)),
        'label': '昨天'
      },
      {
        'display': '前天 (${DateFormat('yyyy-MM-dd').format(DateTime.now().subtract(Duration(days: 2)))})',
        'date': DateTime.now().subtract(Duration(days: 2)),
        'label': '前天'
      }
    ];
  }

  @override
  void initState() {
    super.initState();
    _initRecentDays();
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: SingleChildScrollView(
        child: Container(
          constraints: const BoxConstraints(
            minWidth: 360,
            maxWidth: 700,
          ),
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // 标题栏
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    '记体重',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  // 扩展/收起按钮
                  TextButton.icon(
                    onPressed: () => setState(() => _isExpanded = !_isExpanded),
                    icon: Icon(
                      _isExpanded ? Icons.arrow_upward : Icons.arrow_downward,
                      size: 16,
                    ),
                    label: Text(_isExpanded ? '收起' : '展开'),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // 日期时间选择
              InkWell(
                onTap: _showDateTimePicker,
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  decoration: BoxDecoration(
                    color: Colors.grey[100],
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.grey[300] ?? Colors.grey),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      // 显示当前选择
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '选择的日期和时间',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey[600],
                              ),
                            ),
                            SizedBox(height: 4),
                            Text(
                              '${_recentDays.firstWhere((day) => day['date'].year == _selectedDate.year && day['date'].month == _selectedDate.month && day['date'].day == _selectedDate.day)['label']} · $_selectedTime',
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            SizedBox(height: 2),
                            Text(
                              DateFormat('yyyy-MM-dd').format(_selectedDate),
                              style: TextStyle(
                                fontSize: 14,
                                color: Colors.grey[500],
                              ),
                            ),
                          ],
                        ),
                      ),
                      // 箭头图标
                      Icon(
                        Icons.arrow_drop_down,
                        color: Colors.grey[600],
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // 单位选择
              Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _isKg = true),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          color: _isKg ? Colors.blue : Colors.grey[200],
                          borderRadius: const BorderRadius.only(
                            topLeft: Radius.circular(8),
                            bottomLeft: Radius.circular(8),
                          ),
                        ),
                        child: Text(
                          'KG',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: _isKg ? Colors.white : Colors.grey[600],
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                  ),
                  Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _isKg = false),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          color: !_isKg ? Colors.blue : Colors.grey[200],
                          borderRadius: const BorderRadius.only(
                            topRight: Radius.circular(8),
                            bottomRight: Radius.circular(8),
                          ),
                        ),
                        child: Text(
                          '斤',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: !_isKg ? Colors.white : Colors.grey[600],
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // 体重显示
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  children: [
                    Text(
                      _weightValue.isEmpty ? '0' : _weightValue,
                      style: const TextStyle(
                        fontSize: 48,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      _isKg ? 'KG' : '斤',
                      style: TextStyle(
                        fontSize: 16,
                        color: Colors.grey[600],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // 数字键盘
              _buildNumberPad(),
              const SizedBox(height: 20),

              // 扩展数据区域
              AnimatedSize(
                duration: const Duration(milliseconds: 300),
                curve: Curves.easeInOut,
                child: _isExpanded
                    ? Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // 扩展数据标题
                          const Text(
                            '扩展数据',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 16),

                          // 扩展数据表单 - 使用两列布局
                          GridView.count(
                            crossAxisCount: 2,
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            mainAxisSpacing: 12,
                            crossAxisSpacing: 12,
                            childAspectRatio: 2.5,
                            children: [
                              _buildDropdownField('体脂率 (%)', _bodyFat, 5.0, 35.0, 0.5),
                              _buildDropdownField('肌肉率 (%)', _muscleRate, 20.0, 60.0, 0.5),
                              _buildDropdownField('水分率 (%)', _waterRate, 30.0, 65.0, 0.5),
                              _buildDropdownField('骨量 (kg)', _boneMass, 1.5, 6.5, 0.1),
                              _buildDropdownField('蛋白质率 (%)', _proteinRate, 10.0, 35.0, 0.5),
                              _buildDropdownField('内脏脂肪', _visceralFat.toDouble(), 1.0, 30.0, 1.0),
                            ],
                          ),
                          const SizedBox(height: 20),
                        ],
                      )
                    : const SizedBox.shrink(),
              ),

              // 打卡按钮
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _weightValue.isEmpty ? null : _saveWeight,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.green,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.check),
                      SizedBox(width: 8),
                      Text(
                        '记录体重',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNumberPad() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // 第一行：7-8-9
        Row(
          children: [
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(4),
                child: _buildNumberButton('7'),
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(4),
                child: _buildNumberButton('8'),
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(4),
                child: _buildNumberButton('9'),
              ),
            ),
          ],
        ),
        // 第二行：4-5-6
        Row(
          children: [
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(4),
                child: _buildNumberButton('4'),
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(4),
                child: _buildNumberButton('5'),
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(4),
                child: _buildNumberButton('6'),
              ),
            ),
          ],
        ),
        // 第三行：1-2-3
        Row(
          children: [
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(4),
                child: _buildNumberButton('1'),
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(4),
                child: _buildNumberButton('2'),
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(4),
                child: _buildNumberButton('3'),
              ),
            ),
          ],
        ),
        // 第四行：0-小数点-删除
        Row(
          children: [
            Expanded(
              flex: 2,
              child: Padding(
                padding: const EdgeInsets.all(4),
                child: _buildNumberButton('0'),
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(4),
                child: _buildNumberButton('.'),
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(4),
                child: _buildDeleteButton(),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildNumberButton(String number) {
    return ElevatedButton(
      onPressed: () {
        setState(() {
          if (number == '.' && _weightValue.contains('.')) return;
          if (_weightValue == '0' && number != '.') {
            _weightValue = number;
          } else {
            _weightValue += number;
          }
        });
      },
      style: ElevatedButton.styleFrom(
        backgroundColor: Colors.grey[200],
        foregroundColor: Colors.black87,
        padding: const EdgeInsets.symmetric(vertical: 20),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        elevation: 0,
      ),
      child: Text(
        number,
        style: const TextStyle(
          fontSize: 24,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  Widget _buildDeleteButton() {
    return ElevatedButton(
      onPressed: () {
        setState(() {
          if (_weightValue.isNotEmpty) {
            _weightValue = _weightValue.substring(0, _weightValue.length - 1);
            if (_weightValue.isEmpty) {
              _weightValue = '';
            }
          }
        });
      },
      style: ElevatedButton.styleFrom(
        backgroundColor: Colors.red[100],
        foregroundColor: Colors.red[700],
        padding: const EdgeInsets.symmetric(vertical: 20),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        elevation: 0,
      ),
      child: const Icon(
        Icons.backspace,
        size: 24,
      ),
    );
  }

  Widget _buildDropdownField(String label, double value, double min, double max, double step) {
    final int count = ((max - min) / step).round() + 1;
    final List<String> options = List.generate(count, (i) {
      final val = min + i * step;
      return val % 1 == 0 ? val.toInt().toString() : val.toStringAsFixed(1);
    });

    String? currentValue = value > 0
        ? (value % 1 == 0 ? value.toInt().toString() : value.toStringAsFixed(1))
        : null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 13,
            color: Colors.grey[600],
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 6),
        DropdownButtonFormField<String>(
          value: currentValue,
          decoration: InputDecoration(
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
            ),
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            hintText: '请选择',
            hintStyle: TextStyle(
              color: Colors.grey[400],
              fontSize: 14,
            ),
          ),
          isExpanded: true,
          items: options.map((String value) {
            return DropdownMenuItem<String>(
              value: value,
              child: Text(value),
            );
          }).toList(),
          onChanged: (String? newValue) {
            if (newValue != null) {
              final double newValueDouble = double.parse(newValue);
              setState(() {
                if (label.contains('体脂率')) {
                  _bodyFat = newValueDouble;
                } else if (label.contains('肌肉率')) {
                  _muscleRate = newValueDouble;
                } else if (label.contains('水分率')) {
                  _waterRate = newValueDouble;
                } else if (label.contains('骨量')) {
                  _boneMass = newValueDouble;
                } else if (label.contains('蛋白质率')) {
                  _proteinRate = newValueDouble;
                } else if (label.contains('内脏脂肪')) {
                  _visceralFat = newValueDouble.toInt();
                }
              });
            }
          },
        ),
      ],
    );
  }
  
  // 显示日期时间滚轮选择器
  Future<void> _showDateTimePicker() async {
    // 计算初始选择索引
    int initialDateIndex = 0;
    for (int i = 0; i < _recentDays.length; i++) {
      if (_recentDays[i]['date'].year == _selectedDate.year &&
          _recentDays[i]['date'].month == _selectedDate.month &&
          _recentDays[i]['date'].day == _selectedDate.day) {
        initialDateIndex = i;
        break;
      }
    }
    
    int initialTimeIndex = _timeOptions.indexOf(_selectedTime);
    
    // 存储选择结果
    int dateIndex = initialDateIndex;
    int timeIndex = initialTimeIndex;
    
    // 使用StatefulBuilder来管理对话框内的状态
    await showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => Dialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          child: Container(
            width: 500,
            padding: const EdgeInsets.all(20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // 标题
                const Text(
                  '选择日期和时间',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 20),
                
                // 滚轮选择器区域
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    // 日期滚轮
                    Expanded(
                      child: Column(
                        children: [
                          const Text(
                            '日期',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 10),
                          Container(
                            height: 150,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: Colors.grey[200]!),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black12,
                                  blurRadius: 2,
                                  offset: Offset(0, 1),
                                ),
                              ],
                            ),
                            child: Stack(
                              children: [
                                // 选中指示器
                                Positioned(
                                  top: 50,
                                  left: 0,
                                  right: 0,
                                  height: 50,
                                  child: Container(
                                    decoration: BoxDecoration(
                                      color: Colors.blue.withOpacity(0.1),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                  ),
                                ),
                                // 日期滚轮
                                ListWheelScrollView(
                                  itemExtent: 50,
                                  controller: FixedExtentScrollController(initialItem: dateIndex),
                                  onSelectedItemChanged: (index) {
                                    setState(() {
                                      dateIndex = index;
                                    });
                                  },
                                  // 使用更好的物理特性支持鼠标拖动
                                  physics: const ClampingScrollPhysics(),
                                  children: _recentDays.map((day) {
                                    final isSelected = _recentDays.indexOf(day) == dateIndex;
                                    return Center(
                                      child: Text(
                                        day['display'],
                                        style: TextStyle(
                                          fontSize: isSelected ? 18 : 16,
                                          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                          color: isSelected ? Colors.blue : Colors.black,
                                        ),
                                      ),
                                    );
                                  }).toList(),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    
                    const SizedBox(width: 20),
                    
                    // 时间滚轮
                    Expanded(
                      child: Column(
                        children: [
                          const Text(
                            '时间',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 10),
                          Container(
                            height: 150,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: Colors.grey[200]!),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black12,
                                  blurRadius: 2,
                                  offset: Offset(0, 1),
                                ),
                              ],
                            ),
                            child: Stack(
                              children: [
                                // 选中指示器
                                Positioned(
                                  top: 50,
                                  left: 0,
                                  right: 0,
                                  height: 50,
                                  child: Container(
                                    decoration: BoxDecoration(
                                      color: Colors.blue.withOpacity(0.1),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                  ),
                                ),
                                // 时间滚轮
                                ListWheelScrollView(
                                  itemExtent: 50,
                                  controller: FixedExtentScrollController(initialItem: timeIndex),
                                  onSelectedItemChanged: (index) {
                                    setState(() {
                                      timeIndex = index;
                                    });
                                  },
                                  // 使用更好的物理特性支持鼠标拖动
                                  physics: const ClampingScrollPhysics(),
                                  children: _timeOptions.map((time) {
                                    final isSelected = _timeOptions.indexOf(time) == timeIndex;
                                    return Center(
                                      child: Text(
                                        time,
                                        style: TextStyle(
                                          fontSize: isSelected ? 20 : 18,
                                          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                          color: isSelected ? Colors.blue : Colors.black,
                                        ),
                                      ),
                                    );
                                  }).toList(),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                
                // 显示当前选择
                Text(
                  '当前选择: ${_recentDays[dateIndex]['display']} · ${_timeOptions[timeIndex]}',
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.grey[600],
                  ),
                ),
                const SizedBox(height: 20),
                
                // 操作按钮
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    // 取消按钮
                    TextButton(
                      onPressed: () {
                        Navigator.pop(context);
                      },
                      child: const Text('取消'),
                    ),
                    const SizedBox(width: 10),
                    // 确认按钮
                    ElevatedButton(
                      onPressed: () {
                        // 更新父组件状态
                        this.setState(() {
                          _selectedDate = _recentDays[dateIndex]['date'];
                          _selectedTime = _timeOptions[timeIndex];
                        });
                        Navigator.pop(context);
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.blue,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 24),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: const Text('确认'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _saveWeight() async {
    final double? weight = double.tryParse(_weightValue);
    if (weight == null) return;

    try {
      final Map<String, dynamic> weightData = {
        'weight': _isKg ? weight : weight / 2, // 如果是斤，转换为kg
        'unit': 'kg', // 统一存储为kg
        'date': DateFormat('yyyy-MM-dd').format(_selectedDate),
        'time_period': _selectedTime,
      };

      // 如果有扩展数据，也保存
      if (_bodyFat > 0) weightData['body_fat'] = _bodyFat;
      if (_muscleRate > 0) weightData['muscle_rate'] = _muscleRate;
      if (_waterRate > 0) weightData['water_rate'] = _waterRate;
      if (_boneMass > 0) weightData['bone_mass'] = _boneMass;
      if (_proteinRate > 0) weightData['protein_rate'] = _proteinRate;
      if (_visceralFat > 0) weightData['visceral_fat'] = _visceralFat;

      // TODO: 调用API保存数据
      // await ApiService.createWeightRecord(weightData);

      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('体重记录成功！'),
            backgroundColor: Colors.green,
          ),
        );
        widget.onRecordSaved?.call();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('保存失败：$e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }
}