import React from 'react';

interface CompactDropdownArrowProps {
  /** 自定义样式 */
  style?: React.CSSProperties;
  /** 自定义类名 */
  className?: string;
  /** 是否旋转（用于向上箭头） */
  rotate?: boolean;
}

/**
 * 统一的下拉箭头组件
 *
 * 功能：
 * - 使用 Material Icons expand_more（柔和的 V 形）
 * - 统一使用设计系统 CSS 变量
 * - 支持旋转（180度）变成向上箭头
 *
 * 设计规范：
 * - 大小：var(--icon-button-size) = 0.5rem
 * - 颜色：var(--color-text-secondary)
 * - 背景：var(--icon-button-bg)
 * - 圆角：var(--icon-button-radius) = 0.25rem
 * - 边框：1px var(--icon-button-border)
 * - 内边距：var(--icon-button-padding) = 0.1rem
 *
 * @example
 * <CompactDropdownArrow />
 * <CompactDropdownArrow rotate />
 */
export const CompactDropdownArrow: React.FC<CompactDropdownArrowProps> = ({
  style,
  className,
  rotate = false,
}) => {
  const arrowStyle: React.CSSProperties = {
    fontSize: 'var(--icon-button-size)',
    color: 'var(--color-text-secondary)',
    background: 'var(--icon-button-bg)',
    borderRadius: 'var(--icon-button-radius)',
    padding: 'var(--icon-button-padding)',
    boxShadow: '0 0 0 1px var(--icon-button-border)',
    transform: rotate ? 'rotate(180deg)' : 'rotate(0deg)',
    transition: 'transform 0.2s',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...style,
  };

  return (
    <span
      className={`material-icons ${className || ''}`.trim()}
      style={arrowStyle}
    >
      expand_more
    </span>
  );
};

export default CompactDropdownArrow;
