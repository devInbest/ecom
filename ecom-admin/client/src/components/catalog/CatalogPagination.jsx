const CatalogPagination = ({ page, totalPages, total, onPageChange }) => (
  <div className="catalog-table-footer">
    <span>{total} total</span>
    <div className="flex items-center gap-2">
      <button type="button" className="btn-secondary" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        Prev
      </button>
      <span className="text-gray-500">
        Page {page} / {totalPages}
      </span>
      <button
        type="button"
        className="btn-secondary"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </button>
    </div>
  </div>
);

export default CatalogPagination;
