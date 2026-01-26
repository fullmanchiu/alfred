class TransactionImage {
  final int id;
  final String filePath;
  final String fileName;

  TransactionImage({
    required this.id,
    required this.filePath,
    required this.fileName,
  });

  factory TransactionImage.fromJson(Map<String, dynamic> json) {
    return TransactionImage(
      id: json['id'],
      filePath: json['file_path'],
      fileName: json['file_name'],
    );
  }

  String get url => filePath;
}

class Transaction {
  final int? id;
  final double amount;
  final String type; // 'income' | 'expense' | 'transfer' | 'loan_in' | 'loan_out' | 'repayment'
  final int? categoryId;
  final String? notes;  // 后端使用 notes 而不是 note
  final DateTime transactionDate;  // 后端使用 transaction_date 而不是 date
  final int? fromAccountId;  // 支出/转账时的转出账户
  final int? toAccountId;    // 收入/转账时的转入账户
  final List<String>? tags;
  final String? location;
  final String? merchant;
  final String? createdAt;
  final String? updatedAt;
  final List<TransactionImage> images;

  Transaction({
    this.id,
    required this.amount,
    required this.type,
    this.categoryId,
    this.notes,
    required this.transactionDate,
    this.fromAccountId,
    this.toAccountId,
    this.tags,
    this.location,
    this.merchant,
    this.createdAt,
    this.updatedAt,
    this.images = const [],
  });

  // 兼容旧代码的 getter
  String? get note => notes;
  DateTime get date => transactionDate;
  int get imageCount => images.length;

  factory Transaction.fromJson(Map<String, dynamic> json) {
    // Handle nested structure from backend: {category: {id: ..., name: ...}, fromAccount: {id: ...}, toAccount: {id: ...}}
    // Also handle flat structure for compatibility: {category_id: ..., from_account_id: ..., to_account_id: ...}
    return Transaction(
      id: json['id'],
      amount: (json['amount'] as num).toDouble(),
      type: json['type'],
      // Extract category ID from nested or flat structure
      categoryId: json['category']?['id'] ?? json['categoryId'] ?? json['category_id'],
      notes: json['notes'],
      transactionDate: json['transactionDate'] != null
          ? DateTime.parse(json['transactionDate'])
          : (json['transaction_date'] != null
              ? DateTime.parse(json['transaction_date'])
              : DateTime.now()),
      // Extract account IDs from nested or flat structure
      fromAccountId: json['fromAccount']?['id'] ?? json['from_account_id'] ?? json['fromAccountId'],
      toAccountId: json['toAccount']?['id'] ?? json['to_account_id'] ?? json['toAccountId'],
      // 处理 tags：可能是数组、空字符串或 null
      tags: json['tags'] is List && json['tags'].isNotEmpty
          ? List<String>.from(json['tags'])
          : null,
      location: json['location'],
      merchant: json['merchant'],
      createdAt: json['createdAt'] ?? json['created_at'],
      updatedAt: json['updatedAt'] ?? json['updated_at'],
      images: json['images'] != null
          ? (json['images'] as List).map((e) => TransactionImage.fromJson(e)).toList()
          : [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id != null) 'id': id,
      'amount': amount,
      'type': type,
      if (categoryId != null) 'categoryId': categoryId,
      if (notes != null) 'notes': notes,
      'transactionDate': transactionDate.toIso8601String(),
      if (fromAccountId != null) 'fromAccountId': fromAccountId,
      if (toAccountId != null) 'toAccountId': toAccountId,
      if (tags != null) 'tags': tags,
      if (location != null) 'location': location,
      if (merchant != null) 'merchant': merchant,
    };
  }

  Transaction copyWith({
    int? id,
    double? amount,
    String? type,
    int? categoryId,
    String? notes,
    DateTime? transactionDate,
    int? fromAccountId,
    int? toAccountId,
    List<String>? tags,
    String? location,
    String? merchant,
    String? createdAt,
    String? updatedAt,
    List<TransactionImage>? images,
  }) {
    return Transaction(
      id: id ?? this.id,
      amount: amount ?? this.amount,
      type: type ?? this.type,
      categoryId: categoryId ?? this.categoryId,
      notes: notes ?? this.notes,
      transactionDate: transactionDate ?? this.transactionDate,
      fromAccountId: fromAccountId ?? this.fromAccountId,
      toAccountId: toAccountId ?? this.toAccountId,
      tags: tags ?? this.tags,
      location: location ?? this.location,
      merchant: merchant ?? this.merchant,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      images: images ?? this.images,
    );
  }
}
