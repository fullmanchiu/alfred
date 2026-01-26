import 'package:flutter/foundation.dart';
import '../models/transaction_model.dart';
import '../models/account_model.dart';
import '../models/category_model.dart' as models;
import '../services/api_service.dart';

class AccountingProvider extends ChangeNotifier {
  List<Transaction> _transactions = [];
  List<Account> _accounts = [];
  List<models.Category> _categories = [];
  Map<String, dynamic> _statistics = {};
  List<Map<String, dynamic>> _budgets = [];
  bool _isLoading = false;
  String? _errorMessage;

  List<Transaction> get transactions => _transactions;
  List<Account> get accounts => _accounts;
  List<models.Category> get categories => _categories;
  Map<String, dynamic> get statistics => _statistics;
  List<Map<String, dynamic>> get budgets => _budgets;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  Future<void> loadTransactions({
    String? type,
    int? categoryId,
    String? startDate,
    String? endDate,
    double? minAmount,
    double? maxAmount,
    String? keyword,
    int page = 1,
    int pageSize = 20,
  }) async {
    try {
      _setLoading(true);
      final data = await ApiService.getTransactions(
        type: type,
        categoryId: categoryId,
        startDate: startDate,
        endDate: endDate,
        minAmount: minAmount,
        maxAmount: maxAmount,
        keyword: keyword,
        page: page,
        pageSize: pageSize,
      );
      
      final List<dynamic> transactionList = data['transactions'] ?? [];
      _transactions = transactionList
          .map((json) => Transaction.fromJson(json))
          .toList();
      
      _clearError();
    } catch (e) {
      _setError('加载交易记录失败: $e');
      rethrow;
    } finally {
      _setLoading(false);
    }
  }

  Future<void> loadAccounts() async {
    try {
      _setLoading(true);
      _accounts = await ApiService.getAccounts();
      _clearError();
    } catch (e) {
      _setError('加载账户列表失败: $e');
      rethrow;
    } finally {
      _setLoading(false);
    }
  }

  Future<void> loadCategories({String? type}) async {
    try {
      _setLoading(true);
      final data = await ApiService.getCategories(type: type);
      final List<dynamic> categoryList = data['categories'] ?? [];
      _categories = categoryList
          .map((json) => models.Category.fromJson(json))
          .toList();
      _clearError();
    } catch (e) {
      _setError('加载分类列表失败: $e');
      rethrow;
    } finally {
      _setLoading(false);
    }
  }

  Future<void> loadBudgets({String period = 'monthly'}) async {
    try {
      _setLoading(true);
      final data = await ApiService.getBudgets(period: period);
      final List<dynamic> budgetList = data['budgets'] ?? [];

      // 先加载分类（如果还没有加载）
      if (_categories.isEmpty) {
        await loadCategories();
      }

      // 关联分类名称
      _budgets = budgetList.map<Map<String, dynamic>>((budget) {
        final categoryId = budget['categoryId'] as int?;
        models.Category? category;

        if (categoryId != null) {
          try {
            category = _categories.firstWhere((c) => c.id == categoryId);
          } catch (e) {
            category = null;
          }
        }

        return {
          'id': budget['id'],
          'categoryId': categoryId,
          'categoryName': category?.name ?? '未知分类',
          'categoryIcon': category?.icon,
          'amount': budget['amount'] as double,
          'spent': budget['spent'] as double? ?? 0.0,
          'period': budget['period'] as String? ?? 'monthly',
        };
      }).toList();

      _clearError();
    } catch (e) {
      _setError('加载预算失败: $e');
      rethrow;
    } finally {
      _setLoading(false);
    }
  }

  Future<void> loadStatistics({
    String? type,
    String? period,
    String? startDate,
    String? endDate,
    int? categoryId,
  }) async {
    try {
      _setLoading(true);
      _statistics = await ApiService.getTransactionStats(
        type: type,
        period: period,
        startDate: startDate,
        endDate: endDate,
        categoryId: categoryId,
      );
      _clearError();
    } catch (e) {
      _setError('加载统计数据失败: $e');
      rethrow;
    } finally {
      _setLoading(false);
    }
  }

  Future<Map<String, dynamic>> createTransaction(Map<String, dynamic> data) async {
    try {
      _setLoading(true);
      final response = await ApiService.createTransaction(data);
      await refreshAll();
      return response;
    } catch (e) {
      _setError('创建交易记录失败: $e');
      rethrow;
    } finally {
      _setLoading(false);
    }
  }

  Future<void> deleteTransaction(int id) async {
    try {
      _setLoading(true);
      await ApiService.deleteTransaction(id);
      _transactions.removeWhere((t) => t.id == id);
      await refreshAll();
      notifyListeners();
    } catch (e) {
      _setError('删除交易记录失败: $e');
      rethrow;
    } finally {
      _setLoading(false);
    }
  }

  Future<Map<String, dynamic>> updateAccount(int accountId, Map<String, dynamic> accountData) async {
    try {
      _setLoading(true);
      final response = await ApiService.updateAccount(accountId, accountData);
      await loadAccounts();
      return response;
    } catch (e) {
      _setError('更新账户失败: $e');
      rethrow;
    } finally {
      _setLoading(false);
    }
  }

  Future<Map<String, dynamic>> createAccount(Map<String, dynamic> accountData) async {
    try {
      _setLoading(true);
      final response = await ApiService.createAccount(accountData);
      await loadAccounts();
      return response;
    } catch (e) {
      _setError('创建账户失败: $e');
      rethrow;
    } finally {
      _setLoading(false);
    }
  }

  Future<void> deleteAccount(int accountId) async {
    try {
      _setLoading(true);
      await ApiService.deleteAccount(accountId);
      await loadAccounts();
    } catch (e) {
      _setError('删除账户失败: $e');
      rethrow;
    } finally {
      _setLoading(false);
    }
  }

  Future<void> refreshAll() async {
    try {
      _setLoading(true);
      await Future.wait([
        loadTransactions(),
        loadAccounts(),
        loadCategories(),
        loadBudgets(period: 'monthly'),
        loadStatistics(period: "monthly"),
      ]);
      _clearError();
    } catch (e) {
      _setError('刷新数据失败: $e');
      rethrow;
    } finally {
      _setLoading(false);
    }
  }

  void _setLoading(bool value) {
    _isLoading = value;
    notifyListeners();
  }

  void _setError(String message) {
    _errorMessage = message;
    notifyListeners();
  }

  void _clearError() {
    _errorMessage = null;
    notifyListeners();
  }

  models.Category? getCategoryById(int? id) {
    if (id == null) return null;
    try {
      return _categories.firstWhere((c) => c.id == id);
    } catch (e) {
      return null;
    }
  }

  Account? getAccountById(int? id) {
    if (id == null) return null;
    try {
      return _accounts.firstWhere((a) => a.id == id);
    } catch (e) {
      return null;
    }
  }

  List<models.Category> getCategoriesByType(String type) {
    return _categories.where((c) => c.type == type).toList();
  }

  Account? getDefaultAccount() {
    try {
      return _accounts.firstWhere((a) => a.isDefault);
    } catch (e) {
      return _accounts.isNotEmpty ? _accounts.first : null;
    }
  }
}
