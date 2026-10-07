const STATUS_CLASS = {
  active: 'catalog-status--active',
  inactive: 'catalog-status--inactive',
  archived: 'catalog-status--archived',
  draft: 'catalog-status--draft',
};

const StatusBadge = ({ status }) => {
  const key = String(status || 'inactive').toLowerCase();
  const cls = STATUS_CLASS[key] || STATUS_CLASS.inactive;

  return (
    <span className={`catalog-status ${cls}`}>
      <span className="catalog-status-dot" />
      {key}
    </span>
  );
};

export default StatusBadge;
