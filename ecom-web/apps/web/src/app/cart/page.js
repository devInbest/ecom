'use client';

import { Button, Textarea, TextInput } from '@mantine/core';
import {
  IconCheck,
  IconMinus,
  IconNote,
  IconPlus,
  IconTicket,
  IconTrash,
  IconTruck,
  IconX,
} from '@tabler/icons-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import Container from '@/components/common/Container/Container';
import Footer from '@/components/layout/Footer/Footer';
import Header from '@/components/layout/Header/Header';
import ProductCard from '@/components/shop/ProductCard/ProductCard';
import { brand } from '@/constants/site';
import { useAuth } from '@/providers/AuthProvider';
import { useCart } from '@/providers/CartProvider';
import { useLoginModal } from '@/providers/LoginModalProvider';
import { catalogApi } from '@/services/api';
import { formatInr } from '@/utils/money';

import classes from './cart.module.scss';

const COUPON_CODE = 'NONSENSE400';
const BUY2_DISCOUNT_PAISE = 40000;
const NOTE_KEY = 'nonsense_cart_note';

function unitPrice(item) {
  if (item.unitPrice != null) return item.unitPrice;
  if (item.lineTotal && item.quantity) return Math.round(item.lineTotal / item.quantity);
  return item.variant?.price ?? item.variant?.product?.basePrice ?? 0;
}

