'use client';

import { IconChevronDown } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import classes from './ShopSort.module.scss';

const SORT_OPTIONS = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'newest', label: 'Newest' },
  { value: 'price_low', label: 'Lowest price' },
  { value: 'price_high', label: 'Highest price' },
];

export default function ShopSort() {
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get('sort') || 'recommended';

  useEffect(() => {
    if (!open) return undefined;

    function onPointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function selectSort(value) {
    const params = new URLSearchParams(searchParams.toString());

    if (value === 'recommended') {
      params.delete('sort');
    } else {
      params.set('sort', value);
    }

    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    setOpen(false);
  }

  return (
    <div className={classes.sort} ref={rootRef}>
      <button
        type="button"
        className={classes.trigger}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Sort products"
      >
        <span>Sort</span>
        <IconChevronDown
          className={`${classes.chevron} ${open ? classes.chevronOpen : ''}`.trim()}
          size={16}
          stroke={2}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <ul className={classes.menu} role="listbox" aria-label="Sort options">
          {SORT_OPTIONS.map((option) => (
            <li key={option.value} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={current === option.value}
                className={
                  current === option.value ? classes.optionActive : classes.option
                }
                onClick={() => selectSort(option.value)}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
