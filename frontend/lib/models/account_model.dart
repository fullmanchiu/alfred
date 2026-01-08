import 'package:flutter/material.dart';

class Account {
  final int? id;
  final String name; // 账户名称，如"招商银行"
  final String accountType; // bank_card | cash | alipay | wechat | credit_card
  final String? accountNumber; // 账号（可选，如卡号后4位）
  final double balance; // 当前余额
  final String currency; // 货币类型，默认"CNY"
  final String? icon; // 图标标识
  final String? color; // 颜色代码（HEX）
  final bool isDefault; // 是否为默认账户
  final String? notes; // 备注
  final DateTime? createdAt;

  Account({
    this.id,
    required this.name,
    required this.accountType,
    this.accountNumber,
    required this.balance,
    this.currency = 'CNY',
    this.icon,
    this.color,
    this.isDefault = false,
    this.notes,
    this.createdAt,
  });

  // 获取账户类型的显示名称
  String getAccountTypeDisplayName() {
    switch (accountType) {
      case 'bank_card':
        return '银行卡';
      case 'cash':
        return '现金';
      case 'alipay':
        return '支付宝';
      case 'wechat':
        return '微信';
      case 'credit_card':
        return '信用卡';
      default:
        return '未知';
    }
  }

  // 获取账户类型图标
  IconData getAccountTypeIcon() {
    switch (accountType) {
      case 'bank_card':
        return Icons.account_balance;
      case 'cash':
        return Icons.money;
      case 'alipay':
        return Icons.account_balance_wallet;
      case 'wechat':
        return Icons.chat;
      case 'credit_card':
        return Icons.credit_card;
      default:
        return Icons.account_balance;
    }
  }

  // 获取账户类型颜色
  Color getAccountTypeColor() {
    if (color != null && color!.startsWith('#')) {
      try {
        return Color(
          int.parse(color!.substring(1), radix: 16) + 0xFF000000,
        );
      } catch (e) {
        // 如果颜色解析失败，使用默认颜色
      }
    }

    // 根据账户类型返回默认颜色
    switch (accountType) {
      case 'bank_card':
        return Colors.blue;
      case 'cash':
        return Colors.green;
      case 'alipay':
        return Colors.blue[700]!;
      case 'wechat':
        return Colors.green[700]!;
      case 'credit_card':
        return Colors.orange;
      default:
        return Colors.grey;
    }
  }

  factory Account.fromJson(Map<String, dynamic> json) {
    return Account(
      id: json['id'],
      name: json['name'],
      accountType: json['account_type'],
      accountNumber: json['account_number'],
      balance: (json['balance'] as num).toDouble(),
      currency: json['currency'] ?? 'CNY',
      icon: json['icon'],
      color: json['color'],
      isDefault: json['is_default'] ?? false,
      notes: json['notes'],
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'])
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'account_type': accountType,
      if (accountNumber != null) 'account_number': accountNumber,
      'balance': balance,
      'currency': currency,
      if (icon != null) 'icon': icon,
      if (color != null) 'color': color,
      'is_default': isDefault,
      if (notes != null) 'notes': notes,
    };
  }

  // 复制对象并修改部分字段
  Account copyWith({
    int? id,
    String? name,
    String? accountType,
    String? accountNumber,
    double? balance,
    String? currency,
    String? icon,
    String? color,
    bool? isDefault,
    String? notes,
    DateTime? createdAt,
  }) {
    return Account(
      id: id ?? this.id,
      name: name ?? this.name,
      accountType: accountType ?? this.accountType,
      accountNumber: accountNumber ?? this.accountNumber,
      balance: balance ?? this.balance,
      currency: currency ?? this.currency,
      icon: icon ?? this.icon,
      color: color ?? this.color,
      isDefault: isDefault ?? this.isDefault,
      notes: notes ?? this.notes,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}
