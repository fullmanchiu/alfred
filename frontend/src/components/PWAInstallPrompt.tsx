import { Modal, Button, Space } from 'antd';
import { AppleOutlined, AndroidOutlined } from '@ant-design/icons';
import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const PWAInstallPrompt = () => {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // 检查是否已经拒绝过安装（7天内不再提示）
    const dismissedTime = localStorage.getItem('pwa_install_dismissed');
    if (dismissedTime) {
      const daysSinceDismissed = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        return; // 7天内不再提示
      }
    }

    // 检查是否已经安装
    const isInstalled = localStorage.getItem('pwa_installed');
    if (isInstalled) {
      return;
    }

    // 检测设备类型
    const ua = navigator.userAgent;
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const isAndroidDevice = /Android/.test(ua);

    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);

    // Chrome/Edge 安装提示事件（Android支持）
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);

      // 延迟3秒显示，不打扰用户
      setTimeout(() => {
        setVisible(true);
      }, 3000);
    };

    // 监听安装事件
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // iOS设备没有beforeinstallprompt事件，需要手动引导
    if (isIOSDevice) {
      // 延迟显示iOS安装引导
      setTimeout(() => {
        setVisible(true);
      }, 5000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // 处理安装按钮点击（Android Chrome）
  const handleInstall = async () => {
    if (!deferredPrompt) {
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      localStorage.setItem('pwa_installed', 'true');
      setVisible(false);
    }

    setDeferredPrompt(null);
  };

  // 处理关闭/不再提示
  const handleDismiss = () => {
    localStorage.setItem('pwa_install_dismissed', Date.now().toString());
    setVisible(false);
  };

  // 暂时关闭（可以再次提示）
  const handleClose = () => {
    setVisible(false);
  };

  // 如果不显示或不是移动端，不渲染
  if (!visible || (!isIOS && !isAndroid)) {
    return null;
  }

  return (
    <Modal
      title={
        <Space>
          {isIOS ? <AppleOutlined /> : <AndroidOutlined />}
          安装应用到主屏幕
        </Space>
      }
      open={visible}
      onCancel={handleClose}
      footer={[
        <Button key="dismiss" type="link" onClick={handleDismiss}>
          不再提示
        </Button>,
        <Button key="close" onClick={handleClose}>
          暂不安装
        </Button>,
        isAndroid && deferredPrompt ? (
          <Button key="install" type="primary" onClick={handleInstall}>
            立即安装
          </Button>
        ) : null,
      ]}
      width={400}
    >
      <div style={{ padding: '1rem 0' }}>
        {isIOS ? (
          <div>
            <p style={{ marginBottom: '1rem', fontSize: 'var(--font-size-base)' }}>
              将 <strong>Alfred</strong> 安装到主屏幕，像原生应用一样使用：
            </p>
            <ol style={{ paddingLeft: '1.5rem', lineHeight: '1.8' }}>
              <li>点击底部的 <strong>分享按钮</strong> <span style={{ fontSize: '1.2rem' }}>⎋</span></li>
              <li>向下滚动，点击 <strong>"添加到主屏幕"</strong></li>
              <li>点击 <strong>"添加"</strong> 完成安装</li>
            </ol>
          </div>
        ) : (
          <div>
            <p style={{ marginBottom: '1rem', fontSize: 'var(--font-size-base)' }}>
              将 <strong>Alfred</strong> 安装到主屏幕，享受更好的使用体验：
            </p>
            <ul style={{ paddingLeft: '1.5rem', lineHeight: '1.8' }}>
              <li>✅ 快速启动，无需打开浏览器</li>
              <li>✅ 全屏显示，更像原生应用</li>
              <li>✅ 离线可用，随时随地记账</li>
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default PWAInstallPrompt;
