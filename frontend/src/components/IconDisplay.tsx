import React from 'react';

// 图标尺寸选项
type IconSize = 'xs' | 'sm' | 'base' | 'lg' | 'xl' | 'xxl' | 'xxxl' | (string & {});

// 图标尺寸映射（使用设计系统 CSS 变量）
const SIZE_MAP: Record<IconSize, string> = {
  xs: 'var(--font-size-xs)',
  sm: 'var(--font-size-sm)',
  base: 'var(--font-size-base)',
  lg: 'var(--font-size-lg)',
  xl: 'var(--font-size-xl)',
  xxl: 'var(--font-size-xxl)',
  xxxl: 'var(--font-size-xxxl)',
};

interface IconDisplayProps {
  /** 图标代码（hex 字符串如 "e56c" 或 Material Icon 名称） */
  icon?: string;
  /** 图标尺寸 */
  size?: IconSize;
  /** 图标颜色（仅对 Material Icons 生效） */
  color?: string;
  /** 自定义样式 */
  style?: React.CSSProperties;
  /** 自定义类名 */
  className?: string;
  /** 是否应用阴影效果 */
  withShadow?: boolean;
  /** 阴影颜色（withShadow=true 时使用） */
  shadowColor?: string;
}

/**
 * 统一的图标显示组件
 *
 * 功能：
 * - 自动识别 Material Icons 和 Emoji
 * - 正确应用 className（material-icons）
 * - 支持颜色自定义（仅 Material Icons）
 * - 支持尺寸预设
 * - 支持阴影效果
 *
 * @example
 * <IconDisplay icon="e56c" size="xl" color="#FF5722" />
 * <IconDisplay icon="restaurant" size="lg" withShadow />
 */
export const IconDisplay: React.FC<IconDisplayProps> = ({
  icon,
  size = 'base',
  color,
  style,
  className,
  withShadow = false,
  shadowColor,
}) => {
  // 如果没有图标，不渲染
  if (!icon) {
    return null;
  }

  // 判断是否为 Material Icons
  const isMaterialIcon = getIsMaterialIcon(icon);

  // 获取图标渲染内容
  const iconContent = getIconContent(icon);

  // 构建样式
  const iconStyle: React.CSSProperties = {
    fontSize: SIZE_MAP[size] || size,
    color: isMaterialIcon && color ? color : undefined,
    filter: withShadow && shadowColor
      ? `drop-shadow(0 0 2px ${shadowColor}40)`
      : undefined,
    ...style,
  };

  // 构建 className
  const iconClassName = [
    isMaterialIcon ? 'material-icons' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <span style={iconStyle} className={iconClassName}>
      {iconContent}
    </span>
  );
};

// ==================== Helper Functions ====================

/**
 * 判断图标是否为 Material Icons
 *
 * Material Icons 的特征：
 * 1. 包含下划线的英文单词（如 restaurant_menu, free_breakfast）
 * 2. 小写英文单词（如 fastfood, weekend, restaurant）
 * 3. Hex 代码（E000-F8FF 范围）
 */
function getIsMaterialIcon(iconCode: string): boolean {
  // Material Icon 名称（包含下划线）
  if (iconCode.includes('_')) {
    return true;
  }

  // 小写英文字母（Material Icon 名称）
  if (/^[a-z]+$/.test(iconCode)) {
    return true;
  }

  // Unicode Private Use Area (E000-F8FF) - Material Design Icons
  if (/^[0-9a-fA-F]{4,5}$/.test(iconCode)) {
    try {
      const codePoint = parseInt(iconCode, 16);
      return codePoint >= 0xE000 && codePoint <= 0xF8FF;
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * 获取图标显示内容
 */
function getIconContent(iconCode: string): string {
  // Material Icon 名称（包含下划线或纯小写英文），直接返回
  if (iconCode.includes('_') || /^[a-z]+$/.test(iconCode)) {
    return iconCode;
  }

  // Hex 字符串，转换为字符
  if (/^[0-9a-fA-F]{4,5}$/.test(iconCode)) {
    try {
      const codePoint = parseInt(iconCode, 16);
      if (!isNaN(codePoint)) {
        return String.fromCodePoint(codePoint);
      }
    } catch {
      // Fall through
    }
  }

  // 其他情况，直接返回
  return iconCode;
}

export default IconDisplay;
