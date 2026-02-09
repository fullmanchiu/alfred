import { Row, Col, Card } from 'antd';
import dayjs from 'dayjs';

interface WeekViewProps {
  selectedDate: string;
  onDateSelect: (date: string) => void;
}

const WeekView = ({ selectedDate, onDateSelect }: WeekViewProps) => {
  const currentDate = dayjs(selectedDate);
  const startOfWeek = currentDate.startOf('week');

  // 生成一周的日期
  const generateWeekDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = startOfWeek.add(i, 'day');
      const dateStr = date.format('YYYY-MM-DD');
      const isSelected = dateStr === selectedDate;
      const isToday = dateStr === dayjs().format('YYYY-MM-DD');

      // 模拟预算数据
      const budget = 100;
      const used = Math.random() * 150;
      const percentage = (used / budget) * 100;
      const status = percentage >= 100 ? 'over' : percentage >= 80 ? 'warning' : 'normal';

      days.push({
        date: dateStr,
        dayName: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][i],
        dayOfMonth: date.format('M/D'),
        isSelected,
        isToday,
        budget,
        used,
        percentage,
        status,
      });
    }
    return days;
  };

  const weekDays = generateWeekDays();

  const getStatusColor = (status: string) => {
    if (status === 'over') return '#ff4d4f';
    if (status === 'warning') return '#faad14';
    return '#52c41a';
  };

  return (
    <div>
      <Row gutter={[8, 8]}>
        {weekDays.map((day) => {
          const statusColor = getStatusColor(day.status);

          return (
            <Col key={day.date} span={24}>
              <Card
                hoverable
                onClick={() => onDateSelect(day.date)}
                style={{
                  border: `2px solid ${day.isSelected ? 'var(--color-primary)' : 'transparent'}`,
                  background: day.isSelected ? 'var(--color-primary-bg)' : 'var(--color-bg-container)',
                  cursor: 'pointer',
                  transition: `all var(--transition-base)`,
                  borderRadius: 'var(--radius-lg)',
                }}
                bodyStyle={{ padding: 'var(--spacing-md)' }}
              >
                {/* 日期标题 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-sm)' }}>
                  <div>
                    <div style={{
                      fontSize: 'var(--font-size-xs)',
                      fontWeight: 'var(--font-weight-medium)',
                      color: 'var(--color-text-tertiary)',
                      marginBottom: '2px',
                    }}>
                      {day.dayName}
                    </div>
                    <div style={{
                      fontSize: 'var(--font-size-xl)',
                      fontWeight: 'var(--font-weight-bold)',
                      color: day.isToday ? 'var(--color-primary)' : 'var(--color-text-primary)',
                    }}>
                      {day.dayOfMonth}
                    </div>
                  </div>
                  <div style={{
                    fontSize: 'var(--font-size-xxxl)',
                    fontWeight: 'var(--font-weight-bold)',
                    color: statusColor,
                  }}>
                    {day.percentage.toFixed(0)}%
                  </div>
                </div>

                {/* 预算信息 */}
                <div style={{ marginBottom: 'var(--spacing-sm)' }}>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                    已用: <span style={{ color: 'var(--color-text-primary)', fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-sm)' }}>
                      ¥{day.used.toFixed(0)}
                    </span>
                    <span style={{ margin: '0 var(--spacing-sm)', color: 'var(--color-border-base)' }}>|</span>
                    预算: <span style={{ color: 'var(--color-text-tertiary)' }}>¥{day.budget}</span>
                  </div>
                </div>

                {/* 进度条 */}
                <div style={{
                  height: 'var(--spacing-sm)',
                  background: 'var(--color-bg-layout)',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(day.percentage, 100)}%`,
                      background: statusColor,
                      borderRadius: 'var(--radius-md)',
                    }}
                  />
                </div>
              </Card>
            </Col>
          );
        })}
      </Row>
    </div>
  );
};

export default WeekView;
