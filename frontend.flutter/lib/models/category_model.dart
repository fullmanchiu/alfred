class Category {
  final int? id;
  final String name;
  final String type; // 'income' | 'expense'
  final String? icon;
  final String? color;
  final int? sortOrder;
  final bool isDefault;
  final int? parentId;  // 父分类ID，用于层级分类
  final List<Category>? subcategories;  // 子分类列表

  Category({
    this.id,
    required this.name,
    required this.type,
    this.icon,
    this.color,
    this.sortOrder,
    this.isDefault = false,
    this.parentId,
    this.subcategories,
  });

  factory Category.fromJson(Map<String, dynamic> json) {
    // 解析子分类（递归）
    List<Category>? subs;
    if (json['subcategories'] != null) {
      subs = (json['subcategories'] as List)
          .map((sub) => Category.fromJson(sub as Map<String, dynamic>))
          .toList();
    }

    return Category(
      id: json['id'],
      name: json['name'] ?? '未知分类',
      type: json['type'] ?? 'expense',
      icon: json['icon'],
      color: json['color'],
      sortOrder: json['sortOrder'] ?? json['sort_order'],
      isDefault: json['isSystem'] ?? json['is_system'] ?? json['is_default'] ?? false,
      parentId: json['parentId'] ?? json['parent_id'],
      subcategories: subs,
    );
  }

  Map<String, dynamic> toJson() {
    final json = {
      if (id != null) 'id': id,
      'name': name,
      'type': type,
      if (icon != null) 'icon': icon,
      if (color != null) 'color': color,
      if (sortOrder != null) 'sortOrder': sortOrder,
      'isSystem': isDefault,
      if (parentId != null) 'parentId': parentId,
    };

    // 序列化子分类
    if (subcategories != null && subcategories!.isNotEmpty) {
      json['subcategories'] = subcategories!
          .map((sub) => sub.toJson())
          .toList();
    }

    return json;
  }

  Category copyWith({
    int? id,
    String? name,
    String? type,
    String? icon,
    String? color,
    int? sortOrder,
    bool? isDefault,
    int? parentId,
    List<Category>? subcategories,
  }) {
    return Category(
      id: id ?? this.id,
      name: name ?? this.name,
      type: type ?? this.type,
      icon: icon ?? this.icon,
      color: color ?? this.color,
      sortOrder: sortOrder ?? this.sortOrder,
      isDefault: isDefault ?? this.isDefault,
      parentId: parentId ?? this.parentId,
      subcategories: subcategories ?? this.subcategories,
    );
  }
}
