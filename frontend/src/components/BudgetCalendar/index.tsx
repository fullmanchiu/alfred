import SimpleBudgetView from './SimpleBudgetView';

const BudgetCalendar = () => {
  return (
    <div style={{
      padding: 'var(--spacing-lg)',
      background: '#f5f5f5',
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <SimpleBudgetView />
    </div>
  );
};

export default BudgetCalendar;
