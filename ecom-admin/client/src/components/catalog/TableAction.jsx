import { Link } from 'react-router-dom';

const VARIANT_CLASS = {
  view: 'table-action--view',
  edit: 'table-action--edit',
  duplicate: 'table-action--duplicate',
  activate: 'table-action--activate',
  deactivate: 'table-action--deactivate',
  archive: 'table-action--archive',
  delete: 'table-action--delete',
};

/**
 * Animated icon-only table action with hover tooltip.
 */
const TableAction = ({ variant = 'view', label, onClick, to, className = '', disabled = false, children }) => {
  const classes = `group table-action ${VARIANT_CLASS[variant] || VARIANT_CLASS.view} ${className}`.trim();

  const content = (
    <>
      {children}
      <span className="sr-only">{label}</span>
      <span
        className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-[10px] font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 z-10"
        aria-hidden
      >
        {label}
      </span>
    </>
  );

  if (to) {
    return (
      <Link to={to} className={classes} title={label} aria-label={label}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={classes}
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
    >
      {content}
    </button>
  );
};

export default TableAction;
