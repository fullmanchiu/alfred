/**
 * 图表设置弹窗组件
 * Chart Settings Modal
 */

import React, { useState } from 'react';
import { Modal, List, Button, Radio, InputNumber, Space, Divider, Tabs } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import { ChartConfig, CandleStyle, FqType } from '@/types/chart';

interface ChartSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  config: ChartConfig;
  onConfigChange: (config: Partial<ChartConfig>) => void;
  onReset: () => void;
}

const ChartSettingsModal: React.FC<ChartSettingsModalProps> = ({
  visible,
  onClose,
  config,
  onConfigChange,
  onReset,
}) => {
  const [currentMenu, setCurrentMenu] = useState<string | null>(null);

  const handleMenuClick = (menu: string) => {
    setCurrentMenu(menu);
  };

  const handleBack = () => {
    setCurrentMenu(null);
  };

  const handleCandleStyleChange = (style: CandleStyle) => {
    onConfigChange({
      mainChart: { ...config.mainChart, candleStyle: style },
    });
  };

  const handleFqTypeChange = (fqType: FqType) => {
    onConfigChange({ fqType });
  };

  const handleSubChartCountChange = (count: number) => {
    const newSubCharts = [...config.subChart.subCharts];
    // 确保数组长度足够
    while (newSubCharts.length < 4) {
      newSubCharts.push({ indicatorId: '', enabled: false });
    }
    // 更新前count个为启用，后面的为禁用
    for (let i = 0; i < 4; i++) {
      newSubCharts[i].enabled = i < count;
      if (!newSubCharts[i].indicatorId && i < count) {
        // 设置默认指标
        const defaults = ['VOL', 'MACD', 'KDJ', 'RSI'];
        newSubCharts[i].indicatorId = defaults[i];
      }
    }

    onConfigChange({
      subChart: { ...config.subChart, count, subCharts: newSubCharts },
    });
  };

  // 渲染主菜单
  const renderMainMenu = () => (
    <List
      dataSource={[
        { key: 'candle', title: 'K线设置', description: 'K线样式、颜色等' },
        { key: 'fq', title: '复权类型', description: '前复权、后复权、不复权' },
        { key: 'main', title: '主图指标', description: 'MA、EMA、BOLL、SAR等' },
        { key: 'sub', title: '副图数量', description: '设置1-4个副图' },
        { key: 'params', title: '指标参数', description: '设置各指标的计算参数' },
      ]}
      renderItem={(item) => (
        <List.Item
          onClick={() => handleMenuClick(item.key)}
          style={{ cursor: 'pointer' }}
          className="settings-menu-item"
        >
          <List.Item.Meta
            title={item.title}
            description={item.description}
          />
        </List.Item>
      )}
    />
  );

  // 渲染K线设置
  const renderCandleSettings = () => (
    <div className="settings-panel">
      <h3>K线样式</h3>
      <Radio.Group
        value={config.mainChart.candleStyle}
        onChange={(e) => handleCandleStyleChange(e.target.value)}
        style={{ width: '100%' }}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Radio value="solid">实心阳线/阴线（传统样式）</Radio>
          <Radio value="hollow">空心阳线/实心阴线</Radio>
          <Radio value="american">美式样式（空心红涨绿跌）</Radio>
        </Space>
      </Radio.Group>
    </div>
  );

  // 渲染复权类型设置
  const renderFqSettings = () => (
    <div className="settings-panel">
      <h3>复权类型</h3>
      <Radio.Group
        value={config.fqType}
        onChange={(e) => handleFqTypeChange(e.target.value)}
        style={{ width: '100%' }}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Radio value="qfq">前复权</Radio>
          <Radio value="hfq">后复权</Radio>
          <Radio value="none">不复权</Radio>
        </Space>
      </Radio.Group>
    </div>
  );

  // 渲染主图指标设置
  const renderMainIndicatorSettings = () => (
    <div className="settings-panel">
      <h3>主图叠加指标</h3>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* MA均线 */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span>MA均线</span>
            <Radio.Group
              value={config.mainChart.showMA}
              onChange={(e) => onConfigChange({
                mainChart: { ...config.mainChart, showMA: e.target.value },
              })}
            >
              <Radio value={true}>开启</Radio>
              <Radio value={false}>关闭</Radio>
            </Radio.Group>
          </div>
          {config.mainChart.showMA && (
            <div>
              <span style={{ marginRight: 8 }}>周期:</span>
              {config.mainChart.maPeriods.map((period, index) => (
                <InputNumber
                  key={index}
                  value={period}
                  min={2}
                  max={500}
                  onChange={(value) => {
                    const newPeriods = [...config.mainChart.maPeriods];
                    newPeriods[index] = value || 5;
                    onConfigChange({
                      mainChart: { ...config.mainChart, maPeriods: newPeriods },
                    });
                  }}
                  style={{ marginRight: 8, width: 80 }}
                />
              ))}
              <Button
                size="small"
                onClick={() => {
                  const newPeriods = [...config.mainChart.maPeriods, 30];
                  onConfigChange({
                    mainChart: { ...config.mainChart, maPeriods: newPeriods },
                  });
                }}
              >
                + 添加
              </Button>
            </div>
          )}
        </div>

        {/* 布林带 */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span>布林带 (BOLL)</span>
            <Radio.Group
              value={config.mainChart.showBOLL}
              onChange={(e) => onConfigChange({
                mainChart: { ...config.mainChart, showBOLL: e.target.value },
              })}
            >
              <Radio value={true}>开启</Radio>
              <Radio value={false}>关闭</Radio>
            </Radio.Group>
          </div>
        </div>
      </Space>
    </div>
  );

  // 渲染副图数量设置
  const renderSubChartSettings = () => (
    <div className="settings-panel">
      <h3>副图数量</h3>
      <Radio.Group
        value={config.subChart.count}
        onChange={(e) => handleSubChartCountChange(e.target.value)}
      >
        <Space direction="vertical">
          <Radio value={1}>1个副图</Radio>
          <Radio value={2}>2个副图</Radio>
          <Radio value={3}>3个副图</Radio>
          <Radio value={4}>4个副图</Radio>
        </Space>
      </Radio.Group>
    </div>
  );

  // 渲染指标参数设置
  const renderIndicatorParams = () => (
    <div className="settings-panel">
      <h3>指标参数设置</h3>
      <Tabs
        items={[
          {
            key: 'MA',
            label: 'MA均线',
            children: (
              <Space direction="vertical">
                <div>
                  <span>周期: </span>
                  {config.indicatorParams.MA.periods.map((period, index) => (
                    <InputNumber
                      key={index}
                      value={period}
                      min={2}
                      max={500}
                      onChange={(value) => {
                        const newPeriods = [...config.indicatorParams.MA.periods];
                        newPeriods[index] = value || 5;
                        onConfigChange({
                          indicatorParams: {
                            ...config.indicatorParams,
                            MA: { ...config.indicatorParams.MA, periods: newPeriods },
                          },
                        });
                      }}
                      style={{ marginRight: 8, width: 80 }}
                    />
                  ))}
                  <Button
                    size="small"
                    onClick={() => {
                      const newPeriods = [...config.indicatorParams.MA.periods, 30];
                      onConfigChange({
                        indicatorParams: {
                          ...config.indicatorParams,
                          MA: { ...config.indicatorParams.MA, periods: newPeriods },
                        },
                      });
                    }}
                  >
                    + 添加
                  </Button>
                </div>
              </Space>
            ),
          },
          {
            key: 'MACD',
            label: 'MACD',
            children: (
              <Space direction="vertical">
                <div>
                  <span>快线周期: </span>
                  <InputNumber
                    value={config.indicatorParams.MACD.fast}
                    min={1}
                    max={100}
                    onChange={(value) => {
                      onConfigChange({
                        indicatorParams: {
                          ...config.indicatorParams,
                          MACD: { ...config.indicatorParams.MACD, fast: value || 12 },
                        },
                      });
                    }}
                  />
                </div>
                <div>
                  <span>慢线周期: </span>
                  <InputNumber
                    value={config.indicatorParams.MACD.slow}
                    min={1}
                    max={100}
                    onChange={(value) => {
                      onConfigChange({
                        indicatorParams: {
                          ...config.indicatorParams,
                          MACD: { ...config.indicatorParams.MACD, slow: value || 26 },
                        },
                      });
                    }}
                  />
                </div>
                <div>
                  <span>信号线周期: </span>
                  <InputNumber
                    value={config.indicatorParams.MACD.signal}
                    min={1}
                    max={100}
                    onChange={(value) => {
                      onConfigChange({
                        indicatorParams: {
                          ...config.indicatorParams,
                          MACD: { ...config.indicatorParams.MACD, signal: value || 9 },
                        },
                      });
                    }}
                  />
                </div>
              </Space>
            ),
          },
          {
            key: 'KDJ',
            label: 'KDJ',
            children: (
              <Space direction="vertical">
                <div>
                  <span>K周期: </span>
                  <InputNumber
                    value={config.indicatorParams.KDJ.k}
                    min={1}
                    max={100}
                    onChange={(value) => {
                      onConfigChange({
                        indicatorParams: {
                          ...config.indicatorParams,
                          KDJ: { ...config.indicatorParams.KDJ, k: value || 9 },
                        },
                      });
                    }}
                  />
                </div>
                <div>
                  <span>D周期: </span>
                  <InputNumber
                    value={config.indicatorParams.KDJ.d}
                    min={1}
                    max={100}
                    onChange={(value) => {
                      onConfigChange({
                        indicatorParams: {
                          ...config.indicatorParams,
                          KDJ: { ...config.indicatorParams.KDJ, d: value || 3 },
                        },
                      });
                    }}
                  />
                </div>
                <div>
                  <span>J周期: </span>
                  <InputNumber
                    value={config.indicatorParams.KDJ.j}
                    min={1}
                    max={100}
                    onChange={(value) => {
                      onConfigChange({
                        indicatorParams: {
                          ...config.indicatorParams,
                          KDJ: { ...config.indicatorParams.KDJ, j: value || 3 },
                        },
                      });
                    }}
                  />
                </div>
              </Space>
            ),
          },
        ]}
      />
    </div>
  );

  const renderContent = () => {
    if (currentMenu === null) {
      return renderMainMenu();
    }

    let content = null;

    switch (currentMenu) {
      case 'candle':
        content = renderCandleSettings();
        break;
      case 'fq':
        content = renderFqSettings();
        break;
      case 'main':
        content = renderMainIndicatorSettings();
        break;
      case 'sub':
        content = renderSubChartSettings();
        break;
      case 'params':
        content = renderIndicatorParams();
        break;
    }

    return (
      <div>
        <div style={{ marginBottom: 16 }}>
          <Button type="text" onClick={handleBack}>
            ← 返回
          </Button>
        </div>
        {content}
      </div>
    );
  };

  return (
    <Modal
      title={
        <Space>
          <SettingOutlined />
          {currentMenu ? '图表设置' : '图表设置'}
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      {renderContent()}
      <Divider />
      <div style={{ textAlign: 'center' }}>
        <Button onClick={onReset} danger>
          恢复默认设置
        </Button>
      </div>
    </Modal>
  );
};

export default ChartSettingsModal;
