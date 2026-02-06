import React from 'react';
import { Button, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { CURRENCIES } from '../utils/currency';
import type { Currency } from '../types';

interface CurrencySelectorProps {
  selectedCurrency?: Currency;
  onSelect: (currency: Currency) => void;
  size?: 'small' | 'middle' | 'large';
  disabled?: boolean;
}

/**
 * 货币选择器组件
 * 点击按钮弹出货币选择菜单
 */
export const CurrencySelector: React.FC<CurrencySelectorProps> = ({
  selectedCurrency,
  onSelect,
  size = 'large',
  disabled = false,
}) => {
  const items: MenuProps['items'] = CURRENCIES.map(currency => ({
    key: currency.code,
    label: (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: 'var(--font-size-lg)' }}>{currency.flag}</span>
        <span>{currency.name}</span>
        <span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>({currency.code})</span>
      </div>
    ),
    onClick: () => onSelect(currency.code as Currency),
  }));

  const selectedCurrencyInfo = CURRENCIES.find(c => c.code === selectedCurrency);

  return (
    <Dropdown menu={{ items }} trigger={['click']} disabled={disabled}>
      <Button size={size}>
        {selectedCurrencyInfo ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: 'var(--font-size-base)' }}>{selectedCurrencyInfo.flag}</span>
            <span>{selectedCurrencyInfo.code}</span>
          </div>
        ) : (
          '选择货币'
        )}
      </Button>
    </Dropdown>
  );
};

export default CurrencySelector;
