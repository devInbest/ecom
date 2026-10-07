'use client';

import { useRouter } from 'next/navigation';

import classes from '@/app/shop/shop.module.scss';

export default function ShopCategoryFilters({ items = [], activeSlug = '' }) {
  const router = useRouter();

  function onNavigate(event, href) {
    event.preventDefault();
    router.push(href, { scroll: false });
  }

  return (
    <div className={classes.filters} role="list">
      {items.map((item) => (
        <a
          key={item.href}
          href={item.href}
          role="listitem"
          className={activeSlug === item.slug ? classes.filterActive : classes.filter}
          onClick={(event) => onNavigate(event, item.href)}
        >
          {item.label}
        </a>
      ))}
    </div>
  );
}
