import React from 'react';
import { Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { MoreOutlined } from '@ant-design/icons';

export interface ActionMenuItem {
  key: string;
  icon?: React.ReactNode;
  label: string;
  danger?: boolean;
  divider?: boolean;
}

interface ActionMenuProps {
  /** 菜单项列表 */
  items: ActionMenuItem[];
  /** 菜单项点击回调 */
  onAction: (key: string) => void;
  /** 触发方式 */
  trigger?: ('click' | 'hover')[];
  /** 按钮大小 */
  size?: 'small' | 'middle' | 'large';
  /** 是否禁用 */
  disabled?: boolean;
  /** 自定义按钮样式 */
  buttonStyle?: React.CSSProperties;
  /** 自定义按钮类名 */
  buttonClassName?: string;
}

/**
 * 统一的操作菜单组件
 *
 * 功能：
 * - 使用 MoreOutlined 图标
 * - 统一的悬浮菜单样式
 * - 支持危险操作标记
 * - 支持分割线
 *
 * 设计规范：
 * - 图标大小：var(--font-size-lg)
 * - 图标字重：600
 * - 内边距：var(--spacing-sm)
 * - 圆角：var(--radius-md)
 * - 悬停时背景：var(--color-bg-layout)
 *
 * @example
 * <ActionMenu
 *   items={[
 *     { key: 'edit', icon: <EditOutlined />, label: '编辑' },
 *     { key: 'delete', icon: <DeleteOutlined />, label: '删除', danger: true }
 *   ]}
 *   onAction={(key) => console.log(key)}
 * />
 */
export const ActionMenu: React.FC<ActionMenuProps> = ({
  items,
  onAction,
  trigger = ['hover'],
  size = 'middle',
  disabled = false,
  buttonStyle,
  buttonClassName,
}) => {
  // 构建 Ant Design Menu items
  const menuItems: MenuProps['items'] = items.map((item) => {
    if (item.divider) {
      return { type: 'divider' } as const;
    }

    return {
      key: item.key,
      icon: item.icon,
      label: item.label,
      danger: item.danger,
      onClick: () => onAction(item.key),
    };
  });

  // 按钮样式
  const defaultButtonStyle: React.CSSProperties = {
    padding: 'var(--spacing-sm)',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--font-size-lg)',
    fontWeight: 600,
    color: 'var(--color-text-secondary)',
    transition: 'all 0.2s',
    ...buttonStyle,
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled) {
      e.currentTarget.style.backgroundColor = 'var(--color-bg-layout)';
      e.currentTarget.style.color = 'var(--color-text-primary)';
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled) {
      e.currentTarget.style.backgroundColor = 'transparent';
      e.currentTarget.style.color = 'var(--color-text-secondary)';
    }
  };

  return (
    <Dropdown menu={{ items: menuItems }} trigger={trigger} disabled={disabled}>
        <button
          type="button"
          style={defaultButtonStyle}
          className={buttonClassName}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <MoreOutlined />
        </button>
    </Dropdown>
  );
};

export default ActionMenu;
