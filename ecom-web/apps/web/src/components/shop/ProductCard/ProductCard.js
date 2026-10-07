'use client';

import { IconArrowUpRight } from '@tabler/icons-react';
import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import WishlistButton from '@/components/shop/WishlistButton/WishlistButton';
import { useAuth } from '@/providers/AuthProvider';
import { useCart } from '@/providers/CartProvider';
import { useLoginModal } from '@/providers/LoginModalProvider';

import classes from './ProductCard.module.scss';

function defaultVariant(product) {
  const variants = product.variants || [];
  return variants.find((variant) => variant.stock > 0) || variants[0] || null;
}

export default function ProductCard({ product }) {
  const image = product.images?.[0];
  const hoverImage = product.images?.[1];
  const { addItem } = useCart();
  const { isAuthenticated } = useAuth();
  const { openLogin } = useLoginModal();
  const [pending, setPending] = useState(false);
  const [added, setAdded] = useState(false);

  const variant = useMemo(() => defaultVariant(product), [product]);
  const detailHref = `/product/${product.slug}`;
  const labelLeft = product.texture || 'T-Shirt';
  const labelRight = product.collection || "Spring '26";

  async function onAddToCart(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!variant || pending) return;

    const add = async () => {
      setPending(true);
      setAdded(false);
      try {
        await addItem(variant.id, 1);
        setAdded(true);
        window.setTimeout(() => setAdded(false), 1800);
      } finally {
        setPending(false);
      }
    };

    if (!isAuthenticated) {
      openLogin({ onSuccess: add });
      return;
    }

    await add();
  }

  return (
    <article className={classes.card}>
      <div className={classes.surface}>
        <Link
          href={detailHref}
          className={classes.cardLink}
          aria-label={`View ${product.name}`}
        />

        {image ? (
          <Image
            src={image}
            alt={product.name}
            fill
            sizes="(max-width: 480px) 100vw, (max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            className={classes.image}
          />
        ) : (
          <div className={classes.placeholder} />
        )}
        {hoverImage ? (
          <Image
            src={hoverImage}
            alt=""
            fill
            sizes="(max-width: 480px) 100vw, (max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            className={classes.imageAlt}
            aria-hidden="true"
          />
        ) : null}

        <div className={classes.scrim} aria-hidden="true" />

        <WishlistButton productId={product.id} className={classes.wish} size={18} />

        <span className={classes.arrow} aria-hidden="true">
          <span className={classes.arrowIcon}>
            <IconArrowUpRight size={28} stroke={1.5} />
          </span>
        </span>

        <div className={classes.footer}>
          <div className={classes.labels}>
            <span>{labelLeft}</span>
            <span>{labelRight}</span>
          </div>
        </div>

        <button
          type="button"
          className={classes.addToCart}
          onClick={onAddToCart}
          disabled={!variant || pending}
        >
          {pending ? 'Adding…' : added ? 'Added Successfully' : 'Add to cart'}
        </button>
      </div>
    </article>
  );
}
