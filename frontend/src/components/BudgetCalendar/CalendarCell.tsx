import { Tag } from 'antd';
import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';
dayjs.extend(weekOfYear);

interface CalendarCellData {
  period: 'day' | 'week' | 'month' | 'year';
  status: 'normal' | 'warning' | 'over';
  budget: number;
  used: number;
  percentage: number;
  date: string;
}

interface CalendarCellProps {
  cell: CalendarCellData;
  onClick: (date: string) => void;
}

const CalendarCell = ({ cell, onClick }: CalendarCellProps) => {
  const getStatusColor = () => {
    if (cell.status === 'over') return '#ff4d4f';
    if (cell.status === 'warning') return '#faad14';
    return '#52c41a';
  };

  const getStatusText = () => {
    if (cell.status === 'over') return '超支';
    if (cell.status === 'warning') return '预警';
    return '正常';
  };

  const progressWidth = Math.min(cell.percentage, 100);

  return (
    <div
      onClick={() => onClick(cell.date)}
      style={{
        padding: '16px',
        borderRadius: '12px',
        background: '#fff',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        border: '1px solid #f0f0f0',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        minHeight: '120px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = getStatusColor();
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#f0f0f0';
        e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.03)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* 顶部状态标签和日期 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div style={{ fontSize: '20px', fontWeight: 600, color: '#262626' }}>
          {cell.period === 'day' && dayjs(cell.date).format('D日')}
          {cell.period === 'week' && `第${dayjs(cell.date).week()}周`}
          {cell.period === 'month' && dayjs(cell.date).format('MMM月')}
          {cell.period === 'year' && dayjs(cell.date).format('YYYY年')}
        </div>
        <Tag color={cell.status === 'over' ? 'error' : cell.status === 'warning' ? 'warning' : 'success'}>
          {getStatusText()}
        </Tag>
      </div>

      {/* 进度条 */}
      <div style={{ marginBottom: '12px' }}>
        <div
          style={{
            height: '6px',
            background: '#f5f5f5',
            borderRadius: '3px',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progressWidth}%`,
              background: getStatusColor(),
              borderRadius: '3px',
              transition: 'width 0.3s ease',
              position: 'relative',
            }}
          />
        </div>
      </div>

      {/* 金额和百分比 */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
          <span style={{ fontSize: '13px', color: '#8c8c8c' }}>已用</span>
          <span style={{ fontSize: '18px', fontWeight: 600, color: '#262626' }}>
            ¥{cell.used.toFixed(0)}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: '13px', color: '#8c8c8c' }}>预算</span>
          <span style={{ fontSize: '14px', color: '#8c8c8c' }}>
            ¥{cell.budget.toFixed(0)}
          </span>
        </div>
        <div style={{ textAlign: 'right', marginTop: '8px' }}>
          <span style={{
            fontSize: '24px',
            fontWeight: 700,
            color: getStatusColor(),
          }}>
            {cell.percentage.toFixed(0)}%
          </span>
        </div>
      </div>

      {/* 底部装饰条 */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: getStatusColor(),
          opacity: 0.8,
        }}
      />
    </div>
  );
};

export default CalendarCell;
