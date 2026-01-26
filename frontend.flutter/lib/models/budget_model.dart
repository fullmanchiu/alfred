class Budget {
  final int? id;
  final int categoryId;
  final double amount;
  final String period; // 'daily' | 'weekly' | 'monthly' | 'yearly'
  final DateTime startDate;
  final DateTime? endDate;
  final double alertThreshold; // 0-100 percentage
  final String? createdAt;
  final String? updatedAt;

  Budget({
    this.id,
    required this.categoryId,
    required this.amount,
    required this.period,
    required this.startDate,
    this.endDate,
    this.alertThreshold = 80.0,
    this.createdAt,
    this.updatedAt,
  });

  factory Budget.fromJson(Map<String, dynamic> json) {
    return Budget(
      id: json['id'],
      categoryId: json['categoryId'] ?? json['category_id'],
      amount: (json['amount'] as num).toDouble(),
      period: json['period'],
      startDate: DateTime.parse(json['startDate'] ?? json['start_date']),
      endDate: json['endDate'] != null ? DateTime.parse(json['endDate']) : (json['end_date'] != null ? DateTime.parse(json['end_date']) : null),
      alertThreshold: json['alertThreshold'] ?? json['alert_threshold'] ?? 80.0,
      createdAt: json['createdAt'] ?? json['created_at'],
      updatedAt: json['updatedAt'] ?? json['updated_at'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id != null) 'id': id,
      'categoryId': categoryId,
      'amount': amount,
      'period': period,
      'startDate': startDate.toIso8601String().split('T')[0],
      if (endDate != null) 'endDate': endDate!.toIso8601String().split('T')[0],
      'alertThreshold': alertThreshold,
    };
  }

  Budget copyWith({
    int? id,
    int? categoryId,
    double? amount,
    String? period,
    DateTime? startDate,
    DateTime? endDate,
    double? alertThreshold,
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
      alertThreshold: alertThreshold ?? this.alertThreshold,
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
