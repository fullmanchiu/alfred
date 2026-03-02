import React from 'react';
import { Typography, Badge } from 'antd';

const { Text } = Typography;

interface VersionInfoProps {
  pythonConnected?: boolean;
}

const VersionInfo: React.FC<VersionInfoProps> = ({ pythonConnected = false }) => {
  // 从环境变量或构建时注入版本号
  const version = import.meta.env.VITE_APP_VERSION || 'dev';
  const buildTime = import.meta.env.VITE_BUILD_TIME || new Date().toISOString();

  return (
    <div style={{ textAlign: 'center', padding: '1.25rem 0', color: 'var(--color-text-tertiary)' }}>
      <Text type="secondary" style={{ fontSize: 'var(--font-size-sm)' }}>
        Alfred v{version} · Built at {new Date(buildTime).toLocaleString('zh-CN')}
        {' · '}
        <Badge
          status={pythonConnected ? 'success' : 'error'}
          text={pythonConnected ? '服务正常' : '服务异常'}
        />
      </Text>
    </div>
  );
};

export default VersionInfo;
