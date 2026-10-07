'use client';

import { IconHeart, IconShoppingBag, IconUser } from '@tabler/icons-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import Container from '@/components/common/Container/Container';
import Logo from '@/components/common/Logo/Logo';
import ThemeToggle from '@/components/common/ThemeToggle/ThemeToggle';
import MegaNav from '@/components/layout/Header/MegaNav';
import MobileDrawer from '@/components/layout/MobileDrawer/MobileDrawer';
import { useAuth } from '@/providers/AuthProvider';
import { useCart } from '@/providers/CartProvider';
import { useLoginModal } from '@/providers/LoginModalProvider';
import { useWishlist } from '@/providers/WishlistProvider';

import classes from './Header.module.scss';

const SCROLL_SHRINK_AT = 48;

export default function Header() {
  const { cart } = useCart();
  const { itemCount: wishlistCount } = useWishlist();
  const { isAuthenticated, loading } = useAuth();
  const { openLogin } = useLoginModal();
  const [scrolled, setScrolled] = useState(false);
  const sentinelRef = useRef(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return undefined;

    const syncScroll = () => {
      const scrollY =
        window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
      setScrolled(scrollY > SCROLL_SHRINK_AT);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        setScrolled(!entry.isIntersecting);
      },
      { threshold: 0 },
    );

    observer.observe(sentinel);
    syncScroll();
    window.addEventListener('scroll', syncScroll, { passive: true });
    document.addEventListener('scroll', syncScroll, { passive: true, capture: true });
    window.addEventListener('pageshow', syncScroll);

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', syncScroll);
      document.removeEventListener('scroll', syncScroll, { capture: true });
      window.removeEventListener('pageshow', syncScroll);
    };
  }, []);

  return (
    <>
      <div ref={sentinelRef} className={classes.sentinel} aria-hidden="true" />
      <header className={`${classes.header} ${scrolled ? classes.scrolled : ''}`.trim()}>
        <Container className={classes.shell}>
          <div className={classes.cluster}>
            <div className={classes.logoWrap}>
              <Logo compact />
            </div>

            <div className={classes.bar}>
              <nav className={classes.desktopNav} aria-label="Main navigation">
                <MegaNav scrolled={scrolled} />
              </nav>
            </div>

            <div className={classes.loginWrap}>
              <Link href="/account" className={classes.iconLink} aria-label="Account">
                <IconUser size={18} stroke={1.75} />
              </Link>
              <Link href="/wishlist" className={classes.iconLink} aria-label="Wishlist">
                <IconHeart size={18} stroke={1.75} />
                {wishlistCount > 0 ? (
                  <span className={classes.badge}>{wishlistCount}</span>
                ) : null}
              </Link>
              <Link href="/cart" className={classes.iconLink} aria-label="Cart">
                <IconShoppingBag size={18} stroke={1.75} />
                {cart.itemCount > 0 ? (
                  <span className={classes.badge}>{cart.itemCount}</span>
                ) : null}
              </Link>
              <ThemeToggle className={classes.themeToggle} />
              {!loading && !isAuthenticated ? (
                <button type="button" className={classes.loginButton} onClick={() => openLogin()}>
                  Login
                </button>
              ) : null}
              <MobileDrawer />
            </div>
          </div>
        </Container>
      </header>
    </>
  );
}
