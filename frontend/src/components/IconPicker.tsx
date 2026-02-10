import { useState } from 'react';
import type { FormInstance } from 'antd';
import { IconDisplay } from '@/components/IconDisplay';
import { MATERIAL_ICON_CATEGORIES, COLOR_PRESETS } from '@/constants/iconCategories';

interface IconPickerProps {
  value?: string;
  onChange?: (iconCode: string) => void;
  form?: FormInstance; // 可选，如果不提供则使用 value/onChange
  columns?: number; // 网格列数，默认 4
  maxHeight?: string; // 最大高度，默认 '600px'
  gap?: string; // 间距，默认 '0.4rem'
  selectedColor?: string; // 选中状态的边框颜色，默认使用表单中的 color 字段
}

/**
 * 图标选择器组件
 *
 * 用于选择 Material Icon 图标，支持分类浏览。
 *
 * @example
 * // 方式1：使用 value/onChange（推荐）
 * <IconPicker value={icon} onChange={setIcon} />
 *
 * @example
 * // 方式2：使用 form
 * <IconPicker form={form} />
 *
 * @example
 * // 自定义样式
 * <IconPicker
 *   value={icon}
 *   onChange={setIcon}
 *   columns={6}
 *   maxHeight="320px"
 *   gap="0.25rem"
 * />
 */
export const IconPicker: React.FC<IconPickerProps> = ({
  value,
  onChange,
  form,
  columns = 4,
  maxHeight = '20rem',
  gap = '0.4rem',
  selectedColor,
}) => {
  const [selectedIconCategory, setSelectedIconCategory] = useState(0);

  // 判断是否选中
  const isSelected = (iconCode: string) => {
    if (form) {
      return form.getFieldValue('iconName') === iconCode;
    }
    return value === iconCode;
  };

  // 获取选中颜色
  const getSelectedColor = () => {
    if (selectedColor) return selectedColor;
    if (form) {
      return form.getFieldValue('color') || COLOR_PRESETS[0];
    }
    return COLOR_PRESETS[0];
  };

  // 处理点击
  const handleClick = (iconCode: string) => {
    if (form) {
      form.setFieldValue('iconName', iconCode);
    }
    if (onChange) {
      onChange(iconCode);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
      {/* 左侧：分类列表 */}
      <div style={{ width: '3.5rem', flexShrink: 0 }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.15rem',
          maxHeight: '320px',
          overflowY: 'auto'
        }}>
          {MATERIAL_ICON_CATEGORIES.map((category, index) => {
            const isCatSelected = selectedIconCategory === index;
            return (
              <div
                key={category.name}
                onClick={() => setSelectedIconCategory(index)}
                style={{
                  fontSize: '0.65rem',
                  padding: '0.35rem 0.2rem',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  background: isCatSelected ? 'var(--color-primary-bg)' : 'transparent',
                  color: isCatSelected ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s',
                  border: isCatSelected ? '1px solid var(--color-primary)' : '1px solid transparent',
                }}
              >
                {category.name}
              </div>
            );
          })}
        </div>
      </div>

      {/* 右侧：图标网格 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap,
          height: maxHeight,
          overflowY: 'auto',
          padding: '0.5rem'
        }}>
          {MATERIAL_ICON_CATEGORIES[selectedIconCategory].icons.map((iconItem) => {
            const isIconSelected = isSelected(iconItem.code);
            const currentSelectedColor = getSelectedColor();
            return (
              <div
                key={iconItem.code}
                onClick={() => handleClick(iconItem.code)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0.25rem',
                  cursor: 'pointer',
                  minHeight: '2.5rem',
                  minWidth: 0,
                }}
              >
                <IconDisplay
                  icon={iconItem.code}
                  size="xxxl"
                  color={isIconSelected ? currentSelectedColor : undefined}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default IconPicker;
