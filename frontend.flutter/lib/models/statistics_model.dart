/// 统计数据模型
class StatisticsModel {
  final double incomeTotal;
  final double expenseTotal;
  final double netSavings;
  final List<CategoryBreakdown> categoryBreakdown;

  StatisticsModel({
    required this.incomeTotal,
    required this.expenseTotal,
    required this.netSavings,
    required this.categoryBreakdown,
  });

  factory StatisticsModel.fromJson(Map<String, dynamic> json) {
    var breakdownList = <CategoryBreakdown>[];
    if (json['category_breakdown'] != null) {
      final breakdownData = json['category_breakdown'] as List;
      breakdownList = breakdownData
          .map((item) => CategoryBreakdown.fromJson(item as Map<String, dynamic>))
          .toList();
    }

    return StatisticsModel(
      incomeTotal: (json['income_total'] ?? 0).toDouble(),
      expenseTotal: (json['expense_total'] ?? 0).toDouble(),
      netSavings: (json['net_savings'] ?? 0).toDouble(),
      categoryBreakdown: breakdownList,
    );
  }
}

/// 分类支出明细
class CategoryBreakdown {
  final int categoryId;
  final double amount;

  CategoryBreakdown({
    required this.categoryId,
    required this.amount,
  });

  factory CategoryBreakdown.fromJson(Map<String, dynamic> json) {
    return CategoryBreakdown(
      categoryId: json['category_id'] ?? 0,
      amount: (json['amount'] ?? 0).toDouble(),
    );
  }
}
