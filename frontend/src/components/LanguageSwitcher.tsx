import { Select } from 'antd';
import { useTranslation } from 'react-i18next';
import { GlobalOutlined } from '@ant-design/icons';

/**
 * 语言切换组件
 * 使用示例:
 * <LanguageSwitcher />
 */
const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const languages = [
    { code: 'zh-CN', name: '简体中文', icon: '🇨🇳' },
    { code: 'en-US', name: 'English', icon: '🇺🇸' },
  ];

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  return (
    <Select
      value={i18n.language}
      onChange={(value) => i18n.changeLanguage(value)}
      style={{ minWidth: 120 }}
      suffixIcon={<GlobalOutlined />}
    >
      {languages.map((lang) => (
        <Select.Option key={lang.code} value={lang.code}>
          {lang.icon} {lang.name}
        </Select.Option>
      ))}
    </Select>
  );
};

export default LanguageSwitcher;
