'use client';

import classes from './WishlistToast.module.scss';

export default function WishlistToast({ message, visible }) {
  if (!message) return null;

  return (
    <p className={`${classes.toast} ${visible ? classes.visible : ''}`.trim()} role="status" aria-live="polite">
      {message}
    </p>
  );
}
