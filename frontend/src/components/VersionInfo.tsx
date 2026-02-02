import React from 'react';
import { Typography } from 'antd';

const { Text } = Typography;

const VersionInfo: React.FC = () => {
  // 从环境变量或构建时注入版本号
  const version = import.meta.env.VITE_APP_VERSION || 'dev';
  const buildTime = import.meta.env.VITE_BUILD_TIME || new Date().toISOString();

  return (
    <div style={{ textAlign: 'center', padding: '20px 0', color: '#999' }}>
      <Text type="secondary" style={{ fontSize: 12 }}>
        Alfred v{version} · Built at {new Date(buildTime).toLocaleString('zh-CN')}
      </Text>
    </div>
  );
};

export default VersionInfo;
