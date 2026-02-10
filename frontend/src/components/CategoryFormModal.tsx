import { useState, useEffect } from 'react';
import { Modal, Form, Input, Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { IconPicker } from '@/components/IconPicker';
import { MATERIAL_ICON_CATEGORIES, COLOR_PRESETS } from '@/constants/iconCategories';
import type { Category } from '@/types';

const DEFAULT_ICON = MATERIAL_ICON_CATEGORIES[0].icons[0].code;
const DEFAULT_COLOR = COLOR_PRESETS[0];

export interface CategoryFormModalProps {
  visible: boolean;
  onCancel: () => void;
  onOk: (values: any) => Promise<void>;
  editingCategory?: Category | null;
  initialValues?: Partial<Category>;
}

export const CategoryFormModal: React.FC<CategoryFormModalProps> = ({
  visible,
  onCancel,
  onOk,
  editingCategory,
  initialValues,
}) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [selectedColor, setSelectedColor] = useState(DEFAULT_COLOR);

  // 当弹窗打开时，设置初始值
  useEffect(() => {
    if (visible) {
      const newColor = editingCategory?.color || DEFAULT_COLOR;
      setSelectedColor(newColor);

      if (editingCategory) {
        form.setFieldsValue({
          ...editingCategory,
          iconName: editingCategory.icon || DEFAULT_ICON,
          color: newColor,
        });
      } else {
        form.setFieldsValue({
          type: initialValues?.type || 'expense',
          isActive: true,
          parentId: initialValues?.parentId || undefined,
          name: '',
          iconName: DEFAULT_ICON,
          color: DEFAULT_COLOR,
        });
      }
    }
  }, [visible, editingCategory, initialValues, form]);

  const handleOk = async () => {
    try {
      setConfirmLoading(true);
      const values = await form.validateFields();
      await onOk(values);
      form.resetFields();
      onCancel();
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleColorClick = (color: string) => {
    setSelectedColor(color);
    form.setFieldValue('color', color);
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <span>{editingCategory ? t('categories.editCategory') : t('categories.addCategory')}</span>
          <Button type="primary" onClick={handleOk} loading={confirmLoading}>
            {t('common.save')}
          </Button>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      width="95vw"
      style={{ maxWidth: '420px' }}
      closable={false}
      maskClosable={true}
      destroyOnHidden={true}
      footer={null}
    >
      {visible && (
        <Form form={form} layout="vertical" preserve={false}>
          {/* 分类名称 */}
          <Form.Item
            name="name"
            label={t('categories.fields.name')}
            rules={[{ required: true, message: t('errors.required', { field: t('categories.fields.name') }) }]}
          >
            <Input size="large" placeholder={t('categories.namePlaceholder')} />
          </Form.Item>

          {/* 图标和颜色选择 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {/* 图标选择 */}
            <Form.Item name="iconName" initialValue={DEFAULT_ICON} style={{ marginBottom: 0 }}>
              <IconPicker
                form={form}
                columns={6}
                maxHeight="14rem"
                gap="0.2rem"
                selectedColor={selectedColor}
              />
            </Form.Item>

            {/* 颜色选择 */}
            <Form.Item name="color" initialValue={DEFAULT_COLOR} style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                {COLOR_PRESETS.map((color) => (
                  <div
                    key={color}
                    onClick={() => handleColorClick(color)}
                    style={{
                      width: '1.5rem',
                      height: '1.5rem',
                      borderRadius: '50%',
                      backgroundColor: color,
                      cursor: 'pointer',
                      border: selectedColor === color
                        ? '2px solid var(--color-text-primary)'
                        : '1px solid var(--color-border)',
                      transition: 'all 0.2s',
                      transform: selectedColor === color ? 'scale(1.1)' : 'scale(1)',
                    }}
                  />
                ))}
              </div>
            </Form.Item>
          </div>

          {/* 隐藏字段 */}
          <Form.Item name="type" style={{ display: 'none' }}>
            <Input />
          </Form.Item>
          <Form.Item name="parentId" style={{ display: 'none' }}>
            <Input />
          </Form.Item>
          <Form.Item name="isActive" style={{ display: 'none' }} initialValue={true}>
            <Input />
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
};