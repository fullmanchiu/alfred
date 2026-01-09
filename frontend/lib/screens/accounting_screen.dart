import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'dart:async';
import '../components/app_header.dart';
import '../components/responsive_layout.dart';
import '../components/add_transaction_dialog.dart';
import '../components/loading_overlay.dart';
import '../utils/error_handler.dart';
import '../providers/accounting_provider.dart';
import '../utils/auth_helper.dart';
import '../models/transaction_model.dart';
import 'package:cola_fit/models/category_model.dart' as models;

class AccountingScreen extends StatefulWidget {
  const AccountingScreen({super.key});

  @override
  State<AccountingScreen> createState() => _AccountingScreenState();
}

class _AccountingScreenState extends State<AccountingScreen> {
  Timer? _debounceTimer;
  String _selectedType = 'all';
  int? _selectedCategoryId;
  DateTime? _startDate;
  DateTime? _endDate;
  String _searchKeyword = '';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AccountingProvider>().refreshAll();
    });
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    super.dispose();
  }

  void _debouncedSearch() {
    _debounceTimer?.cancel();
    _debounceTimer = Timer(const Duration(milliseconds: 500), () {
      _loadTransactions();
    });
  }

  Future<void> _loadTransactions() async {
    final provider = context.read<AccountingProvider>();
    await provider.loadTransactions(
      type: _selectedType == 'all' ? null : _selectedType,
      categoryId: _selectedCategoryId,
      startDate: _startDate?.toIso8601String().split('T')[0],
      endDate: _endDate?.toIso8601String().split('T')[0],
      keyword: _searchKeyword.isNotEmpty ? _searchKeyword : null,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const AppHeader(title: '记账'),
      body: Consumer<AccountingProvider>(
        builder: (context, provider, child) {
          return LoadingOverlay(
            isLoading: provider.isLoading,
            child: ResponsiveMargin(
              child: provider.errorMessage != null
                  ? _buildErrorView(provider.errorMessage!)
                  : Column(
                      children: [
                        _buildStatisticsCard(provider.statistics),
                        const SizedBox(height: 16),
                        _buildSearchAndFilterBar(),
                        const SizedBox(height: 16),
                        Expanded(
                          child: provider.transactions.isEmpty
                              ? _buildEmptyState()
                              : _buildTransactionList(provider),
                        ),
                      ],
                    ),
            ),
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showAddTransactionDialog,
        icon: const Icon(Icons.add),
        label: const Text('记一笔'),
        backgroundColor: Colors.green,
      ),
    );
  }

  Widget _buildStatisticsCard(Map<String, dynamic> stats) {
    final totalIncome = (stats['total_income'] ?? 0.0) as double;
    final totalExpense = (stats['total_expense'] ?? 0.0) as double;
    final balance = (stats['balance'] ?? 0.0) as double;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              '本月统计',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildStatItem('收入', totalIncome, Colors.green),
                _buildStatItem('支出', totalExpense, Colors.red),
                _buildStatItem('结余', balance, Colors.blue),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatItem(String label, double amount, Color color) {
    return Column(
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 14,
            color: Colors.grey[600],
          ),
        ),
        const SizedBox(height: 4),
        Text(
          '¥${amount.toStringAsFixed(2)}',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
      ],
    );
  }

  Widget _buildSearchAndFilterBar() {
    return Row(
      children: [
        Expanded(
          child: TextField(
            decoration: InputDecoration(
              hintText: '搜索备注...',
              prefixIcon: const Icon(Icons.search),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 12,
              ),
            ),
            onChanged: (value) {
              setState(() => _searchKeyword = value);
              _debouncedSearch();
            },
          ),
        ),
        const SizedBox(width: 12),
        IconButton(
          icon: const Icon(Icons.filter_list),
          onPressed: _showFilterDialog,
          style: IconButton.styleFrom(
            backgroundColor: Colors.blue.withOpacity(0.1),
          ),
        ),
      ],
    );
  }

  Widget _buildTransactionList(AccountingProvider provider) {
    return ListView.builder(
      padding: const EdgeInsets.only(bottom: 80),
      itemCount: provider.transactions.length,
      itemBuilder: (context, index) {
        final transaction = provider.transactions[index];
        final category = provider.getCategoryById(transaction.categoryId);

        return _TransactionCard(
          transaction: transaction,
          category: category,
          onTap: () => _showTransactionDetail(transaction, category),
          onEdit: () => _editTransaction(transaction),
          onDelete: () => _deleteTransaction(transaction),
        );
      },
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.account_balance_wallet,
            size: 80,
            color: Colors.grey[400],
          ),
          const SizedBox(height: 20),
          Text(
            '暂无记账记录',
            style: TextStyle(
              fontSize: 18,
              color: Colors.grey[600],
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '点击右下角按钮开始记账',
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey[400],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorView(String message) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, size: 64, color: Colors.red),
          const SizedBox(height: 16),
          Text(
            message,
            style: const TextStyle(fontSize: 16, color: Colors.red),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: () {
              context.read<AccountingProvider>().refreshAll();
            },
            child: const Text('重试'),
          ),
        ],
      ),
    );
  }

  Future<void> _showAddTransactionDialog() async {
    final isLoggedIn = await AuthHelper.checkLogin(context);
    if (!isLoggedIn) return;
    if (!mounted) return;

    final provider = context.read<AccountingProvider>();
    showDialog(
      context: context,
      builder: (context) => AddTransactionDialog(
        transaction: null,
        categories: provider.categories,
        onTransactionSaved: () {
          provider.refreshAll();
        },
      ),
    );
  }

  void _showFilterDialog() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('筛选功能即将实现')),
    );
  }

  void _showTransactionDetail(Transaction transaction, models.Category? category) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => _TransactionDetailSheet(
        transaction: transaction,
        category: category,
        onEdit: () {
          Navigator.pop(context);
          _editTransaction(transaction);
        },
        onDelete: () {
          Navigator.pop(context);
          _deleteTransaction(transaction);
        },
      ),
    );
  }

  void _editTransaction(Transaction transaction) {
    final provider = context.read<AccountingProvider>();
    showDialog(
      context: context,
      builder: (context) => AddTransactionDialog(
        transaction: transaction,
        categories: provider.categories,
        onTransactionSaved: () {
          provider.refreshAll();
        },
      ),
    );
  }

  Future<void> _deleteTransaction(Transaction transaction) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('确认删除'),
        content: const Text('确定要删除这条记录吗？'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('取消'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('删除'),
          ),
        ],
      ),
    );

    if (confirmed == true && transaction.id != null) {
      try {
        await context.read<AccountingProvider>().deleteTransaction(transaction.id!);
        if (mounted) {
          ErrorHandler.showSuccessSnackBar('删除成功', context);
        }
      } catch (e) {
        if (mounted) {
          ErrorHandler.handleApiError(e, context);
        }
      }
    }
  }
}

