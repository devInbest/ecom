const FormField = ({ label, required, error, hint, children, className = '' }) => (
  <div className={className}>
    {label && (
      <label className="form-label">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
    )}
    {children}
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    {hint && !error && <p className="text-gray-400 text-xs mt-1">{hint}</p>}
  </div>
);

export default FormField;
