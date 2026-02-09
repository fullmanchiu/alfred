import { Row, Col, Card } from 'antd';
import dayjs from 'dayjs';

interface YearViewProps {
  selectedDate: string;
  onDateSelect: (date: string) => void;
}

const YearView = ({ selectedDate, onDateSelect }: YearViewProps) => {
  const currentDate = dayjs(selectedDate);
  const currentYear = currentDate.year();

  // 生成12个月的数据
  const generateMonths = () => {
    const months = [];
    for (let month = 1; month <= 12; month++) {
      const date = currentDate.month(month - 1);
      const dateStr = date.format('YYYY-MM-DD');
      const isSelected = dateStr === selectedDate;
      const isCurrentMonth = dateStr === dayjs().format('YYYY-MM-DD');

      // 模拟预算数据
      const budget = 3000;
      const used = Math.random() * 3500;
      const percentage = (used / budget) * 100;
      const status = percentage >= 100 ? 'over' : percentage >= 80 ? 'warning' : 'normal';

      months.push({
        date: dateStr,
        month: date.format('MM月'),
        monthNum: month,
        isSelected,
        isCurrentMonth,
        budget,
        used,
        percentage,
        status,
      });
    }
    return months;
  };

  const months = generateMonths();

  const getStatusColor = (status: string) => {
    if (status === 'over') return '#ff4d4f';
    if (status === 'warning') return '#faad14';
    return '#52c41a';
  };

  return (
    <div>
      <div style={{ marginBottom: 'var(--spacing-sm)', fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)' }}>
        {currentYear}年 预算总览
      </div>

      <Row gutter={[8, 8]}>
        {months.map((month) => {
          const statusColor = getStatusColor(month.status);

          return (
            <Col key={month.date} span={24}>
              <Card
                hoverable
                onClick={() => onDateSelect(month.date)}
                style={{
                  border: `2px solid ${month.isSelected ? 'var(--color-primary)' : 'transparent'}`,
                  background: month.isSelected ? 'var(--color-primary-bg)' : 'var(--color-bg-container)',
                  cursor: 'pointer',
                  transition: `all var(--transition-base)`,
                  borderRadius: 'var(--radius-lg)',
                }}
                bodyStyle={{ padding: 'var(--spacing-md)' }}
              >
                {/* 月份标题 */}
                <div style={{ marginBottom: 'var(--spacing-sm)' }}>
                  <div style={{
                    fontSize: 'var(--font-size-base)',
                    fontWeight: 'var(--font-weight-semibold)',
                    color: month.isCurrentMonth ? 'var(--color-primary)' : 'var(--color-text-primary)',
                  }}>
                    {month.month}
                  </div>
                </div>

                {/* 预算信息 */}
                <div style={{ marginBottom: 'var(--spacing-sm)' }}>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginBottom: '2px' }}>
                    已用: <span style={{ color: 'var(--color-text-primary)', fontWeight: 'var(--font-weight-semibold)' }}>
                      ¥{month.used.toFixed(0)}
                    </span>
                  </div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                    预算: <span style={{ color: 'var(--color-text-tertiary)' }}>¥{month.budget}</span>
                  </div>
                </div>

                {/* 进度条 */}
                <div style={{
                  height: '4px',
                  background: 'var(--color-bg-layout)',
                  borderRadius: 'var(--radius-sm)',
                  overflow: 'hidden',
                  marginBottom: '6px',
                }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(month.percentage, 100)}%`,
                      background: statusColor,
                      borderRadius: 'var(--radius-sm)',
                    }}
                  />
                </div>

                {/* 百分比 */}
                <div style={{
                  textAlign: 'right',
                  fontSize: 'var(--font-size-xxl)',
                  fontWeight: 'var(--font-weight-bold)',
                  color: statusColor,
                }}>
                  {month.percentage.toFixed(0)}%
                </div>

                {/* 底部装饰条 */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: statusColor,
                    borderBottomLeftRadius: '8px',
                    borderBottomRightRadius: '8px',
                  }}
                />
              </Card>
            </Col>
          );
        })}
      </Row>
    </div>
  );
};

export default YearView;
