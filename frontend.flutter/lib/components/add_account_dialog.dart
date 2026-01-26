import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../models/account_model.dart';
import '../services/api_service.dart';
import '../utils/auth_helper.dart';

class AddAccountDialog extends StatefulWidget {
  final Account? account; // 编辑模式时传入
  final VoidCallback? onAccountSaved;

  const AddAccountDialog({
    super.key,
    this.account,
    this.onAccountSaved,
  });

  @override
  State<AddAccountDialog> createState() => _AddAccountDialogState();
}

class _AddAccountDialogState extends State<AddAccountDialog> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _accountNumberController = TextEditingController();
  final _balanceController = TextEditingController();
  final _notesController = TextEditingController();

  String _selectedAccountType = 'bank_card';
  String _selectedCurrency = 'CNY';
  String? _selectedColor;
  bool _isDefault = false;
  bool _isLoading = false;

  // 账户类型列表
  final List<Map<String, dynamic>> _accountTypes = [
    {'value': 'bank_card', 'label': '银行卡', 'icon': Icons.account_balance},
    {'value': 'cash', 'label': '现金', 'icon': Icons.money},
    {'value': 'alipay', 'label': '支付宝', 'icon': Icons.account_balance_wallet},
    {'value': 'wechat', 'label': '微信', 'icon': Icons.chat},
    {'value': 'credit_card', 'label': '信用卡', 'icon': Icons.credit_card},
  ];

  // 预设颜色列表
  final List<String> _colorOptions = [
    '#1890FF', // 蓝色
    '#52C41A', // 绿色
    '#FAAD14', // 橙色
    '#F5222D', // 红色
    '#722ED1', // 紫色
    '#13C2C2', // 青色
    '#EB2F96', // 粉色
    '#2F54EB', // 深蓝
    '#FA8C16', // 深橙
    '#A0D911', // 黄绿
  ];

  @override
  void initState() {
    super.initState();

    if (widget.account != null) {
      // 编辑模式：填充现有数据
      _nameController.text = widget.account!.name;
      _accountNumberController.text = widget.account!.accountNumber ?? '';
      _balanceController.text = widget.account!.balance.toString();
      _notesController.text = widget.account!.notes ?? '';
      _selectedAccountType = widget.account!.accountType;
      _selectedCurrency = widget.account!.currency;
      _selectedColor = widget.account!.color;
      _isDefault = widget.account!.isDefault;
    } else {
      // 新增模式：选择默认颜色
      _selectedColor = _colorOptions[0];
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _accountNumberController.dispose();
    _balanceController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: Colors.red),
    );
  }

  Future<void> _saveAccount() async {
    // 1. 表单验证
    if (!_formKey.currentState!.validate()) {
      return;
    }

    // 2. 构建数据
    final accountData = {
      'name': _nameController.text.trim(),
      'account_type': _selectedAccountType,
      if (_accountNumberController.text.trim().isNotEmpty)
        'account_number': _accountNumberController.text.trim(),
      'initial_balance': double.tryParse(_balanceController.text) ?? 0.0,
      'currency': _selectedCurrency,
      if (_selectedColor != null) 'color': _selectedColor,
      'is_default': _isDefault,
      if (_notesController.text.trim().isNotEmpty) 'notes': _notesController.text.trim(),
    };

    // 3. API 调用
    setState(() => _isLoading = true);
    try {
      if (widget.account == null) {
        // 创建新账户
        await ApiService.createAccount(accountData);
      } else {
        // 更新现有账户
        await ApiService.updateAccount(widget.account!.id!, accountData);
      }

      // 4. 成功回调
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(widget.account == null ? '账户创建成功！' : '账户更新成功！'),
            backgroundColor: Colors.green,
          ),
        );
        widget.onAccountSaved?.call();
      }
    } catch (e) {
      // 先检查是否是认证错误，如果是会自动跳转到登录页
      final isAuthError = await AuthHelper.handleAuthError(
        context,
        e,
        customMessage: '登录已过期，请重新登录后保存账户',
      );

      // 如果不是认证错误，显示通用错误信息
      if (!isAuthError && mounted) {
        _showError('保存失败：$e');
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isEditMode = widget.account != null;

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 500),
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 标题栏
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    isEditMode ? '编辑账户' : '添加账户',
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              Expanded(
                child: SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // 账户名称
                      TextFormField(
                        controller: _nameController,
                        decoration: const InputDecoration(
                          labelText: '账户名称 *',
                          hintText: '例如：招商银行',
                          border: OutlineInputBorder(),
                          prefixIcon: Icon(Icons.account_balance),
                        ),
                        validator: (value) {
                          if (value == null || value.trim().isEmpty) {
                            return '请输入账户名称';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),

                      // 账户类型
                      DropdownButtonFormField<String>(
                        value: _selectedAccountType,
                        decoration: const InputDecoration(
                          labelText: '账户类型 *',
                          border: OutlineInputBorder(),
                          prefixIcon: Icon(Icons.category),
                        ),
                        items: _accountTypes.map((type) {
                          return DropdownMenuItem<String>(
                            value: type['value'] as String,
                            child: Row(
                              children: [
                                Icon(type['icon'] as IconData, size: 20),
                                const SizedBox(width: 12),
                                Text(type['label'] as String),
                              ],
                            ),
                          );
                        }).toList(),
                        onChanged: (value) {
                          if (value != null) {
                            setState(() => _selectedAccountType = value);
                          }
                        },
                      ),
                      const SizedBox(height: 16),

                      // 账号（可选）
                      TextFormField(
                        controller: _accountNumberController,
                        decoration: const InputDecoration(
                          labelText: '账号（可选）',
                          hintText: '例如：后4位 1234',
                          border: OutlineInputBorder(),
                          prefixIcon: Icon(Icons.numbers),
                        ),
                      ),
                      const SizedBox(height: 16),

                      // 初始余额（新增模式必填）
                      TextFormField(
                        controller: _balanceController,
                        decoration: InputDecoration(
                          labelText: isEditMode ? '当前余额' : '初始余额 *',
                          hintText: '0.00',
                          border: const OutlineInputBorder(),
                          prefixIcon: const Icon(Icons.money),
                          suffixText: _selectedCurrency,
                        ),
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        inputFormatters: [
                          FilteringTextInputFormatter.allow(RegExp(r'^\d+\.?\d{0,2}')),
                        ],
                        enabled: !isEditMode, // 编辑模式下不允许修改余额
                        validator: (value) {
                          if (!isEditMode && (value == null || value.trim().isEmpty)) {
                            return '请输入初始余额';
                          }
                          if (value != null && value.trim().isNotEmpty) {
                            final balance = double.tryParse(value);
                            if (balance == null || balance < 0) {
                              return '请输入有效的余额';
                            }
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),

                      // 货币类型（只读）
                      TextFormField(
                        initialValue: _selectedCurrency,
                        decoration: const InputDecoration(
                          labelText: '货币类型',
                          border: OutlineInputBorder(),
                          prefixIcon: Icon(Icons.currency_exchange),
                        ),
                        readOnly: true,
                      ),
                      const SizedBox(height: 16),

                      // 颜色选择
                      const Text(
                        '账户颜色',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
                      ),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: _colorOptions.map((color) {
                          final isSelected = _selectedColor == color;
                          return GestureDetector(
                            onTap: () => setState(() => _selectedColor = color),
                            child: Container(
                              width: 36,
                              height: 36,
                              decoration: BoxDecoration(
                                color: Color(
                                  int.parse(color.substring(1), radix: 16) + 0xFF000000,
                                ),
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: isSelected ? Colors.grey[800]! : Colors.transparent,
                                  width: isSelected ? 3 : 1,
                                ),
                              ),
                              child: isSelected
                                  ? const Icon(Icons.check, color: Colors.white, size: 20)
                                  : null,
                            ),
                          );
                        }).toList(),
                      ),
                      const SizedBox(height: 16),

                      // 备注（可选）
                      TextFormField(
                        controller: _notesController,
                        decoration: const InputDecoration(
                          labelText: '备注（可选）',
                          hintText: '添加备注信息...',
                          border: OutlineInputBorder(),
                          prefixIcon: Icon(Icons.note),
                        ),
                        maxLines: 2,
                      ),
                      const SizedBox(height: 16),

                      // 设为默认账户
                      SwitchListTile(
                        title: const Text('设为默认账户'),
                        subtitle: const Text('记账时默认使用此账户'),
                        value: _isDefault,
                        onChanged: (value) => setState(() => _isDefault = value),
                        contentPadding: EdgeInsets.zero,
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 24),

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
                      onPressed: _isLoading ? null : _saveAccount,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.blue,
                        foregroundColor: Colors.white,
                      ),
                      child: _isLoading
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
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
}
