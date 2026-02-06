import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import zh_CN from './locales/zh-CN.json';
import en_US from './locales/en-US.json';

i18n
  .use(LanguageDetector) // 自动检测用户语言
  .use(initReactI18next) // 绑定 react-i18next
  .init({
    resources: {
      'zh-CN': { translation: zh_CN },
      'en-US': { translation: en_US },
    },
    fallbackLng: 'zh-CN', // 默认语言
    lng: 'zh-CN', // 初始语言
    debug: false, // 生产环境设为 false
    interpolation: {
      escapeValue: false, // React 已经做了 XSS 防护
    },
    detection: {
      // 语言检测顺序
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'], // 缓存用户选择的语言
    },
  });

export default i18n;
