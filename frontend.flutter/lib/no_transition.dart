import 'package:flutter/material.dart';

/// 自定义无动画过渡构建器
/// 用于完全禁用页面切换的左右平移动画，让应用表现像网页一样
class NoTransitionsBuilder extends PageTransitionsBuilder {
  const NoTransitionsBuilder();

  @override
  Widget buildTransitions<T>(
    PageRoute<T> route,
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    // 直接返回子组件，不应用任何过渡动画
    // 这样页面切换时就像网页一样，没有左右平移效果
    return child;
  }
}
