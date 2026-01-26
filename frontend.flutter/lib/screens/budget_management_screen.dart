import 'package:flutter/material.dart';
import '../models/budget_model.dart';
import '../models/category_model.dart';
import '../services/api_service.dart';
import '../components/app_header.dart';
import '../utils/auth_helper.dart';

class BudgetManagementScreen extends StatefulWidget {
  const BudgetManagementScreen({super.key});

  @override
  State<BudgetManagementScreen> createState() => _BudgetManagementScreenState();
}

class _BudgetManagementScreenState extends State<BudgetManagementScreen> {
  List<Budget> _budgets = [];
  List<Category> _expenseCategories = [];
  Map<String, dynamic> _statistics = {};
  bool _isLoading = true;
  String? _errorMessage;
  String _selectedPeriod = 'monthly';

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      // Load budgets, categories, and statistics in parallel
      final results = await Future.wait([
        ApiService.getBudgets(period: _selectedPeriod),
        ApiService.getCategories(type: 'expense'),
      ]);

      // Parse budgets
      final budgetsData = results[0];
      final List<dynamic> budgetList = budgetsData['budgets'] ?? [];
      final budgets = budgetList.map((json) => Budget.fromJson(json)).toList();

      // Parse categories
      final categoriesData = results[1];
      final List<dynamic> categoryList = categoriesData['categories'] ?? [];
      final categories = categoryList.map((json) => Category.fromJson(json)).toList();

      if (mounted) {
        setState(() {
          _budgets = budgets;
          _expenseCategories = categories;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  void _showAddBudgetDialog() async {
    // 检查登录状态
    final isLoggedIn = await AuthHelper.checkLogin(context);
    if (!isLoggedIn) {
      return;
    }

    if (!mounted) return;

    showDialog(
      context: context,
      builder: (context) => AddBudgetDialog(
        expenseCategories: _expenseCategories,
        onBudgetSaved: () {
          _loadData();
        },
      ),
    );
  }

  void _showEditBudgetDialog(Budget budget) {
    showDialog(
      context: context,
      builder: (context) => AddBudgetDialog(
        budget: budget,
        expenseCategories: _expenseCategories,
        onBudgetSaved: () {
          _loadData();
        },
      ),
    );
  }

  Future<void> _handleDeleteBudget(Budget budget) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('确认删除'),
        content: Text('确定要删除此预算吗？'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('取消'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
            ),
            child: const Text('删除'),
          ),
        ],
      ),
    );

