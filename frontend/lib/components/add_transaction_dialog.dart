import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import '../models/transaction_model.dart';
import '../models/category_model.dart';
import '../models/account_model.dart';
import '../services/api_service.dart';
import '../utils/auth_helper.dart';

class AddTransactionDialog extends StatefulWidget {
  final Transaction? transaction;
  final List<Category> categories;
  final VoidCallback? onTransactionSaved;

  const AddTransactionDialog({
    super.key,
    this.transaction,
    required this.categories,
    this.onTransactionSaved,
  });

  @override
  State<AddTransactionDialog> createState() => _AddTransactionDialogState();
}

class _AddTransactionDialogState extends State<AddTransactionDialog> {
  final _formKey = GlobalKey<FormState>();
  final _amountController = TextEditingController();
  final _noteController = TextEditingController();

  String _selectedType = 'expense';
  Category? _selectedCategory;
  DateTime _selectedDate = DateTime.now();
  bool _isLoading = false;
  final ImagePicker _picker = ImagePicker();
  List<XFile> _selectedImages = [];

  // 账户相关状态
  List<Account> _accounts = [];
  Account? _selectedFromAccount; // 支出/转出账户
  Account? _selectedToAccount; // 收入/转入账户
  bool _isLoadingAccounts = true;

  @override
  void initState() {
    super.initState();
    _loadAccounts(); // 加载账户列表

    if (widget.transaction != null) {
      // 编辑模式
      _amountController.text = widget.transaction!.amount.toString();
      _noteController.text = widget.transaction!.note ?? '';
      _selectedType = widget.transaction!.type;
      _selectedCategory = widget.categories.firstWhere(
        (c) => c.id == widget.transaction!.categoryId,
        orElse: () => widget.categories.isNotEmpty
            ? widget.categories.first
            : Category(name: '未知', type: widget.transaction!.type),
      );
      _selectedDate = widget.transaction!.date;
    } else {
      // 新增模式
      if (widget.categories.isNotEmpty) {
        _selectedCategory = widget.categories.firstWhere(
          (c) => c.type == _selectedType,
          orElse: () => widget.categories.first,
        );
      }
    }
  }

