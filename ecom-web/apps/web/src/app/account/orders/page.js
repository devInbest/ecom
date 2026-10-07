'use client';

import { Badge, Button } from '@mantine/core';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useAuth } from '@/providers/AuthProvider';
import { useLoginModal } from '@/providers/LoginModalProvider';
import { orderApi } from '@/services/api';
import { formatInr } from '@/utils/money';
import { formatOrderDate, statusColor, statusLabel } from '@/utils/orders';

import classes from '../account.module.scss';

export default function OrdersPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { openLogin } = useLoginModal();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paid, setPaid] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setPaid(params.get('paid'));
  }, []);

  useEffect(() => {
    if (authLoading) return undefined;

    if (!isAuthenticated) {
      setLoading(false);
      setOrders([]);
      openLogin({
        onSuccess: () => router.replace('/account/orders'),
      });
      return undefined;
    }

    setLoading(true);
    setError('');

    orderApi
      .list()
      .then((list) => {
        setOrders(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        setOrders([]);
        setError('Could not load orders. Try again.');
      })
      .finally(() => {
        setLoading(false);
      });

    return undefined;
  }, [authLoading, isAuthenticated, openLogin, router]);

  const paidOrder = orders.find((order) => order.id === paid || order.orderNumber === paid);

  if (authLoading || loading) {
    return <p className={classes.loading}>Loading orders…</p>;
  }

  if (!isAuthenticated) {
    return (
      <div className={classes.emptyState}>
        <p>Sign in to see your orders.</p>
      </div>
    );
  }

  return (
    <div className={classes.ordersPage}>
      <header className={classes.ordersHeader}>
        <h1 className={classes.ordersTitle}>Orders</h1>
        <p className={classes.ordersLead}>Every drop you’ve checked out, with tracking in one place.</p>
      </header>

      {paid ? (
        <div className={classes.banner} role="status">
          <p>Payment received{paidOrder ? ` for ${paidOrder.orderNumber}` : ''}.</p>
          <span>We’ll pack this drop and update tracking as it moves.</span>
        </div>
      ) : null}

      {error ? <p className={classes.statusErr}>{error}</p> : null}

      {!orders.length ? (
        <div className={classes.emptyState}>
          <p>No orders yet — your oversized tees will land here.</p>
          <Button component={Link} href="/shop" radius="xl">
            Shop the drop
          </Button>
        </div>
      ) : (
        <div className={classes.orderList}>
          {orders.map((order) => (
            <article key={order.id} className={classes.orderCard}>
              <div className={classes.orderHead}>
                <div>
                  <h2 className={classes.orderId}>{order.orderNumber}</h2>
                  <p className={classes.orderMeta}>{formatOrderDate(order.createdAt)}</p>
                </div>
                <Badge color={statusColor(order.status)} variant="light" size="lg" radius="sm">
                  {statusLabel(order.status)}
                </Badge>
              </div>
              <div className={classes.orderFoot}>
                <span className={classes.total}>{formatInr(order.total)}</span>
                <Button
                  component={Link}
                  href={`/track-order?order=${encodeURIComponent(order.orderNumber)}`}
                  radius="xl"
                  variant="default"
                  size="sm"
                >
                  Track order
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
