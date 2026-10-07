const TableActions = ({ children, className = '' }) => (
  <td className={`px-4 py-3 text-right whitespace-nowrap ${className}`.trim()}>
    <div className="table-actions">{children}</div>
  </td>
);

export default TableActions;
