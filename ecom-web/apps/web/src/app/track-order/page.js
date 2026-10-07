'use client';

import { Badge, Button, TextInput } from '@mantine/core';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import AccountShell from '@/components/account/AccountShell';
import { brand } from '@/constants/site';
import { useAuth } from '@/providers/AuthProvider';
import { useLoginModal } from '@/providers/LoginModalProvider';
import { orderApi } from '@/services/api';
import { formatInr } from '@/utils/money';
import {
  ORDER_STEPS,
  estimateDelivery,
  formatAddress,
  formatOrderDate,
  statusColor,
  statusIndex,
  statusLabel,
} from '@/utils/orders';

import classes from './track.module.scss';

function TrackForm() {
  const router = useRouter();
  const params = useSearchParams();
  const queryOrder = params.get('order') || '';
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { openLogin } = useLoginModal();
  const [orderId, setOrderId] = useState(queryOrder);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const autoTried = useRef('');

  const active = useMemo(() => (order ? statusIndex(order.status) : -1), [order]);
  const eta = useMemo(() => estimateDelivery(order), [order]);

  const lookup = useCallback(
    async (rawId) => {
      const id = String(rawId || '').trim();
      setError('');
      setOrder(null);
      if (!id) {
        setError('Enter your order number (for example FRM-XXXX-000).');
        return;
      }
      if (authLoading) return;
      if (!isAuthenticated) {
        openLogin({
          onSuccess: async () => {
            setPending(true);
            try {
              const data = await orderApi.get(id);
              setOrder(data);
              if (data?.orderNumber) autoTried.current = data.orderNumber;
              if (data?.orderNumber && data.orderNumber !== id) {
                router.replace(`/track-order?order=${encodeURIComponent(data.orderNumber)}`);
              }
            } catch {
              setError(
                'We could not find that order on your account. Check the number or contact support.',
              );
            } finally {
              setPending(false);
            }
          },
        });
        return;
      }
      setPending(true);
      try {
        const data = await orderApi.get(id);
        setOrder(data);
        if (data?.orderNumber) autoTried.current = data.orderNumber;
        if (data?.orderNumber && data.orderNumber !== id) {
          router.replace(`/track-order?order=${encodeURIComponent(data.orderNumber)}`);
        }
      } catch {
        setError('We could not find that order on your account. Check the number or contact support.');
      } finally {
        setPending(false);
      }
    },
    [authLoading, isAuthenticated, openLogin, router],
  );

  useEffect(() => {
    setOrderId(queryOrder);
  }, [queryOrder]);

  useEffect(() => {
    if (authLoading || !queryOrder) return;
    if (autoTried.current === queryOrder) return;
    autoTried.current = queryOrder;
    lookup(queryOrder);
  }, [authLoading, queryOrder, lookup]);

  function onSubmit(e) {
    e.preventDefault();
    const id = orderId.trim();
    if (!id) {
      lookup('');
      return;
    }
    if (id === queryOrder) {
      lookup(id);
      return;
    }
    router.replace(`/track-order?order=${encodeURIComponent(id)}`);
  }

  return (
    <>
      <section className={classes.formCard}>
        <form className={classes.form} onSubmit={onSubmit}>
          <TextInput
            label="Order number"
            placeholder="e.g. FRM-XXXX-000"
            description="From your confirmation screen or orders list."
            value={orderId}
            onChange={(e) => setOrderId(e.currentTarget.value)}
            radius="md"
            required
          />
          <Button type="submit" radius="xl" loading={pending} className={classes.submit}>
            {isAuthenticated ? 'Track order' : 'Sign in to track'}
          </Button>
        </form>
        <p className={classes.hint}>
          Tracking is for signed-in customers. Open <Link href="/account/orders">Your orders</Link> if
          you do not have the number handy.
        </p>
        {error ? <p className={classes.error}>{error}</p> : null}
      </section>

      {order ? (
        <article className={classes.result}>
          <div className={classes.resultHead}>
            <div>
              <p className={classes.eyebrow}>Order</p>
              <h2>{order.orderNumber || order.id}</h2>
              <p className={classes.eta}>
                Placed {formatOrderDate(order.createdAt)}
                {eta ? ` · ETA ${eta}` : ''}
              </p>
            </div>
            <Badge color={statusColor(order.status)} size="lg" radius="sm" variant="light">
              {statusLabel(order.status)}
            </Badge>
          </div>

          {active >= 0 ? (
            <ol className={classes.timeline}>
              {ORDER_STEPS.map((step, index) => {
                const done = index <= active;
                return (
                  <li key={step.key} className={done ? classes.done : undefined}>
                    <span className={classes.dot} />
                    <span className={classes.stepLabel}>{step.label}</span>
                    <span className={classes.stepDetail}>{done ? step.done : step.detail}</span>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className={classes.cancelled}>
              This order is {statusLabel(order.status).toLowerCase()}. Write to{' '}
              <a href={`mailto:${brand.supportEmail}`}>{brand.supportEmail}</a> if you need help.
            </p>
          )}

          <div className={classes.grid}>
            <div className={classes.block}>
              <h3>Items</h3>
              <ul className={classes.items}>
                {order.items?.map((item) => (
                  <li key={item.id}>
                    <span>
                      {item.productName} — {item.size}/{item.color}
                    </span>
                    <span className={classes.muted}>
                      × {item.quantity} · {formatInr(item.lineTotal)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className={classes.totals}>
                <div>
                  <span className={classes.muted}>Subtotal</span>
                  <span>{formatInr(order.subtotal)}</span>
                </div>
                <div>
                  <span className={classes.muted}>Shipping</span>
                  <span>{order.shippingFee ? formatInr(order.shippingFee) : 'Free'}</span>
                </div>
                <div className={classes.grand}>
                  <span>Total</span>
                  <span>{formatInr(order.total)}</span>
                </div>
              </div>
            </div>

            <div className={classes.block}>
              <h3>Shipping to</h3>
              <p className={classes.address}>{formatAddress(order) || 'Address on file'}</p>
              {order.shippingPhone ? <p className={classes.phone}>{order.shippingPhone}</p> : null}
              {order.payment?.status ? (
                <p className={classes.help}>
                  Payment {String(order.payment.status).toLowerCase()}
                  {order.payment.provider ? ` via ${order.payment.provider}` : ''}
                </p>
              ) : null}
            </div>
          </div>

          <p className={classes.help}>
            Need a change of address or a missing parcel?{' '}
            <Link href="/contact">Contact us</Link> or email{' '}
            <a href={`mailto:${brand.supportEmail}`}>{brand.supportEmail}</a>. Typical replies within{' '}
            {brand.grievance.responseSla}.
          </p>
        </article>
      ) : null}
    </>
  );
}

export default function TrackOrderPage() {
  return (
    <AccountShell>
      <Suspense fallback={<p>Loading…</p>}>
        <TrackForm />
      </Suspense>
    </AccountShell>
  );
}