    if (confirmed == true && budget.id != null) {
      try {
        await ApiService.deleteBudget(budget.id!);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('预算删除成功'),
              backgroundColor: Colors.green,
            ),
          );
          _loadData();
        }
      } catch (e) {
        // 先检查是否是认证错误，如果是会自动跳转到登录页
        await AuthHelper.handleAuthError(
          context,
          e,
          customMessage: '登录已过期，请重新登录后删除预算',
        );

        // 如果不是认证错误，显示通用错误信息
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('删除失败：$e'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[100],
      body: Column(
        children: [
          const AppHeader(title: '预算管理'),
          Padding(
            padding: const EdgeInsets.all(16),
            child: _buildPeriodFilter(),
          ),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _errorMessage != null
                    ? _buildErrorView()
                    : _buildBudgetListView(),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showAddBudgetDialog,
        backgroundColor: Colors.blue,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add),
        label: const Text('添加预算'),
      ),
    );
  }

  Widget _buildPeriodFilter() {
    return Wrap(
      spacing: 8,
      children: ['monthly', 'yearly'].map((period) {
        final isSelected = _selectedPeriod == period;
        return FilterChip(
          label: Text(_getPeriodDisplayName(period)),
          selected: isSelected,
          onSelected: (selected) {
            if (selected) {
              setState(() => _selectedPeriod = period);
              _loadData();
            }
          },
          selectedColor: Colors.blue,
          checkmarkColor: Colors.white,
        );
      }).toList(),
    );
  }

  Widget _buildErrorView() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, size: 64, color: Colors.red),
          const SizedBox(height: 16),
          Text(
            _errorMessage ?? '加载失败',
            style: const TextStyle(fontSize: 16, color: Colors.red),
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: _loadData,
            child: const Text('重试'),
          ),
        ],
      ),
    );
  }

  Widget _buildBudgetListView() {
    if (_budgets.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.account_balance_wallet, size: 80, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text(
              '还没有预算',
              style: TextStyle(fontSize: 18, color: Colors.grey[600]),
            ),
            const SizedBox(height: 8),
            Text(
              '点击下方按钮创建第一个预算',
              style: TextStyle(fontSize: 14, color: Colors.grey[500]),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: _budgets.map((budget) => _buildBudgetCard(budget)).toList(),
      ),
    );
  }

  Widget _buildBudgetCard(Budget budget) {
    final category = _expenseCategories.firstWhere(
      (c) => c.id == budget.categoryId,
      orElse: () => Category(name: '未知', type: 'expense'),
    );

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header: Category icon + name + actions
            Row(
              children: [
                Container(
                  width: 50,
                  height: 50,
                  decoration: BoxDecoration(
                    color: _getCategoryColor(category.color).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    _getIconData(category.icon),
                    color: _getCategoryColor(category.color),
                    size: 28,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        category.name ?? '',
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        budget.getPeriodDisplayName(),
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.edit, size: 20),
                  onPressed: () => _showEditBudgetDialog(budget),
                  tooltip: '编辑',
                ),
                IconButton(
                  icon: const Icon(Icons.delete, size: 20),
                  onPressed: () => _handleDeleteBudget(budget),
                  tooltip: '删除',
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Budget amount
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  '预算金额',
                  style: TextStyle(fontSize: 14, color: Colors.grey),
                ),
                Text(
                  '¥${budget.amount.toStringAsFixed(2)}',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Progress bar (placeholder - would need statistics API for real progress)
            LinearProgressIndicator(
              value: 0.0, // TODO: Replace with actual progress from statistics API
              backgroundColor: Colors.grey[200],
              valueColor: const AlwaysStoppedAnimation<Color>(Colors.green),
            ),
            const SizedBox(height: 12),

            // Stats row
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '已使用: ¥0.00', // TODO: Replace with actual data
                  style: TextStyle(color: Colors.grey[700], fontSize: 14),
                ),
                Text(
                  '剩余: ¥${budget.amount.toStringAsFixed(2)}',
                  style: TextStyle(
                    color: Colors.green,
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              '使用率: 0.0%', // TODO: Replace with actual data
              style: TextStyle(
                fontSize: 12,
                color: Colors.green,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Color _getCategoryColor(String? colorHex) {
    if (colorHex == null || colorHex.isEmpty) return Colors.grey;
    try {
      return Color(int.parse(colorHex.substring(1), radix: 16) + 0xFF000000);
    } catch (e) {
      return Colors.grey;
    }
  }

  IconData _getIconData(String? iconName) {
    switch (iconName) {
      case 'restaurant':
        return Icons.restaurant;
      case 'shopping_cart':
        return Icons.shopping_cart;
      case 'directions_car':
        return Icons.directions_car;
      case 'home':
        return Icons.home;
      case 'movie':
        return Icons.movie;
      case 'local_hospital':
        return Icons.local_hospital;
      case 'school':
        return Icons.school;
      case 'phone':
        return Icons.phone;
      case 'card_giftcard':
        return Icons.card_giftcard;
      default:
        return Icons.category;
    }
  }

  String _getPeriodDisplayName(String period) {
    switch (period) {
      case 'daily':
        return '每日';
      case 'weekly':
        return '每周';
      case 'monthly':
        return '每月';
      case 'yearly':
        return '每年';
      default:
        return period;
    }
  }
}

// Add/Edit Budget Dialog
class AddBudgetDialog extends StatefulWidget {
  final Budget? budget;
  final List<Category> expenseCategories;
  final VoidCallback? onBudgetSaved;

  const AddBudgetDialog({
    super.key,
    this.budget,
    required this.expenseCategories,
    this.onBudgetSaved,
  });

  @override
  State<AddBudgetDialog> createState() => _AddBudgetDialogState();
}

class _AddBudgetDialogState extends State<AddBudgetDialog> {
  final _formKey = GlobalKey<FormState>();
  final _amountController = TextEditingController();

  Category? _selectedCategory;
  String _selectedPeriod = 'monthly';
  double _alertThreshold = 80.0;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();

    if (widget.budget != null) {
      // Edit mode: fill existing data
      _amountController.text = widget.budget!.amount.toString();
      _selectedPeriod = widget.budget!.period;
      _alertThreshold = 80.0; // Would need to get from budget if stored
      _selectedCategory = widget.expenseCategories.firstWhere(
        (c) => c.id == widget.budget!.categoryId,
        orElse: () => widget.expenseCategories.isNotEmpty
            ? widget.expenseCategories.first
            : Category(name: '未知', type: 'expense'),
      );
    } else {
      // Add mode: select defaults
      if (widget.expenseCategories.isNotEmpty) {
        _selectedCategory = widget.expenseCategories.first;
      }
    }
  }

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: Colors.red),
    );
  }

  Future<void> _saveBudget() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    if (_selectedCategory == null) {
      _showError('请选择分类');
      return;
    }

    final budgetData = {
      'categoryId': _selectedCategory!.id!,
      'amount': double.parse(_amountController.text),
      'period': _selectedPeriod,
      'alertThreshold': _alertThreshold,
    };

    setState(() => _isLoading = true);

    try {
      if (widget.budget == null) {
        // Create new budget
        await ApiService.createBudget(budgetData);
      } else {
        // Update existing budget
        await ApiService.updateBudget(widget.budget!.id!, budgetData);
      }

      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(widget.budget == null ? '预算创建成功！' : '预算更新成功！'),
            backgroundColor: Colors.green,
          ),
        );
        widget.onBudgetSaved?.call();
      }
    } catch (e) {
      // 先检查是否是认证错误，如果是会自动跳转到登录页
      final isAuthError = await AuthHelper.handleAuthError(
        context,
        e,
        customMessage: '登录已过期，请重新登录后保存预算',
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
    final isEditMode = widget.budget != null;

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
              // Title bar
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    isEditMode ? '编辑预算' : '添加预算',
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
                      // Category selection (expense categories only)
                      DropdownButtonFormField<Category>(
                        value: _selectedCategory,
                        decoration: const InputDecoration(
                          labelText: '分类 *',
                          border: OutlineInputBorder(),
                          prefixIcon: Icon(Icons.category),
                        ),
                        items: widget.expenseCategories.map((category) {
                          return DropdownMenuItem<Category>(
                            value: category,
                            child: Row(
                              children: [
                                Icon(
                                  _getIconData(category.icon),
                                  size: 20,
                                  color: _getCategoryColor(category.color),
                                ),
                                const SizedBox(width: 8),
                                Text(category.name ?? ''),
                              ],
                            ),
                          );
                        }).toList(),
                        onChanged: (value) {
                          setState(() => _selectedCategory = value);
                        },
                        validator: (value) {
                          if (value == null) {
                            return '请选择分类';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),

                      // Budget amount
                      TextFormField(
                        controller: _amountController,
                        decoration: const InputDecoration(
                          labelText: '预算金额 *',
                          hintText: '0.00',
                          border: OutlineInputBorder(),
                          prefixIcon: Icon(Icons.account_balance_wallet),
                          suffixText: '元',
                        ),
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return '请输入预算金额';
                          }
                          final amount = double.tryParse(value);
                          if (amount == null || amount <= 0) {
                            return '请输入有效的金额';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),

                      // Period selection
                      DropdownButtonFormField<String>(
                        value: _selectedPeriod,
                        decoration: const InputDecoration(
                          labelText: '预算周期 *',
                          border: OutlineInputBorder(),
                          prefixIcon: Icon(Icons.calendar_today),
                        ),
                        items: const [
                          DropdownMenuItem(value: 'daily', child: Text('每日')),
                          DropdownMenuItem(value: 'weekly', child: Text('每周')),
                          DropdownMenuItem(value: 'monthly', child: Text('每月')),
                          DropdownMenuItem(value: 'yearly', child: Text('每年')),
                        ],
                        onChanged: (value) {
                          if (value != null) {
                            setState(() => _selectedPeriod = value);
                          }
                        },
                      ),
                      const SizedBox(height: 16),

                      // Alert threshold slider
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text(
                                '预警阈值',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              Text(
                                '${_alertThreshold.toInt()}%',
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.blue,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Slider(
                            value: _alertThreshold,
                            min: 50,
                            max: 100,
                            divisions: 10,
                            activeColor: Colors.blue,
                            onChanged: (value) {
                              setState(() => _alertThreshold = value);
                            },
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '当使用超过阈值时将显示警告',
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey[600],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 24),

              // Buttons
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
                      onPressed: _isLoading ? null : _saveBudget,
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

  Color _getCategoryColor(String? colorHex) {
    if (colorHex == null || colorHex.isEmpty) return Colors.grey;
    try {
      return Color(int.parse(colorHex.substring(1), radix: 16) + 0xFF000000);
    } catch (e) {
      return Colors.grey;
    }
  }

  IconData _getIconData(String? iconName) {
    switch (iconName) {
      case 'restaurant':
        return Icons.restaurant;
      case 'shopping_cart':
        return Icons.shopping_cart;
      case 'directions_car':
        return Icons.directions_car;
      case 'home':
        return Icons.home;
      case 'movie':
        return Icons.movie;
      case 'local_hospital':
        return Icons.local_hospital;
      case 'school':
        return Icons.school;
      case 'phone':
        return Icons.phone;
      case 'card_giftcard':
        return Icons.card_giftcard;
      default:
        return Icons.category;
    }
  }
}
