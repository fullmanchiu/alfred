import { Row, Col } from 'antd';
import dayjs from 'dayjs';
import weekday from 'dayjs/plugin/weekday';
import weekOfYear from 'dayjs/plugin/weekOfYear';

dayjs.extend(weekday);
dayjs.extend(weekOfYear);

interface MonthViewProps {
  selectedDate: string;
  onDateSelect: (date: string) => void;
}

const MonthView = ({ selectedDate, onDateSelect }: MonthViewProps) => {
  const currentDate = dayjs(selectedDate);
  const firstDayOfMonth = currentDate.startOf('month');
  const startDay = firstDayOfMonth.day(); // 0 (周日) 到 6 (周六)

  // 获取本月天数
  const daysInMonth = currentDate.daysInMonth();

  // 生成日历数据
  const generateCalendar = () => {
    const calendar = [];

    // 填充月初空白
    for (let i = 0; i < startDay; i++) {
      calendar.push(null);
    }

    // 填充日期
    for (let day = 1; day <= daysInMonth; day++) {
      const date = currentDate.date(day).format('YYYY-MM-DD');
      const isSelected = date === selectedDate;
      const isToday = date === dayjs().format('YYYY-MM-DD');

      // 模拟预算数据
      const budget = 100;
      const used = Math.random() * 150;
      const percentage = (used / budget) * 100;
      const status = percentage >= 100 ? 'over' : percentage >= 80 ? 'warning' : 'normal';

      calendar.push({ date, day, isSelected, isToday, budget, used, percentage, status });
    }

    return calendar;
  };

  const calendar = generateCalendar();

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  const getStatusColor = (status: string) => {
    if (status === 'over') return '#ff4d4f';
    if (status === 'warning') return '#faad14';
    return '#52c41a';
  };

  return (
    <div>
      {/* 星期标题 */}
      <Row gutter={8} style={{ marginBottom: '8px' }}>
        {weekDays.map((day) => (
          <Col key={day} span={3} style={{ textAlign: 'center', fontWeight: 600, color: '#8c8c8c' }}>
            {day}
          </Col>
        ))}
      </Row>

      {/* 日历网格 */}
      <Row gutter={[8, 8]}>
        {calendar.map((cell, index) => {
          if (!cell) {
            return <Col key={index} span={3} />;
          }

          const { date, day, isSelected, isToday, percentage, status } = cell;
          const statusColor = getStatusColor(status);

          return (
            <Col key={date} span={3}>
              <div
                onClick={() => onDateSelect(date)}
                style={{
                  aspectRatio: '1',
                  border: `2px solid ${isSelected ? '#1890ff' : 'transparent'}`,
                  borderRadius: '8px',
                  padding: '4px',
                  cursor: 'pointer',
                  background: isSelected ? '#e6f7ff' : '#fff',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
                  transition: 'all 0.2s',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = statusColor;
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = 'transparent';
                    e.currentTarget.style.transform = 'scale(1)';
                  }
                }}
              >
                {/* 日期数字 */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: '4px',
                  height: '24px',
                  fontSize: '14px',
                  fontWeight: isToday ? 700 : 500,
                  color: isToday ? '#1890ff' : '#262626',
                  background: isToday ? '#e6f7ff' : 'transparent',
                  borderRadius: '4px',
                }}>
                  {day}
                </div>

                {/* 进度条 */}
                <div style={{
                  height: '4px',
                  background: '#f5f5f5',
                  borderRadius: '2px',
                  overflow: 'hidden',
                  marginTop: 'auto',
                }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(percentage, 100)}%`,
                      background: statusColor,
                      borderRadius: '2px',
                    }}
                  />
                </div>

                {/* 底部装饰条 */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '2px',
                    background: statusColor,
                  }}
                />
              </div>
            </Col>
          );
        })}
      </Row>
    </div>
  );
};

export default MonthView;