export default function CartPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { cart, loading, updateItem, removeItem } = useCart();
  const { openLogin } = useLoginModal();
  const [panel, setPanel] = useState(null);
  const [note, setNote] = useState('');
  const [coupon, setCoupon] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [suggested, setSuggested] = useState([]);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    try {
      setNote(localStorage.getItem(NOTE_KEY) || '');
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    catalogApi
      .featured()
      .then((data) => setSuggested((data.items || []).slice(0, 4)))
      .catch(() => setSuggested([]));
  }, []);

  const itemCount = cart.itemCount || cart.items?.reduce((n, i) => n + i.quantity, 0) || 0;
  const buy2Eligible = itemCount >= 2;
  const discount = couponApplied && buy2Eligible ? BUY2_DISCOUNT_PAISE : 0;
  const subtotal = cart.subtotal || 0;
  const total = Math.max(0, subtotal - discount);
  const freeShipProgress = Math.min(1, subtotal / (brand.policies.freeShippingThresholdInr * 100));
  const freeShipRemaining = Math.max(
    0,
    brand.policies.freeShippingThresholdInr * 100 - subtotal,
  );

  const empty = isAuthenticated && !loading && !cart.items.length;

  async function changeQty(itemId, next) {
    setUpdatingId(itemId);
    try {
      await updateItem(itemId, Math.max(0, next));
    } catch {
      /* cart provider refreshes on failure */
    } finally {
      setUpdatingId(null);
    }
  }

  async function removeLine(itemId) {
    setUpdatingId(itemId);
    try {
      await removeItem(itemId);
    } catch {
      /* cart provider refreshes on failure */
    } finally {
      setUpdatingId(null);
    }
  }

  function saveNote() {
    try {
      localStorage.setItem(NOTE_KEY, note.trim());
    } catch {
      /* ignore */
    }
    setPanel(null);
  }

  function applyCoupon(e) {
    e.preventDefault();
    setCouponError('');
    if (coupon.trim().toUpperCase() !== COUPON_CODE) {
      setCouponError('Enter NONSENSE400 for the buy-2 offer.');
      setCouponApplied(false);
      return;
    }
    if (!buy2Eligible) {
      setCouponError('Add 2+ items to unlock this offer.');
      setCouponApplied(false);
      return;
    }
    setCouponApplied(true);
    setPanel(null);
  }

  const panelTitle = useMemo(() => {
    if (panel === 'note') return 'Order note';
    if (panel === 'shipping') return 'Shipping';
    if (panel === 'coupon') return 'Coupon';
    return '';
  }, [panel]);

  return (
    <>
      <Header />
      <main className={classes.page}>
        <Container>
          <header className={classes.head}>
            <h1>Shopping Cart</h1>
          </header>

          {authLoading || loading ? <p className={classes.status}>Loading your bag…</p> : null}

          {!authLoading && !isAuthenticated ? (
            <div className={classes.empty}>
              <p>Sign in to sync your bag across web and checkout.</p>
              <Button
                radius="xl"
                onClick={() => openLogin()}
              >
                Sign in
              </Button>
            </div>
          ) : null}

          {empty ? (
            <div className={classes.empty}>
              <p>Your shopping cart is empty.</p>
              <Button component={Link} href="/shop/men" radius="xl">
                Continue shopping
              </Button>
            </div>
          ) : null}

          {isAuthenticated && cart.items.length > 0 ? (
            <div className={classes.layout}>
              <div className={classes.tableWrap}>
                <div className={classes.tableHead} aria-hidden="true">
                  <span>Product</span>
                  <span>Price</span>
                  <span>Quantity</span>
                  <span>Total</span>
                  <span />
                </div>

                <ul className={classes.list}>
                  {cart.items.map((item) => {
                    const product = item.variant?.product || {};
                    const price = unitPrice(item);
                    const line = item.lineTotal ?? price * item.quantity;
                    return (
                      <li key={item.id} className={classes.row}>
                        <div className={classes.product}>
                          <Link
                            href={`/product/${product.slug}`}
                            className={classes.thumb}
                          >
                            {product.images?.[0] ? (
                              <Image
                                src={product.images[0]}
                                alt={product.name || 'Product'}
                                fill
                                sizes="88px"
                              />
                            ) : null}
                          </Link>
                          <div className={classes.meta}>
                            <Link href={`/product/${product.slug}`} className={classes.name}>
                              {product.name}
                            </Link>
                            <p>
                              Color: {item.variant?.color}
                              <br />
                              Size: {item.variant?.size}
                            </p>
                          </div>
                        </div>

                        <div className={classes.price} data-label="Price">
                          {formatInr(price)}
                        </div>

                        <div className={classes.qty} data-label="Quantity">
                          <button
                            type="button"
                            aria-label="Decrease quantity"
                            disabled={updatingId === item.id || item.quantity <= 1}
                            onClick={() => changeQty(item.id, item.quantity - 1)}
                          >
                            <IconMinus size={16} stroke={2.25} />
                          </button>
                          <span>{item.quantity}</span>
                          <button
                            type="button"
                            aria-label="Increase quantity"
                            disabled={updatingId === item.id || item.quantity >= 10}
                            onClick={() => changeQty(item.id, item.quantity + 1)}
                          >
                            <IconPlus size={16} stroke={2.25} />
                          </button>
                        </div>

                        <div className={classes.line} data-label="Total">
                          {formatInr(line)}
                        </div>

                        <button
                          type="button"
                          className={classes.delete}
                          aria-label={`Remove ${product.name || 'item'} from cart`}
                          title="Remove from cart"
                          disabled={updatingId === item.id}
                          onClick={() => removeLine(item.id)}
                        >
                          <IconTrash size={18} stroke={1.75} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <aside className={classes.summary}>
                <div className={classes.tools} role="tablist" aria-label="Cart tools">
                  <button
                    type="button"
                    className={panel === 'note' ? classes.toolActive : undefined}
                    onClick={() => setPanel(panel === 'note' ? null : 'note')}
                    aria-pressed={panel === 'note'}
                  >
                    <IconNote size={18} stroke={1.75} />
                    <span>Note</span>
                  </button>
                  <button
                    type="button"
                    className={panel === 'shipping' ? classes.toolActive : undefined}
                    onClick={() => setPanel(panel === 'shipping' ? null : 'shipping')}
                    aria-pressed={panel === 'shipping'}
                  >
                    <IconTruck size={18} stroke={1.75} />
                    <span>Shipping</span>
                  </button>
                  <button
                    type="button"
                    className={panel === 'coupon' ? classes.toolActive : undefined}
                    onClick={() => setPanel(panel === 'coupon' ? null : 'coupon')}
                    aria-pressed={panel === 'coupon'}
                  >
                    <IconTicket size={18} stroke={1.75} />
                    <span>Coupon</span>
                  </button>
                </div>

                {panel ? (
                  <div className={classes.panel}>
                    <div className={classes.panelHead}>
                      <strong>{panelTitle}</strong>
                      <button type="button" aria-label="Close" onClick={() => setPanel(null)}>
                        <IconX size={16} />
                      </button>
                    </div>

                    {panel === 'note' ? (
                      <>
                        <Textarea
                          value={note}
                          onChange={(e) => setNote(e.currentTarget.value)}
                          placeholder="Gift message, delivery instructions…"
                          minRows={3}
                          radius="md"
                        />
                        <Button radius="xl" mt="sm" onClick={saveNote}>
                          Save note
                        </Button>
                      </>
                    ) : null}

                    {panel === 'shipping' ? (
                      <div className={classes.shipInfo}>
                        <p>
                          Free standard shipping on prepaid orders over ₹
                          {brand.policies.freeShippingThresholdInr.toLocaleString('en-IN')}.
                        </p>
                        <div className={classes.progressTrack} aria-hidden="true">
                          <span style={{ width: `${freeShipProgress * 100}%` }} />
                        </div>
                        <p className={classes.shipHint}>
                          {freeShipRemaining > 0
                            ? `You are ${formatInr(freeShipRemaining)} away from free shipping.`
                            : 'You have unlocked free prepaid shipping.'}
                        </p>
                        <p>
                          Metro: {brand.policies.metroDeliveryDays} business days · Rest of India:{' '}
                          {brand.policies.restOfIndiaDeliveryDays} business days after dispatch.
                        </p>
                        <Link href="/shipping">View shipping policy</Link>
                      </div>
                    ) : null}

                    {panel === 'coupon' ? (
                      <form onSubmit={applyCoupon} className={classes.couponForm}>
                        <TextInput
                          value={coupon}
                          onChange={(e) => setCoupon(e.currentTarget.value)}
                          placeholder="Enter coupon code"
                          radius="md"
                        />
                        <Button type="submit" radius="xl">
                          Apply
                        </Button>
                        {couponError ? <p className={classes.error}>{couponError}</p> : null}
                        <p className={classes.couponHint}>Try {COUPON_CODE} when you buy 2+ tees.</p>
                      </form>
                    ) : null}
                  </div>
                ) : null}

                {couponApplied && discount > 0 ? (
                  <p className={classes.offer}>
                    BUY 2 & GET ₹400 OFF (−{formatInr(discount)})
                  </p>
                ) : (
                  <p className={classes.offerMuted}>BUY 2 & GET ₹400 OFF with code {COUPON_CODE}</p>
                )}

                {note.trim() ? (
                  <p className={classes.savedNote}>
                    <IconCheck size={14} stroke={2} /> Note saved for checkout
                  </p>
                ) : null}

                <div className={classes.totals}>
                  <div className={classes.totalRow}>
                    <span>Subtotal</span>
                    <strong>{formatInr(subtotal)}</strong>
                  </div>
                  {discount > 0 ? (
                    <div className={classes.totalRow}>
                      <span>Discount</span>
                      <strong className={classes.discount}>−{formatInr(discount)}</strong>
                    </div>
                  ) : null}
                  <div className={`${classes.totalRow} ${classes.grand}`.trim()}>
                    <span>Total</span>
                    <strong>{formatInr(total)}</strong>
                  </div>
                </div>

                <p className={classes.taxNote}>Taxes and shipping calculated at checkout.</p>

                <Button
                  component={Link}
                  href="/checkout"
                  radius="xl"
                  fullWidth
                  size="md"
                  className={classes.checkout}
                >
                  Checkout
                </Button>
                <Link href="/shop/men" className={classes.continue}>
                  Continue shopping
                </Link>
              </aside>
            </div>
          ) : null}

          {suggested.length ? (
            <section className={classes.related}>
              <h2>Recently viewed products</h2>
              <div className={classes.relatedGrid}>
                {suggested.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </section>
          ) : null}

          <section className={classes.banner} aria-label="Brand promise">
            <p className={classes.bannerEyebrow}>Proudly designed in India</p>
            <h2>Texture you can feel — graphics that hold up.</h2>
            <p>Over thousands of happy customers and counting.</p>
          </section>
        </Container>
      </main>
      <Footer />
    </>
  );
}
