import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../models/statistics_model.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:provider/provider.dart';
import '../providers/accounting_provider.dart';
import 'package:intl/intl.dart';
import 'package:flutter_markdown/flutter_markdown.dart';

class StatisticsScreen extends StatefulWidget {
  const StatisticsScreen({super.key});

  @override
  State<StatisticsScreen> createState() => _StatisticsScreenState();
}

class _StatisticsScreenState extends State<StatisticsScreen> {
  StatisticsModel? _statistics;
  bool _isLoading = true;
  String? _errorMessage;

  // 时间范围选择
  String _selectedPeriod = 'all';
  DateTime? _customStartDate;
  DateTime? _customEndDate;

  final List<Map<String, String>> _periodOptions = [
    {'value': 'all', 'label': '全部'},
    {'value': 'this_month', 'label': '本月'},
    {'value': 'last_month', 'label': '上月'},
    {'value': 'this_year', 'label': '今年'},
    {'value': 'custom', 'label': '自定义'},
  ];

  // AI分析相关
  bool _isAnalyzing = false;
  String? _aiAdvice;

  @override
  void initState() {
    super.initState();
    _loadStatistics();
  }

  Future<void> _loadStatistics() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      String? periodParam;
      String? startDateParam;
      String? endDateParam;

      if (_selectedPeriod == 'custom') {
        // 自定义日期范围
        if (_customStartDate != null && _customEndDate != null) {
          startDateParam = DateFormat('yyyy-MM-dd').format(_customStartDate!);
          endDateParam = DateFormat('yyyy-MM-dd').format(_customEndDate!);
        }
      } else {
        // 预设时间范围
        final now = DateTime.now();

        switch (_selectedPeriod) {
          case 'this_month':
            periodParam = DateFormat('yyyy-MM').format(now);
            break;
          case 'last_month':
            final lastMonth = DateTime(now.year, now.month - 1);
            periodParam = DateFormat('yyyy-MM').format(lastMonth);
            break;
          case 'this_year':
            periodParam = now.year.toString();
            break;
          case 'all':
          default:
            periodParam = null;
        }
      }

      final data = await ApiService.getOverviewStatistics(
        period: periodParam,
        startDate: startDateParam,
        endDate: endDateParam,
      );

