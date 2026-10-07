'use client';

import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import ProductCard from '@/components/shop/ProductCard/ProductCard';

import classes from './FeaturedDropsSection.module.scss';

const VISIBLE_COUNT = 4;

export default function FeaturedDropsSection({ products = [] }) {
  const trackRef = useRef(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const syncNav = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    setCanPrev(el.scrollLeft > 1);
    setCanNext(el.scrollLeft < maxScroll - 1);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el || !products.length) return undefined;

    const runSync = () => requestAnimationFrame(syncNav);

    runSync();
    el.addEventListener('scroll', syncNav, { passive: true });
    window.addEventListener('resize', runSync);

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(runSync) : null;
    ro?.observe(el);

    el.querySelectorAll('img').forEach((img) => {
      if (!img.complete) img.addEventListener('load', runSync, { once: true });
    });

    return () => {
      el.removeEventListener('scroll', syncNav);
      window.removeEventListener('resize', runSync);
      ro?.disconnect();
    };
  }, [products.length, syncNav]);

  function scrollByDirection(direction) {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector('[data-featured-card]');
    const step = card ? card.offsetWidth : el.clientWidth / VISIBLE_COUNT;
    el.scrollBy({ left: direction * step, behavior: 'smooth' });
    window.setTimeout(syncNav, 350);
  }

  if (!products.length) return null;

  return (
    <section className={classes.section} aria-label="Featured drops">
      <div className={classes.bar}>
        <h2 className={classes.title}>Featured drops</h2>
        <div className={classes.nav}>
          <button
            type="button"
            className={classes.arrow}
            aria-label="Previous featured products"
            disabled={!canPrev}
            onClick={() => scrollByDirection(-1)}
          >
            <IconChevronLeft size={36} stroke={1.75} />
          </button>
          <button
            type="button"
            className={classes.arrow}
            aria-label="Next featured products"
            disabled={!canNext}
            onClick={() => scrollByDirection(1)}
          >
            <IconChevronRight size={36} stroke={1.75} />
          </button>
        </div>
      </div>

      <div className={classes.track} ref={trackRef}>
        {products.map((product) => (
          <div key={product.id} className={classes.slide} data-featured-card>
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}
