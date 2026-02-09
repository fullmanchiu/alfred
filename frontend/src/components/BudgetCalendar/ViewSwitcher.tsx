import { Button, Space } from 'antd';
import { CalendarView } from './types';

interface ViewSwitcherProps {
  currentView: CalendarView;
  onViewChange: (view: CalendarView) => void;
}

const ViewSwitcher = ({ currentView, onViewChange }: ViewSwitcherProps) => {
  const views: { key: CalendarView; label: string }[] = [
    { key: 'week', label: '周视图' },
    { key: 'month', label: '月视图' },
    { key: 'year', label: '年视图' },
  ];

  return (
    <Space size="small">
      {views.map((view) => (
        <Button
          key={view.key}
          type={currentView === view.key ? 'primary' : 'text'}
          size="small"
          onClick={() => onViewChange(view.key)}
          style={{
            fontWeight: currentView === view.key ? 600 : 400,
            borderRadius: 'var(--radius-sm)',
          }}
        >
          {view.label}
        </Button>
      ))}
    </Space>
  );
};

export default ViewSwitcher;