      setState(() {
        _statistics = StatisticsModel.fromJson(data);
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = e.toString();
        _isLoading = false;
      });
    }
  }

  // 显示自定义日期选择对话框
  Future<void> _showCustomDateRangePicker() async {
    final DateTimeRange? picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2020),
      lastDate: DateTime.now().add(const Duration(days: 30)),
      initialDateRange: _customStartDate != null && _customEndDate != null
          ? DateTimeRange(start: _customStartDate!, end: _customEndDate!)
          : null,
      locale: const Locale('zh', 'CN'),
      helpText: '选择日期范围',
      saveText: '确定',
      cancelText: '取消',
    );

    if (picked != null) {
      setState(() {
        _customStartDate = picked.start;
        _customEndDate = picked.end;
        _selectedPeriod = 'custom';
      });
      _loadStatistics();
    }
  }

  // 获取时间范围显示文本
  String _getPeriodDisplayText() {
    if (_selectedPeriod == 'custom' &&
        _customStartDate != null &&
        _customEndDate != null) {
      return '${DateFormat('yyyy/MM/dd').format(_customStartDate!)} - '
             '${DateFormat('yyyy/MM/dd').format(_customEndDate!)}';
    }
    return '';
  }

  // 获取AI分析建议（流式）
  Future<void> _getAIAdvice() async {
    setState(() {
      _isAnalyzing = true;
      _aiAdvice = ''; // 清空之前的内容
    });

    try {
      final provider = context.read<AccountingProvider>();
      final transactions = provider.transactions
          .map((t) => {
                'date': t.transactionDate.toIso8601String(),
                'amount': t.amount,
                'type': t.type,
                'category_id': t.categoryId,
              })
          .toList();

      final budgetInfo = {
        'period': _selectedPeriod,
        'budgets': provider.budgets,
      };

      final requestData = {
        'transactions': transactions,
        'budgetInfo': budgetInfo,
      };

      // 立即显示对话框
      if (mounted) {
        _showAIAdviceDialog();
      }

      // 流式接收并显示内容
      final stream = ApiService.analyzeSpendingStream(requestData);
      final buffer = StringBuffer();

      await for (final chunk in stream) {
        buffer.write(chunk);
        if (mounted) {
          setState(() {
            _aiAdvice = buffer.toString();
          });
        }
      }

      if (mounted) {
        setState(() {
          _isAnalyzing = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isAnalyzing = false;
          _aiAdvice = '分析失败: $e';
        });
      }
    }
  }

  void _showAIAdviceDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            const Icon(Icons.psychology, color: Colors.purple),
            const SizedBox(width: 8),
            const Text('AI分析建议'),
            const Spacer(),
            if (_isAnalyzing)
              const SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
          ],
        ),
        content: SizedBox(
          width: double.maxFinite,
          child: SingleChildScrollView(
            child: _aiAdvice != null && _aiAdvice!.isNotEmpty
                ? MarkdownBody(data: _aiAdvice!)
                : Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const CircularProgressIndicator(),
                      const SizedBox(height: 16),
                      Text(
                        _isAnalyzing ? 'AI 正在分析中...' : '等待分析...',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('关闭'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('统计分析'),
        actions: [
          // AI分析按钮
          if (!_isAnalyzing)
            IconButton(
              icon: const Icon(Icons.psychology),
              onPressed: _getAIAdvice,
              tooltip: 'AI分析',
            )
          else
            const Padding(
              padding: EdgeInsets.all(16.0),
              child: SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadStatistics,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _errorMessage != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(_errorMessage!, style: const TextStyle(color: Colors.red)),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _loadStatistics,
                        child: const Text('重试'),
                      ),
                    ],
                  ),
                )
              : _statistics == null
                  ? const Center(child: Text('暂无数据'))
                  : RefreshIndicator(
                      onRefresh: _loadStatistics,
                      child: SingleChildScrollView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // 时间范围选择器
                            _buildPeriodSelector(),
                            const SizedBox(height: 16),
                            _buildOverviewCards(),
                            const SizedBox(height: 24),
                            _buildCategoryBreakdownChart(),
                            const SizedBox(height: 24),
                          ],
                        ),
                      ),
                    ),
    );
  }

  // 时间范围选择器
  Widget _buildPeriodSelector() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              '时间范围',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: _periodOptions.map((option) {
                final value = option['value']!;
                final label = option['label']!;
                final isSelected = _selectedPeriod == value;

                return ChoiceChip(
                  label: Text(label),
                  selected: isSelected,
                  onSelected: (selected) {
                    if (selected) {
                      if (value == 'custom') {
                        // 自定义日期范围，弹出日期选择器
                        _showCustomDateRangePicker();
                      } else {
                        setState(() {
                          _selectedPeriod = value;
                        });
                        _loadStatistics();
                      }
                    }
                  },
                  selectedColor: Theme.of(context).primaryColor.withOpacity(0.2),
                  labelStyle: TextStyle(
                    color: isSelected ? Theme.of(context).primaryColor : null,
                  ),
                );
              }).toList(),
            ),
            // 显示自定义日期范围
            if (_selectedPeriod == 'custom' && _getPeriodDisplayText().isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: Theme.of(context).primaryColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: Theme.of(context).primaryColor.withOpacity(0.3),
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.date_range,
                        size: 16,
                        color: Theme.of(context).primaryColor,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        _getPeriodDisplayText(),
                        style: TextStyle(
                          color: Theme.of(context).primaryColor,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(width: 8),
                      InkWell(
                        onTap: _showCustomDateRangePicker,
                        child: Icon(
                          Icons.edit,
                          size: 16,
                          color: Theme.of(context).primaryColor,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildOverviewCards() {
    if (_statistics == null) return const SizedBox();

    return Row(
      children: [
        Expanded(
          child: _buildStatCard(
            title: '总收入',
            value: '¥${_statistics!.incomeTotal.toStringAsFixed(2)}',
            icon: Icons.arrow_upward,
            color: Colors.green,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildStatCard(
            title: '总支出',
            value: '¥${_statistics!.expenseTotal.toStringAsFixed(2)}',
            icon: Icons.arrow_downward,
            color: Colors.red,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildStatCard(
            title: '净储蓄',
            value: '¥${_statistics!.netSavings.toStringAsFixed(2)}',
            icon: Icons.account_balance_wallet,
            color: _statistics!.netSavings >= 0 ? Colors.blue : Colors.orange,
          ),
        ),
      ],
    );
  }

  Widget _buildStatCard({
    required String title,
    required String value,
    required IconData icon,
    required Color color,
  }) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: color, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    title,
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              value,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: color,
                    fontWeight: FontWeight.bold,
                  ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCategoryBreakdownChart() {
    if (_statistics == null || _statistics!.categoryBreakdown.isEmpty) {
      return const Card(
        child: Padding(
          padding: EdgeInsets.all(16),
          child: Center(child: Text('暂无分类支出数据')),
        ),
      );
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '分类支出占比',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 24),
            SizedBox(
              height: 250,
              child: PieChart(
                PieChartData(
                  sections: _buildPieChartSections(),
                  centerSpaceRadius: 60,
                  borderData: FlBorderData(show: false),
                  sectionsSpace: 2,
                ),
              ),
            ),
            const SizedBox(height: 24),
            _buildCategoryLegend(),
          ],
        ),
      ),
    );
  }

  List<PieChartSectionData> _buildPieChartSections() {
    final breakdown = _statistics!.categoryBreakdown;
    final total = breakdown.fold<double>(0, (sum, item) => sum + item.amount);
    
    final colors = [
      Colors.blue,
      Colors.red,
      Colors.green,
      Colors.orange,
      Colors.purple,
      Colors.teal,
      Colors.pink,
      Colors.amber,
      Colors.cyan,
      Colors.indigo,
    ];

    return breakdown.asMap().entries.map((entry) {
      final index = entry.key;
      final item = entry.value;
      final percentage = total > 0 ? (item.amount / total * 100) : 0.0;
      
      return PieChartSectionData(
        value: item.amount,
        title: '${percentage.toStringAsFixed(1)}%',
        color: colors[index % colors.length],
        radius: 50,
        titleStyle: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.bold,
          color: Colors.white,
        ),
      );
    }).toList();
  }

  Widget _buildCategoryLegend() {
    final breakdown = _statistics!.categoryBreakdown;
    final total = breakdown.fold<double>(0, (sum, item) => sum + item.amount);
    
    final colors = [
      Colors.blue,
      Colors.red,
      Colors.green,
      Colors.orange,
      Colors.purple,
      Colors.teal,
      Colors.pink,
      Colors.amber,
      Colors.cyan,
      Colors.indigo,
    ];

    return Column(
      children: breakdown.asMap().entries.map((entry) {
        final index = entry.key;
        final item = entry.value;
        final percentage = total > 0 ? (item.amount / total * 100) : 0.0;
        
        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: Row(
            children: [
              Container(
                width: 12,
                height: 12,
                decoration: BoxDecoration(
                  color: colors[index % colors.length],
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  '分类 #${item.categoryId}: ¥${item.amount.toStringAsFixed(2)} (${percentage.toStringAsFixed(1)}%)',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }
}
