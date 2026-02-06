import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider, App as AntdApp, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import enUS from 'antd/locale/en_US';
import App from './App';
import './index.css';
import './i18n/config'; // 初始化 i18n
import { useTranslation } from 'react-i18next';

// 根据 i18n 语言动态设置 Ant Design locale
const getAntdLocale = (lng: string) => {
  switch (lng) {
    case 'en-US':
      return enUS;
    case 'zh-CN':
    default:
      return zhCN;
  }
};

// 根组件包装器
const Root = () => {
  const { i18n } = useTranslation();
  const locale = getAntdLocale(i18n.language);

  return (
    <ConfigProvider
      locale={locale}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1677ff',
        },
      }}
    >
      <AntdApp>
        <App />
      </AntdApp>
    </ConfigProvider>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <Root />
);
