import 'package:flutter/material.dart';

class ResponsiveBuilder extends StatelessWidget {
  final Widget Function(BuildContext context, BoxConstraints constraints) builder;

  const ResponsiveBuilder({super.key, required this.builder});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: builder,
    );
  }
}

class ResponsiveLayout extends StatelessWidget {
  final Widget mobile;
  final Widget? tablet;
  final Widget? desktop;

  const ResponsiveLayout({
    super.key,
    required this.mobile,
    this.tablet,
    this.desktop,
  });

  static bool isMobile(BuildContext context) {
    final width = MediaQuery.of(context).size.width;
    debugPrint('📱 ResponsiveLayout.isMobile: width=$width, isMobile=${width < 768}');
    return width < 768;
  }

  static bool isTablet(BuildContext context) {
    final width = MediaQuery.of(context).size.width;
    final isTablet = width >= 768 && width < 1024;
    debugPrint('📱 ResponsiveLayout.isTablet: width=$width, isTablet=$isTablet');
    return isTablet;
  }

  static bool isDesktop(BuildContext context) {
    final width = MediaQuery.of(context).size.width;
    final isDesktop = width >= 1024;
    debugPrint('📱 ResponsiveLayout.isDesktop: width=$width, isDesktop=$isDesktop');
    return isDesktop;
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        String layoutType;

        if (width >= 1024 && desktop != null) {
          layoutType = 'Desktop';
          debugPrint('🎨 [LAYOUT SWITCH] Width: ${width.toStringAsFixed(0)}px → DESKTOP layout');
          return desktop!;
        } else if (width >= 768 && tablet != null) {
          layoutType = 'Tablet';
          debugPrint('🎨 [LAYOUT SWITCH] Width: ${width.toStringAsFixed(0)}px → TABLET layout');
          return tablet!;
        } else {
          layoutType = 'Mobile';
          debugPrint('🎨 [LAYOUT SWITCH] Width: ${width.toStringAsFixed(0)}px → MOBILE layout');
          return mobile;
        }
      },
    );
  }
}

class ResponsiveMargin extends StatelessWidget {
  final Widget child;
  final double? mobile;
  final double? tablet;
  final double? desktop;

  const ResponsiveMargin({
    super.key,
    required this.child,
    this.mobile = 16.0,
    this.tablet = 24.0,
    this.desktop = 32.0,
  });

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        double margin;
        if (constraints.maxWidth >= 1024) {
          margin = desktop!;
        } else if (constraints.maxWidth >= 768) {
          margin = tablet!;
        } else {
          margin = mobile!;
        }

        return Padding(
          padding: EdgeInsets.all(margin),
          child: child,
        );
      },
    );
  }
}

class ResponsiveGrid extends StatelessWidget {
  final List<Widget> children;
  final int mobileColumns;
  final int tabletColumns;
  final int desktopColumns;
  final double spacing;
  final double runSpacing;
  final double childAspectRatio;

  const ResponsiveGrid({
    super.key,
    required this.children,
    this.mobileColumns = 1,
    this.tabletColumns = 2,
    this.desktopColumns = 3,
    this.spacing = 16.0,
    this.runSpacing = 16.0,
    this.childAspectRatio = 1.2,
  });

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        int columns;
        String layoutType;

        if (width >= 1024) {
          columns = desktopColumns;
          layoutType = 'Desktop';
        } else if (width >= 768) {
          columns = tabletColumns;
          layoutType = 'Tablet';
        } else {
          columns = mobileColumns;
          layoutType = 'Mobile';
        }

        debugPrint('📊 [GRID LAYOUT] Width: ${width.toStringAsFixed(0)}px → $layoutType: $columns columns');

        return GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: columns,
            crossAxisSpacing: spacing,
            mainAxisSpacing: runSpacing,
            childAspectRatio: childAspectRatio,
          ),
          itemCount: children.length,
          itemBuilder: (context, index) => children[index],
        );
      },
    );
  }
}

class ResponsiveCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final double? elevation;
  final Color? color;

  const ResponsiveCard({
    super.key,
    required this.child,
    this.padding,
    this.elevation,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        double cardElevation;
        EdgeInsetsGeometry cardPadding;

        if (constraints.maxWidth < 768) {
          cardElevation = elevation ?? 2.0;
          cardPadding = padding ?? const EdgeInsets.all(12.0);
        } else {
          cardElevation = elevation ?? 4.0;
          cardPadding = padding ?? const EdgeInsets.all(16.0);
        }

        return Card(
          elevation: cardElevation,
          color: color,
          child: Padding(
            padding: cardPadding,
            child: child,
          ),
        );
      },
    );
  }
}

class ResponsiveText extends StatelessWidget {
  final String text;
  final TextStyle? style;
  final TextStyle? mobileStyle;
  final TextStyle? tabletStyle;
  final TextStyle? desktopStyle;

  const ResponsiveText(
    this.text, {
    super.key,
    this.style,
    this.mobileStyle,
    this.tabletStyle,
    this.desktopStyle,
  });

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        TextStyle effectiveStyle;
        String styleType;

        if (width >= 1024 && desktopStyle != null) {
          effectiveStyle = desktopStyle!;
          styleType = 'Desktop';
        } else if (width >= 768 && tabletStyle != null) {
          effectiveStyle = tabletStyle!;
          styleType = 'Tablet';
        } else if (mobileStyle != null) {
          effectiveStyle = mobileStyle!;
          styleType = 'Mobile';
        } else {
          effectiveStyle = style ?? Theme.of(context).textTheme.bodyMedium!;
          styleType = 'Default';
        }

        // 只在文本发生变化时打印日志，避免太多输出
        if (text.length < 20) { // 只为短文本打印日志
          debugPrint('📝 [TEXT STYLE] "$text" → $styleType: ${effectiveStyle.fontSize?.toStringAsFixed(1)}px');
        }

        return Text(
          text,
          style: effectiveStyle,
        );
      },
    );
  }
}