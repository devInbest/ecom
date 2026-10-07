'use client';

import { Button } from '@mantine/core';
import Link from 'next/link';

import Container from '@/components/common/Container/Container';
import Footer from '@/components/layout/Footer/Footer';
import Header from '@/components/layout/Header/Header';
import ProductCard from '@/components/shop/ProductCard/ProductCard';
import { useAuth } from '@/providers/AuthProvider';
import { useLoginModal } from '@/providers/LoginModalProvider';
import { useWishlist } from '@/providers/WishlistProvider';

import classes from './wishlist.module.scss';

export default function WishlistPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { wishlist, loading } = useWishlist();
  const { openLogin } = useLoginModal();
  const hasItems = isAuthenticated && wishlist.items.length > 0;
  const empty = isAuthenticated && !loading && !wishlist.items.length;
  const showEmptyStage = !hasItems;

  return (
    <>
      <Header />
      <main className={classes.page}>
        <Container className={showEmptyStage ? classes.shellEmpty : undefined}>
          {hasItems ? (
            <>
              <header className={`${classes.head} ${classes.headWithGrid}`}>
                <h1>Wishlist</h1>
              </header>
              <div className={classes.grid}>
                {wishlist.items.map((item) => (
                  <ProductCard key={item.productId} product={item.product} />
                ))}
              </div>
            </>
          ) : (
            <div className={classes.emptyStage}>
              <header className={classes.head}>
                <h1>Wishlist</h1>
              </header>

              {authLoading || loading ? (
                <p className={classes.status}>Loading your saved tees…</p>
              ) : null}

              {!authLoading && !isAuthenticated ? (
                <div className={classes.empty}>
                  <p>Sign in to save products and keep them across devices.</p>
                  <Button radius="xl" onClick={() => openLogin()}>
                    Sign in
                  </Button>
                </div>
              ) : null}

              {empty ? (
                <div className={classes.empty}>
                  <p>Your wishlist is empty. Tap the heart on any product to save it here.</p>
                  <Button component={Link} href="/shop/men" radius="xl">
                    Continue shopping
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </Container>
      </main>
      <Footer />
    </>
  );
}
