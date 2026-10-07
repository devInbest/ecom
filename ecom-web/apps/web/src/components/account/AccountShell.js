'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import Footer from '@/components/layout/Footer/Footer';
import Header from '@/components/layout/Header/Header';

import classes from './AccountShell.module.scss';

const TABS = [
  { href: '/account', label: 'Profile', match: (path) => path === '/account' },
  {
    href: '/account/orders',
    label: 'Orders',
    match: (path) => path.startsWith('/account/orders'),
  },
  { href: '/track-order', label: 'Track', match: (path) => path.startsWith('/track-order') },
];

export default function AccountShell({ children }) {
  const pathname = usePathname();

  return (
    <>
      <Header />
      <main className={classes.page}>
        <div className={classes.heroBand} aria-hidden="true" />
        <div className={classes.shell}>
          <nav className={classes.tabs} aria-label="Account">
            {TABS.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className={tab.match(pathname || '') ? classes.tabActive : undefined}
                aria-current={tab.match(pathname || '') ? 'page' : undefined}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
          {children}
        </div>
      </main>
      <Footer />
    </>
  );
}
