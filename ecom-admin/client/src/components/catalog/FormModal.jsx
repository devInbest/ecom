import { IconClose } from './CatalogIcons';

const FormModal = ({ title, subtitle, open, onClose, children, footer }) => {
  if (!open) return null;

  return (
    <div className="form-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="form-modal-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="catalog-form-modal-title"
      >
        <div className="form-modal-header">
          <div>
            <h2 id="catalog-form-modal-title" className="text-lg font-semibold text-gray-900">
              {title}
            </h2>
            {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="table-action table-action--view"
            aria-label="Close"
          >
            <IconClose />
          </button>
        </div>
        <div className="form-modal-body">{children}</div>
        {footer && <div className="form-modal-footer">{footer}</div>}
      </div>
    </div>
  );
};

export default FormModal;
