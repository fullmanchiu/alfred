/**
 * 副图指标切换弹窗组件
 * Sub-chart Indicator Switcher Modal
 */

import React from 'react';
import { Modal, Radio, Space } from 'antd';
import { SUB_CHART_INDICATORS, SubChartIndicatorId } from '@/types/chart';

interface SubChartIndicatorSwitcherProps {
  visible: boolean;
  onClose: () => void;
  currentIndicatorId: string;
  onIndicatorChange: (indicatorId: SubChartIndicatorId) => void;
}

const SubChartIndicatorSwitcher: React.FC<SubChartIndicatorSwitcherProps> = ({
  visible,
  onClose,
  currentIndicatorId,
  onIndicatorChange,
}) => {
  const handleIndicatorSelect = (indicatorId: SubChartIndicatorId) => {
    onIndicatorChange(indicatorId);
    onClose();
  };

  return (
    <Modal
      title="切换指标"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={400}
    >
      <Radio.Group
        value={currentIndicatorId}
        onChange={(e) => handleIndicatorSelect(e.target.value)}
        style={{ width: '100%' }}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          {SUB_CHART_INDICATORS.map((indicator) => (
            <Radio key={indicator.id} value={indicator.id} style={{ width: '100%' }}>
              <span style={{ fontSize: 16 }}>{indicator.name}</span>
              {indicator.hasParams && (
                <span style={{ fontSize: 12, color: '#999', marginLeft: 8 }}>
                  (可配置参数)
                </span>
              )}
            </Radio>
          ))}
        </Space>
      </Radio.Group>
    </Modal>
  );
};

export default SubChartIndicatorSwitcher;