  @override
  void dispose() {
    _amountController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _loadAccounts() async {
    setState(() => _isLoadingAccounts = true);
    try {
      final accounts = await ApiService.getAccounts();
      if (mounted) {
        setState(() {
          _accounts = accounts;
          // 自动选择默认账户
          if (accounts.isNotEmpty) {
            _selectedFromAccount = accounts.firstWhere(
              (a) => a.isDefault,
              orElse: () => accounts.first,
            );
            _selectedToAccount = accounts.firstWhere(
              (a) => a.isDefault,
              orElse: () => accounts.first,
            );
          }
          _isLoadingAccounts = false;
        });
      }
    } catch (e) {
      // 先检查是否是认证错误，如果是会自动跳转到登录页
      final isAuthError = await AuthHelper.handleAuthError(
        context,
        e,
        customMessage: '登录已过期，请重新登录后加载账户',
      );

      // 如果不是认证错误，显示通用错误信息
      if (!isAuthError && mounted) {
        setState(() => _isLoadingAccounts = false);
        _showError('加载账户失败：$e');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
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
                    widget.transaction == null ? '记一笔' : '编辑记录',
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

              // 收支类型切换
              _buildTypeToggle(),
              const SizedBox(height: 20),

              // 金额输入
              _buildAmountInput(),
              const SizedBox(height: 20),

              // 分类选择
              _buildCategorySelector(),
              const SizedBox(height: 20),

              // 账户选择
              _buildAccountSelector(),
              const SizedBox(height: 20),

              // 日期选择
              _buildDateSelector(),
              const SizedBox(height: 20),

              // 备注输入
              TextFormField(
                controller: _noteController,
                decoration: const InputDecoration(
                  labelText: '备注（可选）',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.note),
                ),
                maxLines: 2,
              ),
              const SizedBox(height: 20),

              // 图片上传
              _buildImageUploadSection(),
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
                      onPressed: _isLoading ? null : _saveTransaction,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green,
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

  Widget _buildTypeToggle() {
    // 交易类型配置
    final transactionTypes = [
      {'value': 'expense', 'label': '支出', 'icon': Icons.money_off, 'color': Colors.red},
      {'value': 'income', 'label': '收入', 'icon': Icons.money, 'color': Colors.green},
      {'value': 'transfer', 'label': '转账', 'icon': Icons.swap_horiz, 'color': Colors.blue},
      {'value': 'loan_in', 'label': '借入', 'icon': Icons.call_received, 'color': Colors.orange},
      {'value': 'loan_out', 'label': '借出', 'icon': Icons.call_made, 'color': Colors.purple},
      {'value': 'repayment', 'label': '还款', 'icon': Icons.assignment_return, 'color': Colors.teal},
    ];

    final selectedTypeConfig = transactionTypes.firstWhere(
      (type) => type['value'] == _selectedType,
      orElse: () => transactionTypes[0],
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          '交易类型',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 8),
        // 使用下拉选择器替代原来的2按钮切换，支持所有6种类型
        DropdownButtonFormField<String>(
          value: _selectedType,
          decoration: InputDecoration(
            border: const OutlineInputBorder(),
            prefixIcon: Icon(
              selectedTypeConfig['icon'] as IconData,
              color: selectedTypeConfig['color'] as Color,
            ),
          ),
          items: transactionTypes.map((typeConfig) {
            return DropdownMenuItem<String>(
              value: typeConfig['value'] as String,
              child: Row(
                children: [
                  Icon(
                    typeConfig['icon'] as IconData,
                    size: 20,
                    color: typeConfig['color'] as Color,
                  ),
                  const SizedBox(width: 8),
                  Text(typeConfig['label'] as String),
                ],
              ),
            );
          }).toList(),
          onChanged: (value) {
            if (value != null) {
              setState(() {
                _selectedType = value;
                _updateCategoryForType();
              });
            }
          },
        ),
      ],
    );
  }

  Widget _buildAmountInput() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          '金额',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            border: Border.all(color: Colors.grey[300]!),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            children: [
              const Text(
                '¥',
                style: TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: TextField(
                  controller: _amountController,
                  keyboardType:
                      const TextInputType.numberWithOptions(decimal: true),
                  decoration: const InputDecoration(
                    border: InputBorder.none,
                    hintText: '0.00',
                  ),
                  style: const TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildCategorySelector() {
    final filteredCategories = widget.categories
        .where((c) => c.type == _selectedType)
        .toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          '分类',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 8),
        if (filteredCategories.isEmpty)
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              border: Border.all(color: Colors.grey[300]!),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Text('暂无分类，请先创建分类'),
          )
        else
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: filteredCategories.map((category) {
              final isSelected = _selectedCategory?.id == category.id;
              return GestureDetector(
                onTap: () => setState(() => _selectedCategory = category),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    color: isSelected ? Colors.blue : Colors.grey[200],
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: isSelected ? Colors.blue : Colors.grey[300]!,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (category.icon != null)
                        Icon(
                          _getIconData(category.icon),
                          size: 16,
                          color: isSelected ? Colors.white : Colors.grey[700],
                        ),
                      const SizedBox(width: 4),
                      Text(
                        category.name,
                        style: TextStyle(
                          color: isSelected ? Colors.white : Colors.grey[700],
                          fontWeight:
                              isSelected ? FontWeight.bold : FontWeight.normal,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
      ],
    );
  }

  Widget _buildAccountSelector() {
    if (_isLoadingAccounts) {
      return const Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '账户',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
          ),
          SizedBox(height: 8),
          Center(child: CircularProgressIndicator()),
        ],
      );
    }

    if (_accounts.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          border: Border.all(color: Colors.orange[300]!),
          borderRadius: BorderRadius.circular(12),
          color: Colors.orange[50],
        ),
        child: Row(
          children: [
            const Icon(Icons.warning, color: Colors.orange),
            const SizedBox(width: 8),
            const Expanded(
              child: Text('暂无账户，请先创建账户'),
            ),
            TextButton(
              onPressed: () {
                Navigator.pop(context);
                Navigator.pushNamed(context, '/accounts');
              },
              child: const Text('去创建'),
            ),
          ],
        ),
      );
    }

    // 根据交易类型显示不同的账户选择器
    switch (_selectedType) {
      case 'expense':
      case 'loan_out':
        // 支出/借出：只需要转出账户
        return _buildSingleAccountSelector(
          title: _selectedType == 'loan_out' ? '借出账户' : '支付账户',
          selectedAccount: _selectedFromAccount,
          onChanged: (account) => setState(() => _selectedFromAccount = account),
        );

      case 'income':
      case 'loan_in':
        // 收入/借入：只需要转入账户
        return _buildSingleAccountSelector(
          title: _selectedType == 'loan_in' ? '借入账户' : '收入账户',
          selectedAccount: _selectedToAccount,
          onChanged: (account) => setState(() => _selectedToAccount = account),
        );

      case 'transfer':
        // 转账：需要转出和转入两个账户
        return Column(
          children: [
            _buildSingleAccountSelector(
              title: '转出账户',
              selectedAccount: _selectedFromAccount,
              onChanged: (account) => setState(() => _selectedFromAccount = account),
            ),
            const SizedBox(height: 12),
            _buildSingleAccountSelector(
              title: '转入账户',
              selectedAccount: _selectedToAccount,
              onChanged: (account) => setState(() => _selectedToAccount = account),
            ),
          ],
        );

      case 'repayment':
        // 还款：需要转出账户（还款方）
        return _buildSingleAccountSelector(
          title: '还款账户',
          selectedAccount: _selectedFromAccount,
          onChanged: (account) => setState(() => _selectedFromAccount = account),
        );

      default:
        return const SizedBox.shrink();
    }
  }

