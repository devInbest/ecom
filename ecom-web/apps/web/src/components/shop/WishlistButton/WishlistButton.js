'use client';

import { IconHeart, IconHeartFilled } from '@tabler/icons-react';

import { useWishlist } from '@/providers/WishlistProvider';

export default function WishlistButton({
  productId,
  className,
  size = 18,
  label,
  savedLabel,
}) {
  const { has, toggle, pendingId } = useWishlist();
  const saved = has(productId);

  return (
    <button
      type="button"
      className={className}
      aria-label={saved ? 'Remove from wishlist' : 'Add to wishlist'}
      aria-pressed={saved}
      disabled={pendingId === productId}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(productId);
      }}
    >
      {saved ? (
        <IconHeartFilled size={size} stroke={1.75} />
      ) : (
        <IconHeart size={size} stroke={1.75} />
      )}
      {label ? <span>{saved ? savedLabel || label : label}</span> : null}
    </button>
  );
}
