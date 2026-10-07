import Image from 'next/image';
import Link from 'next/link';

import logoOrange from '@/assets/images/logos/nonsense-logo-orange.svg';

import classes from './Logo.module.scss';

export default function Logo({ compact = false }) {
  return (
    <Link
      href="/"
      className={[classes.logo, compact ? classes.compact : ''].filter(Boolean).join(' ')}
      aria-label="NONSENSE home"
    >
      <Image
        src={logoOrange}
        alt=""
        className={classes.image}
        width={220}
        height={24}
        priority
      />
    </Link>
  );
}
