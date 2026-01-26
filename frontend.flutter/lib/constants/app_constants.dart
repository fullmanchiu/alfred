/// 应用常量定义
///
/// 使用代码常量而非硬编码字符串，便于：
/// - 国际化支持
/// - 主题包扩展
/// - 类型安全
/// - 代码维护

/// 颜色常量
class AppColors {
  /// 默认颜色
  static const String defaultColor = '#FF5722';

  /// 预设颜色选项
  static const List<String> presetColors = [
    '#FF5722', // Red
    '#2196F3', // Blue
    '#4CAF50', // Green
    '#FF9800', // Orange
    '#9C27B0', // Purple
    '#00BCD4', // Cyan
    '#F44336', // Red
    '#E91E63', // Pink
    '#3F51B5', // Indigo
    '#009688', // Teal
    '#795548', // Brown
    '#607D8B', // Blue Grey
  ];
}
