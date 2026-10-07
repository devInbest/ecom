import { IconStar } from './CatalogIcons';

const FeaturedBadge = ({ featured }) => {
  if (!featured) {
    return <span className="text-gray-400 text-sm">—</span>;
  }

  return (
    <span className="catalog-featured-badge">
      <IconStar className="w-3 h-3" />
      Featured
    </span>
  );
};

export default FeaturedBadge;
