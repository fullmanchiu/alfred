class Budget {
  final int? id;
  final int categoryId;
  final double amount;
  final String period; // 'daily' | 'weekly' | 'monthly' | 'yearly'
  final DateTime startDate;
  final DateTime? endDate;
  final String? createdAt;
  final String? updatedAt;

  Budget({
    this.id,
    required this.categoryId,
    required this.amount,
    required this.period,
    required this.startDate,
    this.endDate,
    this.createdAt,
    this.updatedAt,
  });

  factory Budget.fromJson(Map<String, dynamic> json) {
    return Budget(
      id: json['id'],
      categoryId: json['category_id'],
      amount: (json['amount'] as num).toDouble(),
      period: json['period'],
      startDate: DateTime.parse(json['start_date']),
      endDate: json['end_date'] != null ? DateTime.parse(json['end_date']) : null,
      createdAt: json['created_at'],
      updatedAt: json['updated_at'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id != null) 'id': id,
      'category_id': categoryId,
      'amount': amount,
      'period': period,
      'start_date': startDate.toIso8601String().split('T')[0],
      if (endDate != null) 'end_date': endDate!.toIso8601String().split('T')[0],
    };
  }

  Budget copyWith({
    int? id,
    int? categoryId,
    double? amount,
    String? period,
    DateTime? startDate,
    DateTime? endDate,
    String? createdAt,
    String? updatedAt,
  }) {
    return Budget(
      id: id ?? this.id,
      categoryId: categoryId ?? this.categoryId,
      amount: amount ?? this.amount,
      period: period ?? this.period,
      startDate: startDate ?? this.startDate,
      endDate: endDate ?? this.endDate,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  // 获取周期显示名称
  String getPeriodDisplayName() {
    switch (period) {
      case 'daily':
        return '日预算';
      case 'weekly':
        return '周预算';
      case 'monthly':
        return '月预算';
      case 'yearly':
        return '年预算';
      default:
        return period;
    }
  }
}
