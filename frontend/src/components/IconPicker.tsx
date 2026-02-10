import { useState, useRef, useEffect, useCallback } from 'react';
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
  showCategories?: boolean; // 是否显示左侧分类列表，默认 true
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
  showCategories = true,
}) => {
  const [selectedIconCategory, setSelectedIconCategory] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);
  const categoryListRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);
  const lastScrollTop = useRef(0);

  // 手势滑动状态
  const touchStartY = useRef(0);
  const touchEndY = useRef(0);
  const isDragging = useRef(false);

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

  // 滚动到分类顶部
  const scrollToCategoryTop = useCallback(() => {
    if (gridRef.current) {
      gridRef.current.scrollTop = 0;
    }
  }, []);

  // 切换到下一个分类
  const switchToNextCategory = useCallback(() => {
    if (selectedIconCategory < MATERIAL_ICON_CATEGORIES.length - 1) {
      setSelectedIconCategory(selectedIconCategory + 1);
      scrollToCategoryTop();
    }
  }, [selectedIconCategory, scrollToCategoryTop]);

  // 切换到上一个分类
  const switchToPrevCategory = useCallback(() => {
    if (selectedIconCategory > 0) {
      setSelectedIconCategory(selectedIconCategory - 1);
      scrollToCategoryTop();
    }
  }, [selectedIconCategory, scrollToCategoryTop]);

  // 滚动分类列表到选中项
  useEffect(() => {
    if (!categoryListRef.current) return;
    const categoryItems = categoryListRef.current.children;
    if (categoryItems[selectedIconCategory]) {
      const selectedItem = categoryItems[selectedIconCategory] as HTMLElement;
      const listHeight = categoryListRef.current.clientHeight;
      const itemTop = selectedItem.offsetTop;
      const itemHeight = selectedItem.clientHeight;
      const scrollPosition = itemTop - listHeight / 2 + itemHeight / 2;
      categoryListRef.current.scrollTop = scrollPosition;
    }
  }, [selectedIconCategory]);

  // 滚轮事件处理
  useEffect(() => {
    const gridElement = gridRef.current;
    if (!gridElement) return;

    // 获取根元素字体大小（1rem 的像素值）
    const getRemValue = () => {
      const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
      return rootFontSize || 16;
    };

    // 滚轮事件 - 支持鼠标滚轮和触摸板
    let wheelTimeout: number | null = null;
    let isProcessingWheel = false;
    let accumulatedDelta = 0; // 累积滚动量

    const handleWheel = (e: WheelEvent) => {
      const remValue = getRemValue();

      // 如果正在处理，累积滚动量但不触发切换
      if (isProcessingWheel) {
        accumulatedDelta += e.deltaY;
        return;
      }

      accumulatedDelta += e.deltaY;

      const scrollThreshold = remValue * 1.875; // 约 1.875rem

      // 向下滚动（deltaY > 0）切换到下一个分类
      if (accumulatedDelta > scrollThreshold) {
        if (selectedIconCategory < MATERIAL_ICON_CATEGORIES.length - 1) {
          isProcessingWheel = true;
          switchToNextCategory();
          accumulatedDelta = 0; // 重置累积量
          wheelTimeout = setTimeout(() => {
            isProcessingWheel = false;
            wheelTimeout = null;
          }, 300);
        }
      }
      // 向上滚动（deltaY < 0）切换到上一个分类
      else if (accumulatedDelta < -scrollThreshold) {
        if (selectedIconCategory > 0) {
          isProcessingWheel = true;
          switchToPrevCategory();
          accumulatedDelta = 0;
          wheelTimeout = setTimeout(() => {
            isProcessingWheel = false;
            wheelTimeout = null;
          }, 300);
        }
      }
    };

    // 滚动事件 - 仅用于满屏内容时的自动切换
    const handleScroll = () => {
      const remValue = getRemValue();
      const scrollTop = gridElement.scrollTop;
      const scrollHeight = gridElement.scrollHeight;
      const clientHeight = gridElement.clientHeight;
      const threshold = remValue * 3.125; // 约 3.125rem

      // 如果正在处理滚轮，不处理滚动事件
      if (isProcessingWheel) return;

      // 判断滚动方向
      const isScrollingDown = scrollTop > lastScrollTop.current;

      // 滚动到底部时切换到下一个分类
      if (isScrollingDown && scrollTop + clientHeight >= scrollHeight - threshold) {
        if (selectedIconCategory < MATERIAL_ICON_CATEGORIES.length - 1) {
          isScrolling.current = true;
          switchToNextCategory();
          setTimeout(() => {
            isScrolling.current = false;
          }, 300);
        }
      }

      // 滚动到顶部时切换到上一个分类
      if (!isScrollingDown && scrollTop <= threshold && lastScrollTop.current > threshold) {
        if (selectedIconCategory > 0) {
          isScrolling.current = true;
          switchToPrevCategory();
          setTimeout(() => {
            isScrolling.current = false;
          }, 300);
        }
      }

      lastScrollTop.current = scrollTop;
    };

    // 手势滑动处理（移动端）
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
      isDragging.current = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging.current) return;
      touchEndY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = () => {
      if (!isDragging.current) return;
      isDragging.current = false;

      const remValue = getRemValue();
      const deltaY = touchStartY.current - touchEndY.current;
      const swipeThreshold = remValue * 3.125; // 约 3.125rem

      if (deltaY < -swipeThreshold) {
        if (selectedIconCategory < MATERIAL_ICON_CATEGORIES.length - 1) {
          switchToNextCategory();
        }
      }
      else if (deltaY > swipeThreshold) {
        if (selectedIconCategory > 0) {
          switchToPrevCategory();
        }
      }
    };

    // 在网格和其父容器上都添加滚轮事件监听
    gridElement.addEventListener('scroll', handleScroll);
    gridElement.addEventListener('wheel', handleWheel, { passive: false });
    gridElement.addEventListener('touchstart', handleTouchStart);
    gridElement.addEventListener('touchmove', handleTouchMove);
    gridElement.addEventListener('touchend', handleTouchEnd);

    // 父容器也监听滚轮（处理内容不足时的滚动）
    const parentElement = gridElement.parentElement;
    if (parentElement) {
      parentElement.addEventListener('wheel', handleWheel, { passive: false });
    }

    return () => {
      gridElement.removeEventListener('scroll', handleScroll);
      gridElement.removeEventListener('wheel', handleWheel);
      gridElement.removeEventListener('touchstart', handleTouchStart);
      gridElement.removeEventListener('touchmove', handleTouchMove);
      gridElement.removeEventListener('touchend', handleTouchEnd);
      if (parentElement) {
        parentElement.removeEventListener('wheel', handleWheel);
      }
      if (wheelTimeout) {
        clearTimeout(wheelTimeout);
      }
    };
  }, [selectedIconCategory, switchToNextCategory, switchToPrevCategory]);

  return (
    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
      {/* 左侧：分类列表（可选） */}
      {showCategories && (
        <div style={{ width: '3rem', flexShrink: 0 }}>
          <div
            ref={categoryListRef}
            style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.15rem',
            maxHeight: maxHeight,
            overflowY: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }} className="no-scrollbar">
            {MATERIAL_ICON_CATEGORIES.map((category, index) => {
              const isCatSelected = selectedIconCategory === index;
              return (
                <div
                  key={category.name}
                  onClick={() => setSelectedIconCategory(index)}
                  style={{
                    fontSize: '0.85rem',
                    padding: '0.35rem 0.15rem',
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
      )}

      {/* 右侧：图标网格 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          ref={gridRef}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap,
            maxHeight: maxHeight,
            overflowY: 'auto',
            alignItems: 'start',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
          className="no-scrollbar">
          {(showCategories ? MATERIAL_ICON_CATEGORIES[selectedIconCategory] : MATERIAL_ICON_CATEGORIES[0]).icons.map((iconItem) => {
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
                  height: '2.5rem',
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
