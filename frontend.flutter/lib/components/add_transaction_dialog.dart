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

  // 预算相关状态
  Map<String, dynamic>? _budgetInfo;
  bool _isLoadingBudget = false;

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

    // 加载初始分类的预算
    if (_selectedCategory != null) {
      _loadBudgetForCategory(_selectedCategory!.id);
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

  Future<void> _loadBudgetForCategory(int? categoryId) async {
    if (categoryId == null || _selectedType != 'expense') {
      setState(() {
        _budgetInfo = null;
        _isLoadingBudget = false;
      });
      return;
    }

    setState(() => _isLoadingBudget = true);

    try {
      final isLoggedIn = await AuthHelper.checkLogin(context);
      if (!isLoggedIn || !mounted) return;

      final budgets = await ApiService.getBudgets(period: 'monthly');
      final budgetList = budgets['budgets'] as List?;

      if (budgetList != null && budgetList.isNotEmpty) {
        // 查找匹配分类的预算
        final budget = budgetList.firstWhere(
          (b) => b['categoryId'] == categoryId,
          orElse: () => null,
        );

        if (budget != null) {
          final amount = budget['amount'] as double;
          final spent = budget['spent'] as double? ?? 0.0;
          final remaining = amount - spent;
          final percentage = amount > 0 ? (spent / amount * 100) : 0.0;

          setState(() {
            _budgetInfo = {
              'amount': amount,
              'spent': spent,
              'remaining': remaining,
              'percentage': percentage,
            };
            _isLoadingBudget = false;
          });
        } else {
          setState(() {
            _budgetInfo = null;
            _isLoadingBudget = false;
          });
        }
      } else {
        setState(() {
          _budgetInfo = null;
          _isLoadingBudget = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _budgetInfo = null;
          _isLoadingBudget = false;
        });
      }
    }
  }

  void _updateCategoryForType() {
    // 当切换交易类型时，更新选中的分类
    final newTypeCategories = widget.categories
        .where((c) => c.type == _selectedType)
        .toList();
    
    if (newTypeCategories.isNotEmpty) {
      setState(() {
        _selectedCategory = newTypeCategories.first;
      });
    } else {
      setState(() {
        _selectedCategory = null;
      });
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
          child: ConstrainedBox(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.of(context).size.height * 0.85, // 最大高度为屏幕的85%
            ),
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 标题栏
                  Column(
                    children: [
                      Text(
                        widget.transaction == null ? '记一笔' : '编辑记录',
                        style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                        ),
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
                  if (_selectedType != 'transfer')
                    _buildCategorySelector(),

                  // 预算信息（仅支出类型显示）
                  if (_selectedType == 'expense' && _selectedCategory != null)
                    _buildBudgetInfoCard(),

                  const SizedBox(height: 16),

                  // 账户选择
                  _buildAccountSelector(),

                  const SizedBox(height: 20),

                  // 日期选择
                  _buildDatePicker(),

                  const SizedBox(height: 20),

                  // 备注
                  _buildNoteInput(),

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
        ),
      ),
    );
  }

  Widget _buildTypeToggle() {
    return Row(
      children: [
        Expanded(
          child: InkWell(
            onTap: () {
              setState(() {
                _selectedType = 'expense';
                _updateCategoryForType();
              });
            },
            borderRadius: BorderRadius.circular(12),
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 16),
              decoration: BoxDecoration(
                color: _selectedType == 'expense' ? Colors.red : Colors.grey[200],
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: _selectedType == 'expense' ? Colors.red : Colors.grey[300]!,
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.money_off,
                    color: _selectedType == 'expense' ? Colors.white : Colors.grey[700],
                  ),
                  const SizedBox(width: 8),
                  Text(
                    '支出',
                    style: TextStyle(
                      color: _selectedType == 'expense' ? Colors.white : Colors.grey[700],
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: InkWell(
            onTap: () {
              setState(() {
                _selectedType = 'income';
                _updateCategoryForType();
              });
            },
            borderRadius: BorderRadius.circular(12),
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 16),
              decoration: BoxDecoration(
                color: _selectedType == 'income' ? Colors.green : Colors.grey[200],
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: _selectedType == 'income' ? Colors.green : Colors.grey[300]!,
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.money,
                    color: _selectedType == 'income' ? Colors.white : Colors.grey[700],
                  ),
                  const SizedBox(width: 8),
                  Text(
                    '收入',
                    style: TextStyle(
                      color: _selectedType == 'income' ? Colors.white : Colors.grey[700],
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          ),
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

  Widget _buildBudgetInfoCard() {
    if (_isLoadingBudget) {
      return const Card(
        child: Padding(
          padding: EdgeInsets.all(16),
          child: Center(child: CircularProgressIndicator()),
        ),
      );
    }

    if (_budgetInfo == null) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Icon(Icons.info_outline, color: Colors.grey[400]),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  '该分类暂未设置预算',
                  style: TextStyle(color: Colors.grey[600]),
                ),
              ),
            ],
          ),
        ),
      );
    }

    final amount = _budgetInfo!['amount'] as double;
    final spent = _budgetInfo!['spent'] as double;
    final remaining = _budgetInfo!['remaining'] as double;
    final percentage = _budgetInfo!['percentage'] as double;

    // 颜色预警逻辑
    Color progressColor;
    String statusText;

    if (percentage >= 100) {
      progressColor = Colors.red;
      statusText = '已超支 ${remaining.abs().toStringAsFixed(2)}';
    } else if (percentage >= 80) {
      progressColor = Colors.orange;
      statusText = '预算即将用尽';
    } else {
      progressColor = Colors.green;
      statusText = '预算充足';
    }

    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(
                      Icons.account_balance_wallet,
                      color: progressColor,
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      '本月预算',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: progressColor,
                      ),
                    ),
                  ],
                ),
                Text(
                  statusText,
                  style: TextStyle(
                    fontSize: 14,
                    color: progressColor,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            // 进度条
            ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: LinearProgressIndicator(
                value: percentage > 100 ? 1.0 : percentage / 100,
                backgroundColor: Colors.grey[200],
                valueColor: AlwaysStoppedAnimation<Color>(progressColor),
                minHeight: 8,
              ),
            ),
            const SizedBox(height: 12),
            // 详细数据
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _buildBudgetItem('预算', '¥${amount.toStringAsFixed(0)}', Colors.blue),
                _buildBudgetItem('已用', '¥${spent.toStringAsFixed(0)}', progressColor),
                _buildBudgetItem('剩余', '¥${remaining.toStringAsFixed(0)}',
                  remaining >= 0 ? Colors.green : Colors.red),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBudgetItem(String label, String value, Color color) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: Colors.grey[600],
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
      ],
    );
  }

  Widget _buildCategorySelector() {
    final filteredCategories = widget.categories
        .where((c) => c.type == _selectedType)
        .toList();

    // 分组：顶级分类和子分类
    final parentCategories = filteredCategories.where((c) => c.parentId == null).toList();
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              '分类',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w500,
              ),
            ),
            TextButton.icon(
              onPressed: () {
                Navigator.pop(context);
                Navigator.pushNamed(context, '/categories');
              },
              icon: const Icon(Icons.category, size: 16),
              label: const Text('管理分类', style: TextStyle(fontSize: 12)),
            ),
          ],
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
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: parentCategories.length,
            itemBuilder: (context, index) {
              final parent = parentCategories[index];
              final hasSubcategories = parent.subcategories != null && 
                                      parent.subcategories!.isNotEmpty;
              final isSelected = _selectedCategory?.id == parent.id;
              
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 父分类
                  GestureDetector(
                    onTap: () {
                      setState(() => _selectedCategory = parent);
                      _loadBudgetForCategory(parent.id);
                    },
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 10,
                      ),
                      decoration: BoxDecoration(
                        color: isSelected ? Colors.blue : Colors.grey[100],
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: isSelected ? Colors.blue : Colors.grey[300]!,
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (parent.icon != null)
                            Icon(
                              _getIconData(parent.icon),
                              size: 18,
                              color: isSelected ? Colors.white : Colors.grey[700],
                            ),
                          const SizedBox(width: 6),
                          Text(
                            parent.name,
                            style: TextStyle(
                              color: isSelected ? Colors.white : Colors.grey[800],
                              fontWeight:
                                  isSelected ? FontWeight.bold : FontWeight.normal,
                              fontSize: 15,
                            ),
                          ),
                          if (hasSubcategories) ...[
                            const SizedBox(width: 4),
                            Icon(
                              Icons.expand_more,
                              size: 16,
                              color: isSelected ? Colors.white70 : Colors.grey,
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                  
                  // 子分类
                  if (hasSubcategories)
                    Padding(
                      padding: const EdgeInsets.only(left: 24, bottom: 8),
                      child: Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: parent.subcategories!.map((sub) {
                          final isSubSelected = _selectedCategory?.id == sub.id;
                          return GestureDetector(
                            onTap: () {
                              setState(() => _selectedCategory = sub);
                              _loadBudgetForCategory(sub.id);
                            },
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 6,
                              ),
                              decoration: BoxDecoration(
                                color: isSubSelected ? Colors.blue.withOpacity(0.9) : Colors.grey[200],
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                  color: isSubSelected ? Colors.blue : Colors.transparent,
                                ),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  if (sub.icon != null)
                                    Icon(
                                      _getIconData(sub.icon),
                                      size: 14,
                                      color: isSubSelected ? Colors.white : Colors.grey[700],
                                    ),
                                  const SizedBox(width: 4),
                                  Text(
                                    sub.name,
                                    style: TextStyle(
                                      color: isSubSelected ? Colors.white : Colors.grey[700],
                                      fontWeight: isSubSelected ? FontWeight.w500 : FontWeight.normal,
                                      fontSize: 13,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                    ),
                ],
              );
            },
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
        child: const Row(
          children: [
            Icon(Icons.warning, color: Colors.orange),
            SizedBox(width: 8),
            const Expanded(
              child: Text('暂无账户，请先创建账户'),
            ),
          ],
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          '账户',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
        ),
        const SizedBox(height: 8),
        
        // 根据交易类型显示不同的账户选择
        if (_selectedType == 'expense' || _selectedType == 'loan_out')
          _buildSingleAccountSelector('支付账户', _selectedFromAccount, (account) {
            setState(() => _selectedFromAccount = account);
          })
        else if (_selectedType == 'income' || _selectedType == 'loan_in')
          _buildSingleAccountSelector('收入账户', _selectedToAccount, (account) {
            setState(() => _selectedToAccount = account);
          })
        else if (_selectedType == 'transfer')
          Column(
            children: [
              _buildSingleAccountSelector('转出账户', _selectedFromAccount, (account) {
                setState(() => _selectedFromAccount = account);
              }),
              const SizedBox(height: 8),
              _buildSingleAccountSelector('转入账户', _selectedToAccount, (account) {
                setState(() => _selectedToAccount = account);
              }),
            ],
          ),
      ],
    );
  }

  Widget _buildSingleAccountSelector(String label, Account? selected, Function(Account) onSelected) {
    return DropdownButtonFormField<Account>(
      value: selected,
      decoration: InputDecoration(
        labelText: label,
        border: const OutlineInputBorder(),
      ),
      items: _accounts.map((account) {
        return DropdownMenuItem<Account>(
          value: account,
          child: Text(account.name),
        );
      }).toList(),
      onChanged: (account) {
        if (account != null) {
          onSelected(account);
        }
      },
    );
  }

  Widget _buildDatePicker() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          '日期',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
        ),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(
            border: Border.all(color: Colors.grey[300]!),
            borderRadius: BorderRadius.circular(12),
          ),
          child: ListTile(
            leading: const Icon(Icons.calendar_today, color: Colors.grey),
            title: Text(
              DateFormat('yyyy-MM-dd').format(_selectedDate),
            ),
            trailing: const Icon(Icons.arrow_drop_down),
            onTap: () async {
              final picked = await showDatePicker(
                context: context,
                initialDate: _selectedDate,
                firstDate: DateTime(2020),
                lastDate: DateTime.now(),
              );
              if (picked != null && mounted) {
                setState(() => _selectedDate = picked);
              }
            },
          ),
        ),
      ],
    );
  }

  Widget _buildNoteInput() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          '备注（可选）',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
        ),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(
            border: Border.all(color: Colors.grey[300]!),
            borderRadius: BorderRadius.circular(12),
          ),
          child: TextField(
            controller: _noteController,
            maxLines: 3,
            decoration: const InputDecoration(
              border: InputBorder.none,
              contentPadding: EdgeInsets.all(12),
              hintText: '添加备注...',
            ),
          ),
        ),
      ],
    );
  }

  IconData _getIconData(String? iconName) {
    // 统一的图标映射表，支持前后端多种图标名称
    // 餐饮类
    if (['food', 'restaurant', 'fastfood', 'breakfast', 'lunch', 'dinner',
         'restaurant_menu', 'local_dining', 'local_cafe', 'set_meal',
         'breakfast_dining', 'dinner_dining', 'liquor'].contains(iconName)) {
      return Icons.restaurant;
    }
    
    // 交通类
    if (['transport', 'bus', 'directions_bus', 'subway', 'metro', 'train',
         'car', 'taxi', 'directions_car', 'local_taxi', 'local_shipping',
         'two_wheeler', 'electric_moped', 'pedal_bike'].contains(iconName)) {
      return Icons.directions_car;
    }
    if (iconName == 'flight') return Icons.flight;
    
    // 购物类
    if (['shopping', 'shopping_cart', 'store', 'mall', 'shopping_bag'].contains(iconName)) {
      return Icons.shopping_cart;
    }
    
    // 居住类
    if (['home', 'house', 'rent', 'hotel'].contains(iconName)) {
      return Icons.home;
    }
    if (iconName == 'home_work') return Icons.home_work;
    
    // 娱乐类
    if (['entertainment', 'movie', 'film', 'theater', 'cinema'].contains(iconName)) {
      return Icons.movie;
    }
    if (['game', 'gaming', 'sports_esports', 'casino'].contains(iconName)) {
      return Icons.sports_esports;
    }
    if (['music', 'audio', 'song'].contains(iconName)) {
      return Icons.music_note;
    }
    if (['travel', 'vacation', 'trip'].contains(iconName)) {
      return Icons.flight;
    }
    
    // 医疗类
    if (['medical', 'hospital', 'health', 'doctor'].contains(iconName)) {
      return Icons.local_hospital;
    }
    if (['drugstore', 'pharmacy', 'medication', 'pill'].contains(iconName)) {
      return Icons.medication;
    }
    
    // 教育类
    if (['education', 'school', 'teach', 'learn'].contains(iconName)) {
      return Icons.school;
    }
    if (['book', 'library', 'reading'].contains(iconName)) {
      return Icons.menu_book;
    }
    if (['science', 'lab'].contains(iconName)) {
      return Icons.science;
    }
    
    // 通讯类
    if (['phone', 'mobile', 'cellphone'].contains(iconName)) {
      return Icons.phone;
    }
    if (['internet', 'wifi', 'network'].contains(iconName)) {
      return Icons.wifi;
    }
    if (['bill', 'receipt'].contains(iconName)) {
      return Icons.receipt_long;
    }
    
    // 金融类
    if (['salary', 'income', 'wage'].contains(iconName)) {
      return Icons.attach_money;
    }
    if (['bonus', 'reward', 'prize'].contains(iconName)) {
      return Icons.card_giftcard;
    }
    if (['investment', 'stock', 'finance'].contains(iconName)) {
      return Icons.trending_up;
    }
    if (['bank', 'account', 'account_balance', 'account_balance_wallet'].contains(iconName)) {
      return Icons.account_balance;
    }
    if (['credit_card', 'card', 'payment'].contains(iconName)) {
      return Icons.credit_card;
    }
    
    // 生活类
    if (['clean', 'cleaning_services', 'cleaning'].contains(iconName)) {
      return Icons.cleaning_services;
    }
    if (['laundry', 'wash'].contains(iconName)) {
      return Icons.local_laundry_service;
    }
    if (['iron', 'ironing'].contains(iconName)) {
      return Icons.iron;
    }
    
    // 其他
    if (['social', 'gift', 'present'].contains(iconName)) {
      return Icons.card_giftcard;
    }
    if (['other', 'misc', 'category', 'more'].contains(iconName)) {
      return Icons.category;
    }
    if (['part_time', 'parttime', 'work', 'job', 'office'].contains(iconName)) {
      return Icons.work;
    }
    if (['pet', 'pets', 'animal'].contains(iconName)) {
      return Icons.pets;
    }
    if (['baby', 'child', 'child_care'].contains(iconName)) {
      return Icons.child_care;
    }
    if (['fitness', 'sport', 'gym', 'fitness_center'].contains(iconName)) {
      return Icons.fitness_center;
    }
    if (['spa', 'massage', 'beauty'].contains(iconName)) {
      return Icons.spa;
    }
    
    // 返回默认图标
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

    // 记账类型不需要分类，其他类型需要分类
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
          _showError('请选择转出和转入账户');
          return;
        }
        break;
    }

    // 3. 保存数据
    setState(() => _isLoading = true);

    try {
      final transactionData = {
        'amount': amount,
        'type': _selectedType,
        'transactionDate': _selectedDate.toIso8601String().split('T')[0],
        if (_noteController.text.trim().isNotEmpty) 'notes': _noteController.text.trim(),
        if (_selectedCategory != null) 'categoryId': _selectedCategory!.id,
        if (_selectedFromAccount != null) 'fromAccountId': _selectedFromAccount!.id,
        if (_selectedToAccount != null) 'toAccountId': _selectedToAccount!.id,
      };

      if (widget.transaction == null) {
        // 新增
        await ApiService.createTransaction(transactionData);
      } else {
        // 编辑
        await ApiService.updateTransaction(widget.transaction!.id!, transactionData);
      }

      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(widget.transaction == null ? '记账成功！' : '更新成功！'),
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
}