  Widget _buildSingleAccountSelector({
    required String title,
    required Account? selectedAccount,
    required ValueChanged<Account?> onChanged,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
        ),
        const SizedBox(height: 8),
        DropdownButtonFormField<Account>(
          value: selectedAccount,
          decoration: InputDecoration(
            border: const OutlineInputBorder(),
            prefixIcon: Icon(selectedAccount?.getAccountTypeIcon() ?? Icons.account_balance),
          ),
          items: _accounts.map((account) {
            return DropdownMenuItem<Account>(
              value: account,
              child: Row(
                children: [
                  Icon(account.getAccountTypeIcon(), size: 20, color: account.getAccountTypeColor()),
                  const SizedBox(width: 8),
                  Text(account.name),
                  const SizedBox(width: 8),
                  Text(
                    '¥${account.balance.toStringAsFixed(2)}',
                    style: TextStyle(color: Colors.grey[600], fontSize: 12),
                  ),
                  if (account.isDefault) ...[
                    const SizedBox(width: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.blue[100],
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        '默认',
                        style: TextStyle(fontSize: 10, color: Colors.blue[700]),
                      ),
                    ),
                  ],
                ],
              ),
            );
          }).toList(),
          onChanged: onChanged,
          validator: (value) {
            if (value == null) {
              return '请选择账户';
            }
            return null;
          },
        ),
      ],
    );
  }

  Widget _buildDateSelector() {
    return InkWell(
      onTap: _selectDate,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          border: Border.all(color: Colors.grey[300]!),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            const Icon(Icons.calendar_today),
            const SizedBox(width: 12),
            Text(
              DateFormat('yyyy年MM月dd日').format(_selectedDate),
              style: const TextStyle(fontSize: 16),
            ),
            const Spacer(),
            const Icon(Icons.arrow_drop_down),
          ],
        ),
      ),
    );
  }

  Future<void> _selectDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime(2000),
      lastDate: DateTime.now(),
    );

    if (picked != null) {
      setState(() => _selectedDate = picked);
    }
  }

  void _updateCategoryForType() {
    final matchingCategories =
        widget.categories.where((c) => c.type == _selectedType).toList();

    if (matchingCategories.isNotEmpty) {
      _selectedCategory = matchingCategories.first;
    } else {
      _selectedCategory = null;
    }
  }

  IconData _getIconData(String? iconName) {
    // TODO: 根据分类图标字符串返回对应的 IconData
    return Icons.category;
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: Colors.red),
    );
  }

  Future<void> _saveTransaction() async {
    // 1. 表单验证
    final amount = double.tryParse(_amountController.text);
    if (amount == null || amount <= 0) {
      _showError('请输入有效金额');
      return;
    }

    // 转账类型不需要分类，其他类型需要分类
    if (_selectedType != 'transfer' && _selectedCategory == null) {
      _showError('请选择分类');
      return;
    }

    // 2. 账户验证 - 根据交易类型验证必需的账户
    switch (_selectedType) {
      case 'expense':
      case 'loan_out':
        if (_selectedFromAccount == null) {
          _showError(_selectedType == 'loan_out' ? '请选择借出账户' : '请选择支付账户');
          return;
        }
        break;

      case 'income':
      case 'loan_in':
        if (_selectedToAccount == null) {
          _showError(_selectedType == 'loan_in' ? '请选择借入账户' : '请选择收入账户');
          return;
        }
        break;

      case 'transfer':
        if (_selectedFromAccount == null || _selectedToAccount == null) {
          _showError('转账需要选择转出和转入账户');
          return;
        }
        if (_selectedFromAccount!.id == _selectedToAccount!.id) {
          _showError('转出和转入账户不能相同');
          return;
        }
        break;

      case 'repayment':
        if (_selectedFromAccount == null) {
          _showError('请选择还款账户');
          return;
        }
        break;
    }

    // 3. 构建数据 - 根据交易类型构建不同的数据结构
    final transactionData = {
      'amount': amount,
      'type': _selectedType,
      'transaction_date': _selectedDate.toIso8601String(),
      if (_noteController.text.isNotEmpty) 'notes': _noteController.text,
      // 分类（转账不需要分类）
      if (_selectedType != 'transfer' && _selectedCategory != null)
        'category_id': _selectedCategory!.id!,
      // 账户ID
      if (_selectedType == 'expense' ||
          _selectedType == 'loan_out' ||
          _selectedType == 'repayment')
        'from_account_id': _selectedFromAccount!.id,
      if (_selectedType == 'income' || _selectedType == 'loan_in')
        'to_account_id': _selectedToAccount!.id,
      if (_selectedType == 'transfer') ...{
        'from_account_id': _selectedFromAccount!.id,
        'to_account_id': _selectedToAccount!.id,
      },
    };

    // 4. API 调用
    setState(() => _isLoading = true);
    try {
      Map<String, dynamic> response;
      if (widget.transaction == null) {
        response = await ApiService.createTransaction(transactionData);
      } else {
        response = await ApiService.updateTransaction(
          widget.transaction!.id!,
          transactionData,
        );
      }

      // 5. Upload images if any
      final transactionId = response['id'];
      if (_selectedImages.isNotEmpty && transactionId != null) {
        try {
          final files = _selectedImages.map((xfile) => File(xfile.path)).toList();
          await ApiService.uploadTransactionImages(transactionId, files);
        } catch (e) {
          // Show warning but don't fail the transaction
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('交易已创建，但图片上传失败: $e'),
                backgroundColor: Colors.orange,
                duration: const Duration(seconds: 4),
              ),
            );
          }
        }
      }

      // 6. 成功回调
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(widget.transaction == null ? '记录成功！' : '更新成功！'),
            backgroundColor: Colors.green,
          ),
        );
        widget.onTransactionSaved?.call();
      }
    } catch (e) {
      // 先检查是否是认证错误，如果是会自动跳转到登录页
      final isAuthError = await AuthHelper.handleAuthError(
        context,
        e,
        customMessage: '登录已过期，请重新登录后保存记录',
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

  Widget _buildImageUploadSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '交易凭证（可选）',
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 12),
        Container(
          height: 100,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            itemCount: _selectedImages.length + 1, // +1 for add button
            itemBuilder: (context, index) {
              if (index == _selectedImages.length) {
                // Add button
                return _buildAddImageButton();
              }
              // Image thumbnail
              return _buildImageThumbnail(_selectedImages[index], index);
            },
          ),
        ),
      ],
    );
  }

  Widget _buildAddImageButton() {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: InkWell(
        onTap: _pickImages,
        borderRadius: BorderRadius.circular(8),
        child: Container(
          width: 80,
          height: 80,
          decoration: BoxDecoration(
            border: Border.all(color: Colors.grey[300]!),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.add_photo_alternate, size: 32, color: Colors.grey[700]),
              const SizedBox(height: 4),
              Text(
                '添加',
                style: TextStyle(fontSize: 12, color: Colors.grey[700]),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildImageThumbnail(XFile image, int index) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: Stack(
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              border: Border.all(color: Colors.grey[300]!),
              borderRadius: BorderRadius.circular(8),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: Image.file(
                File(image.path),
                fit: BoxFit.cover,
              ),
            ),
          ),
          Positioned(
            top: -8,
            right: -8,
            child: IconButton(
              iconSize: 20,
              icon: const Icon(Icons.cancel, color: Colors.red),
              onPressed: () {
                setState(() {
                  _selectedImages.removeAt(index);
                });
              },
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(),
              visualDensity: VisualDensity.compact,
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _pickImages() async {
    final List<XFile>? images = await _picker.pickMultiImage();
    if (images != null && images.isNotEmpty) {
      setState(() {
        _selectedImages.addAll(images);
      });
    }
  }
}
