class Category {
  final int? id;
  final String name;
  final String type; // 'income' | 'expense'
  final String? icon;
  final String? color;
  final int? sortOrder;
  final bool isDefault;
  final int? parentId;  // 父分类ID，用于层级分类

  Category({
    this.id,
    required this.name,
    required this.type,
    this.icon,
    this.color,
    this.sortOrder,
    this.isDefault = false,
    this.parentId,
  });

  factory Category.fromJson(Map<String, dynamic> json) {
    return Category(
      id: json['id'],
      name: json['name'],
      type: json['type'],
      icon: json['icon'],
      color: json['color'],
      sortOrder: json['sort_order'],
      isDefault: json['is_default'] ?? false,
      parentId: json['parent_id'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id != null) 'id': id,
      'name': name,
      'type': type,
      if (icon != null) 'icon': icon,
      if (color != null) 'color': color,
      if (sortOrder != null) 'sort_order': sortOrder,
      'is_default': isDefault,
      if (parentId != null) 'parent_id': parentId,
    };
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
    );
  }
}
