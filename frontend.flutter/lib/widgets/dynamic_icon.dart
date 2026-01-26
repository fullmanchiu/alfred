import 'package:flutter/material.dart';

/// 动态图标组件
///
/// 通过 Unicode 码点直接渲染 Material Icons 图标
/// 前端无需维护图标映射表，所有图标配置由后端控制
///
/// 使用示例：
/// ```dart
/// DynamicIcon(
///   iconCode: 'e56c',  // 后端返回的 Unicode 码点
///   color: '#FF5722',   // 后端返回的颜色
///   size: 24,
/// )
/// ```
class DynamicIcon extends StatelessWidget {
  /// 图标的 Unicode 码点（16进制字符串，如 "e56c"）
  final String iconCode;

  /// 图标颜色（16进制字符串，如 "#FF5722"）
  final String? color;

  /// 图标大小
  final double? size;

  const DynamicIcon({
    super.key,
    required this.iconCode,
    this.color,
    this.size,
  });

  @override
  Widget build(BuildContext context) {
    return Icon(
      _getIconData(),
      color: _getColor(),
      size: size,
    );
  }

  /// 将 Unicode 码点字符串转换为 IconData
  IconData _getIconData() {
    try {
      // 将 "e56c" 转换为 0xe56c（int）
      final codePoint = int.parse('0x$iconCode');
      // 明确指定使用 Flutter 内置的 MaterialIcons 字体
      // 这与 Icons.restaurant 的实现方式一致
      return IconData(codePoint, fontFamily: 'MaterialIcons');
    } catch (e) {
      // 如果转换失败，返回默认图标
      debugPrint('DynamicIcon: 无法解析图标码点 "$iconCode", 使用默认图标: $e');
      return const IconData(0xe574, fontFamily: 'MaterialIcons'); // category 图标
    }
  }

  /// 将颜色字符串转换为 Color 对象
  Color? _getColor() {
    if (color == null || color!.isEmpty) {
      return null;
    }

    try {
      // 移除 # 号
      final hexColor = color!.replaceAll('#', '');
      // 加上 alpha 通道（FF = 不透明）
      // "#FF5722" → "FFFF5722" → Color(0xFFFF5722)
      return Color(int.parse('0xFF$hexColor'));
    } catch (e) {
      debugPrint('DynamicIcon: 无法解析颜色 "$color", 使用默认颜色: $e');
      return null;
    }
  }
}
