import { useMemo } from 'react';

export interface IconHelpers {
  /** 渲染图标内容（字符或名称） */
  renderIcon: (iconCode?: string) => string | null;
  /** 获取图标 className（material-icons 或空字符串） */
  getIconClass: (iconCode?: string) => string;
  /** 获取图标颜色（仅 Material Icons 返回颜色） */
  getIconColor: (iconCode?: string, defaultColor?: string) => string | undefined;
  /** 检查图标是否有效 */
  hasValidIcon: (iconCode?: string) => boolean;
  /** 判断是否为 Material Icons */
  isMaterialIcon: (iconCode?: string) => boolean;
}

/**
 * 图标相关的工具函数 Hook
 *
 * 提供统一的图标处理逻辑：
 * - Material Icons 识别（Unicode E000-F8FF 或下划线命名）
 * - Emoji 识别
 * - 颜色处理（仅 Material Icons 支持自定义颜色）
 *
 * @example
 * const { renderIcon, getIconClass, getIconColor } = useIconHelpers();
 *
 * <span className={getIconClass(icon)} style={{ color: getIconColor(icon, '#333') }}>
 *   {renderIcon(icon)}
 * </span>
 */
export const useIconHelpers = (): IconHelpers => {
  return useMemo(() => {
    /**
     * 判断图标是否为 Material Icons
     * 规则：
     * 1. 包含下划线（如 "account_balance_wallet"）
     * 2. Unicode 在 E000-F8FF 范围内
     */
    const isMaterialIcon = (iconCode?: string): boolean => {
      if (!iconCode) return false;

      // Material Icon 名称（包含下划线）
      if (iconCode.includes('_')) {
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
    };

    /**
     * 渲染图标内容
     */
    const renderIcon = (iconCode?: string): string | null => {
      if (!iconCode) return null;

      // Material Icon 名称，直接返回
      if (iconCode.includes('_')) {
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
    };

    /**
     * 获取图标 className
     */
    const getIconClass = (iconCode?: string): string => {
      return isMaterialIcon(iconCode) ? 'material-icons' : '';
    };

    /**
     * 获取图标颜色
     * 仅 Material Icons 支持自定义颜色，Emoji 保持原生颜色
     */
    const getIconColor = (iconCode?: string, defaultColor?: string): string | undefined => {
      if (!iconCode) return undefined;
      return isMaterialIcon(iconCode) ? defaultColor : undefined;
    };

    /**
     * 检查图标是否有效
     */
    const hasValidIcon = (iconCode?: string): boolean => {
      return !!iconCode;
    };

    return {
      renderIcon,
      getIconClass,
      getIconColor,
      hasValidIcon,
      isMaterialIcon,
    };
  }, []);
};

export default useIconHelpers;
