import { Row, Col } from 'antd';
import CalendarCell from './CalendarCell';

interface CalendarCellType {
  date: string;           // ISO日期
  period: 'day' | 'week' | 'month' | 'year';
  budget: number;         // 预算金额
  used: number;           // 已用金额
  percentage: number;     // 使用百分比
  status: 'normal' | 'warning' | 'over';
  categoryBudgets?: {
    categoryId: number;
    categoryName: string;
    budget: number;
    used: number;
    percentage: number;
  }[];
}

interface CalendarGridProps {
  cells: CalendarCellType[];
  onCellClick: (date: string) => void;
}

const CalendarGrid = ({ cells, onCellClick }: CalendarGridProps) => {
  // 日视图：7列（一周7天）
  // 周视图：4列（一月大约4周）
  // 月视图：不需要网格，显示12个月卡片
  // 年视图：不需要网格，显示多年卡片

  const getGridConfig = () => {
    const period = cells[0]?.period;

    if (period === 'day') {
      return { cols: 7, gap: 16 }; // 7天一行
    }
    if (period === 'week') {
      return { cols: 4, gap: 16 }; // 4周一行
    }
    if (period === 'month') {
      return { cols: 3, gap: 16 }; // 3个月一行
    }
    if (period === 'year') {
      return { cols: 3, gap: 16 }; // 3年一行
    }

    return { cols: 7, gap: 16 };
  };

  const { cols, gap } = getGridConfig();

  return (
    <Row gutter={[gap, gap]}>
      {cells.map((cell) => (
        <Col key={cell.date} span={24 / cols}>
          <CalendarCell cell={cell} onClick={onCellClick} />
        </Col>
      ))}
    </Row>
  );
};

export default CalendarGrid;
