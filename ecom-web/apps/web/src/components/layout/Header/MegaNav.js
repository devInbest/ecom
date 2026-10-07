'use client';

import { IconChevronDown } from '@tabler/icons-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { pickCategoryTree, shopNavSections } from '@/constants/navigation';
import { catalogApi } from '@/services/api';

import classes from './MegaNav.module.scss';

function shopHref(gender, slug) {
  const base = `/shop/${gender}`;
  return slug ? `${base}?category=${encodeURIComponent(slug)}` : base;
}

export default function MegaNav({ scrolled = false }) {
  const pathname = usePathname();
  const [tree, setTree] = useState([]);
  const [open, setOpen] = useState(null);
  const navRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    catalogApi
      .categories()
      .then((data) => {
        if (!cancelled) setTree(data.items || []);
      })
      .catch(() => {
        if (!cancelled) setTree([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setOpen(null);
  }, [pathname]);

  useEffect(() => {
    if (!open) return undefined;

    function onPointerDown(event) {
      if (!navRef.current?.contains(event.target)) {
        setOpen(null);
      }
    }

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        setOpen(null);
      }
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const items = shopNavSections.map((section) => ({
    ...section,
    categories: pickCategoryTree(tree, section.treeGender),
  }));

  const toggleItem = (key) => {
    setOpen((current) => (current === key ? null : key));
  };

  return (
    <ul
      ref={navRef}
      className={`${classes.list} ${scrolled ? classes.navScrolled : ''}`.trim()}
    >
      {items.map((item) => {
        const isActive =
          pathname === item.href || pathname?.startsWith(`${item.href}/`);
        const hasMenu = Boolean(item.categories?.length);
        const isOpen = open === item.key;
        const linkClass = classes.link;

        if (!hasMenu) {
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                className={linkClass}
                aria-current={isActive ? 'page' : undefined}
              >
                {item.label}
              </Link>
            </li>
          );
        }

        return (
          <li
            key={item.key}
            className={classes.item}
            onMouseEnter={() => setOpen(item.key)}
            onMouseLeave={() => setOpen(null)}
          >
            <div className={`${classes.trigger} ${linkClass}`.trim()}>
              <Link
                href={item.href}
                className={classes.triggerLabel}
                aria-current={isActive ? 'page' : undefined}
              >
                {item.label}
              </Link>
              <button
                type="button"
                className={classes.toggle}
                aria-expanded={isOpen}
                aria-haspopup="true"
                aria-label={`Show ${item.label} categories`}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  toggleItem(item.key);
                }}
              >
                <IconChevronDown
                  size={18}
                  stroke={2}
                  aria-hidden="true"
                  className={isOpen ? classes.chevronOpen : undefined}
                />
              </button>
            </div>

            <div
              className={`${classes.panel} ${isOpen ? classes.panelOpen : ''}`.trim()}
              role="region"
              aria-label={`${item.label} categories`}
            >
              <div className={classes.panelInner}>
                <div className={classes.columns}>
                  {item.categories.map((root) => (
                    <div key={root.id} className={classes.column}>
                      <Link
                        href={shopHref(item.gender, root.slug)}
                        className={classes.columnTitle}
                        onClick={() => setOpen(null)}
                      >
                        {root.name}
                      </Link>
                      {(root.children || []).length ? (
                        <ul className={classes.subList}>
                          {root.children.map((child) => (
                            <li key={child.id}>
                              <Link
                                href={shopHref(item.gender, child.slug)}
                                onClick={() => setOpen(null)}
                              >
                                {child.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