class _TransactionCard extends StatelessWidget {
  final Transaction transaction;
  final models.Category? category;
  final VoidCallback onTap;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  const _TransactionCard({
    required this.transaction,
    required this.category,
    required this.onTap,
    required this.onEdit,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    Color amountColor;
    String amountPrefix;
    String typeLabel;

    switch (transaction.type) {
      case 'expense':
        amountColor = Colors.red;
        amountPrefix = '-';
        typeLabel = '支出';
        break;
      case 'income':
        amountColor = Colors.green;
        amountPrefix = '+';
        typeLabel = '收入';
        break;
      case 'transfer':
        amountColor = Colors.blue;
        amountPrefix = '↔';
        typeLabel = '转账';
        break;
      case 'loan_in':
        amountColor = Colors.orange;
        amountPrefix = '+';
        typeLabel = '借入';
        break;
      case 'loan_out':
        amountColor = Colors.purple;
        amountPrefix = '-';
        typeLabel = '借出';
        break;
      case 'repayment':
        amountColor = Colors.teal;
        amountPrefix = '-';
        typeLabel = '还款';
        break;
      default:
        amountColor = Colors.grey;
        amountPrefix = '';
        typeLabel = '未知';
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                width: 50,
                height: 50,
                decoration: BoxDecoration(
                  color: amountColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  _getTransactionTypeIcon(transaction.type),
                  color: amountColor,
                  size: 24,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          transaction.type == 'transfer'
                              ? typeLabel
                              : (category?.name ?? typeLabel),
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        if (transaction.type != 'expense' &&
                            transaction.type != 'income') ...[
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 6,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: amountColor.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              typeLabel,
                              style: TextStyle(
                                fontSize: 10,
                                color: amountColor,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _formatDate(transaction.date),
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey[600],
                      ),
                    ),
                    if (transaction.note != null &&
                        transaction.note!.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 4),
                        child: Text(
                          transaction.note!,
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey[500],
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                  ],
                ),
              ),
              Text(
                '$amountPrefix¥${transaction.amount.toStringAsFixed(2)}',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: amountColor,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  IconData _getTransactionTypeIcon(String type) {
    switch (type) {
      case 'expense':
        return Icons.money_off;
      case 'income':
        return Icons.money;
      case 'transfer':
        return Icons.swap_horiz;
      case 'loan_in':
        return Icons.call_received;
      case 'loan_out':
        return Icons.call_made;
      case 'repayment':
        return Icons.assignment_return;
      default:
        return Icons.receipt;
    }
  }

  String _formatDate(DateTime date) {
    return '${date.month}月${date.day}日';
  }
}

class _TransactionDetailSheet extends StatelessWidget {
  final Transaction transaction;
  final models.Category? category;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  const _TransactionDetailSheet({
    required this.transaction,
    required this.category,
    required this.onEdit,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    Color amountColor;
    String amountPrefix;
    String typeLabel;

    switch (transaction.type) {
      case 'expense':
        amountColor = Colors.red;
        amountPrefix = '-';
        typeLabel = '支出';
        break;
      case 'income':
        amountColor = Colors.green;
        amountPrefix = '+';
        typeLabel = '收入';
        break;
      case 'transfer':
        amountColor = Colors.blue;
        amountPrefix = '↔';
        typeLabel = '转账';
        break;
      case 'loan_in':
        amountColor = Colors.orange;
        amountPrefix = '+';
        typeLabel = '借入';
        break;
      case 'loan_out':
        amountColor = Colors.purple;
        amountPrefix = '-';
        typeLabel = '借出';
        break;
      case 'repayment':
        amountColor = Colors.teal;
        amountPrefix = '-';
        typeLabel = '还款';
        break;
      default:
        amountColor = Colors.grey;
        amountPrefix = '';
        typeLabel = '未知';
    }

    return Container(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 60,
                height: 60,
                decoration: BoxDecoration(
                  color: amountColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  _getTransactionTypeIcon(transaction.type),
                  color: amountColor,
                  size: 30,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      transaction.type == 'transfer'
                          ? typeLabel
                          : (category?.name ?? typeLabel),
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      _formatDate(transaction.date),
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey[600],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          Text(
            '$amountPrefix¥${transaction.amount.toStringAsFixed(2)}',
            style: TextStyle(
              fontSize: 36,
              fontWeight: FontWeight.bold,
              color: amountColor,
            ),
          ),
          const SizedBox(height: 24),
          if (transaction.note != null && transaction.note!.isNotEmpty) ...[
            const Text(
              '备注',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              transaction.note!,
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey[700],
              ),
            ),
            const SizedBox(height: 16),
          ],
          if (transaction.images.isNotEmpty) ...[
            const Text(
              '交易凭证',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            SizedBox(
              height: 100,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                itemCount: transaction.images.length,
                itemBuilder: (context, index) {
                  final image = transaction.images[index];
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: GestureDetector(
                      onTap: () => _showImagePreview(context, image.url),
                      child: Container(
                        width: 100,
                        height: 100,
                        decoration: BoxDecoration(
                          border: Border.all(color: Colors.grey[300]!),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: Image.network(
                            image.url,
                            fit: BoxFit.cover,
                            errorBuilder: (ctx, err, stack) =>
                                const Icon(Icons.broken_image, size: 32),
                          ),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 16),
          ],
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: onEdit,
                  icon: const Icon(Icons.edit),
                  label: const Text('编辑'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: onDelete,
                  icon: const Icon(Icons.delete),
                  label: const Text('删除'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.red,
                    foregroundColor: Colors.white,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  IconData _getTransactionTypeIcon(String type) {
    switch (type) {
      case 'expense':
        return Icons.money_off;
      case 'income':
        return Icons.money;
      case 'transfer':
        return Icons.swap_horiz;
      case 'loan_in':
        return Icons.call_received;
      case 'loan_out':
        return Icons.call_made;
      case 'repayment':
        return Icons.assignment_return;
      default:
        return Icons.receipt;
    }
  }

  String _formatDate(DateTime date) {
    return '${date.year}年${date.month}月${date.day}日';
  }

  void _showImagePreview(BuildContext context, String imageUrl) {
    showDialog(
      context: context,
      builder: (context) => Dialog(
        child: Stack(
          children: [
            Center(
              child: InteractiveViewer(
                child: Image.network(imageUrl),
              ),
            ),
            Positioned(
              top: 8,
              right: 8,
              child: IconButton(
                icon: const Icon(Icons.close, color: Colors.white),
                style: IconButton.styleFrom(
                  backgroundColor: Colors.black54,
                ),
                onPressed: () => Navigator.pop(context),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
