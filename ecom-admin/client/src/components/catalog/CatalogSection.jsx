const CatalogSection = ({ title, children, className = '' }) => (
  <section className={`catalog-section ${className}`.trim()}>
    {title && <h3 className="catalog-section-title">{title}</h3>}
    {children}
  </section>
);

export default CatalogSection;
