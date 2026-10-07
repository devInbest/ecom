'use client';

import { Button, Select, Stack, TextInput, Title, Text } from '@mantine/core';
import { IconBriefcase, IconHome, IconMapPin, IconPlus } from '@tabler/icons-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import Container from '@/components/common/Container/Container';
import Footer from '@/components/layout/Footer/Footer';
import Header from '@/components/layout/Header/Header';
import env from '@/constants/env';
import { useAuth } from '@/providers/AuthProvider';
import { useCart } from '@/providers/CartProvider';
import { useLoginModal } from '@/providers/LoginModalProvider';
import { authApi, orderApi } from '@/services/api';
import { formatInr } from '@/utils/money';

import classes from './checkout.module.scss';

const EMPTY_ADDRESS = {
  fullName: '',
  phone: '+91',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'IN',
  category: 'HOME',
  isDefault: true,
};

const CATEGORY_META = {
  HOME: { label: 'Home', Icon: IconHome },
  WORK: { label: 'Work', Icon: IconBriefcase },
  OTHER: { label: 'Other', Icon: IconMapPin },
};

function loadRazorpay() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function formatLines(address) {
  return [address.line1, address.line2, `${address.city}, ${address.state} ${address.postalCode}`]
    .filter(Boolean)
    .join(', ');
}

export default function CheckoutPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading, user, applyUser } = useAuth();
  const { cart, refresh: refreshCart } = useCart();
  const { openLogin } = useLoginModal();
  const [pending, setPending] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_ADDRESS);

  const addresses = user?.addresses || [];

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      openLogin({
        onSuccess: () => router.replace('/checkout'),
      });
      router.replace('/');
    }
  }, [authLoading, isAuthenticated, openLogin, router]);

  useEffect(() => {
    if (!user) return;
    const list = user.addresses || [];
    if (!list.length) {
      setShowAdd(true);
      setSelectedId('');
      setForm((f) => ({
        ...f,
        fullName: user.name || f.fullName,
        phone: user.phone || f.phone,
        isDefault: true,
      }));
      return;
    }

    setSelectedId((current) => {
      if (current && list.some((address) => address.id === current)) return current;
      return list.find((address) => address.isDefault)?.id || list[0].id;
    });
  }, [user]);

  const selectedAddress = useMemo(
    () => addresses.find((address) => address.id === selectedId) || null,
    [addresses, selectedId],
  );

  function setField(key) {
    return (e) => {
      const value = e?.currentTarget?.value ?? e ?? '';
      setForm((f) => ({ ...f, [key]: value }));
    };
  }

  async function saveNewAddress(e) {
    e.preventDefault();
    setSavingAddress(true);
    setError('');
    try {
      const next = await authApi.addAddress({
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        line1: form.line1.trim(),
        line2: form.line2.trim() || undefined,
        city: form.city.trim(),
        state: form.state.trim(),
        postalCode: form.postalCode.trim(),
        country: form.country.trim() || 'IN',
        category: form.category || 'HOME',
        isDefault: Boolean(form.isDefault) || addresses.length === 0,
      });
      applyUser(next);
      const created =
        next.addresses?.find((address) => address.isDefault) ||
        next.addresses?.[next.addresses.length - 1];
      if (created) setSelectedId(created.id);
      setShowAdd(false);
      setForm(EMPTY_ADDRESS);
    } catch (err) {
      setError(err.message || 'Could not save address');
    } finally {
      setSavingAddress(false);
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!selectedId) {
      setError('Choose a shipping address or add one before paying.');
      setShowAdd(true);
      return;
    }

    setPending(true);
    setError('');
    try {
      const checkout = await orderApi.checkout({ addressId: selectedId });
      const payName = selectedAddress?.fullName || form.fullName;
      const payPhone = selectedAddress?.phone || form.phone;

      if (!env.razorpayKeyId || checkout.keyId === 'rzp_test_dev') {
        await orderApi.mockPay(checkout.orderId);
        await refreshCart();
        router.push(`/account/orders?paid=${checkout.orderId}`);
        return;
      }

      const ok = await loadRazorpay();
      if (!ok) throw new Error('Could not load Razorpay');

      const rzp = new window.Razorpay({
        key: checkout.keyId || env.razorpayKeyId,
        amount: checkout.amount,
        currency: checkout.currency,
        name: 'NONSENSE',
        description: checkout.orderNumber,
        order_id: checkout.razorpayOrderId,
        handler: async (response) => {
          await orderApi.verifyPayment({
            orderId: checkout.orderId,
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });
          await refreshCart();
          router.push(`/account/orders?paid=${checkout.orderId}`);
        },
        prefill: {
          name: payName,
          contact: String(payPhone || '').replace('+', ''),
        },
        theme: { color: '#1c1917' },
      });
      rzp.open();
    } catch (err) {
      setError(err.message || 'Checkout failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Header />
      <main className={classes.page}>
        <Container>
          <Title order={1} className={classes.title}>
            Checkout
          </Title>
          <div className={classes.layout}>
            <div className={classes.form}>
              <div className={classes.sectionHead}>
                <div>
                  <Text fw={700}>Shipping address</Text>
                  <Text size="sm" c="dimmed">
                    Pick where this drop ships — default is selected for you.
                  </Text>
                </div>
                {addresses.length ? (
                  <button
                    type="button"
                    className={classes.addLink}
                    onClick={() => {
                      setShowAdd((v) => !v);
                      setForm((f) => ({
                        ...f,
                        fullName: user?.name || f.fullName,
                        phone: user?.phone || f.phone,
                        isDefault: false,
                      }));
                    }}
                  >
                    <IconPlus size={14} stroke={2} />
                    {showAdd ? 'Close' : 'Add new'}
                  </button>
                ) : null}
              </div>

              {addresses.length ? (
                <div className={classes.addressList} role="radiogroup" aria-label="Saved addresses">
                  {addresses.map((address) => {
                    const meta = CATEGORY_META[address.category] || CATEGORY_META.OTHER;
                    const Icon = meta.Icon;
                    const active = selectedId === address.id;
                    return (
                      <button
                        key={address.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        className={`${classes.addressOption} ${active ? classes.addressOptionActive : ''}`}
                        onClick={() => setSelectedId(address.id)}
                      >
                        <span className={classes.addressIcon}>
                          <Icon size={18} stroke={1.75} />
                        </span>
                        <span className={classes.addressCopy}>
                          <strong>
                            {meta.label}
                            {address.isDefault ? ' · Default' : ''}
                          </strong>
                          <span>{address.fullName}</span>
                          <span>{formatLines(address)}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <Text size="sm" c="dimmed" mb="sm">
                  No saved address yet. Add one below to continue.
                </Text>
              )}

              {showAdd ? (
                <form className={classes.addForm} onSubmit={saveNewAddress}>
                  <Stack gap="sm">
                    <Select
                      label="Category"
                      data={[
                        { value: 'HOME', label: 'Home' },
                        { value: 'WORK', label: 'Work' },
                        { value: 'OTHER', label: 'Other' },
                      ]}
                      value={form.category}
                      onChange={(value) => setForm((f) => ({ ...f, category: value || 'HOME' }))}
                      allowDeselect={false}
                    />
                    <TextInput label="Full name" required value={form.fullName} onChange={setField('fullName')} />
                    <TextInput label="Phone" required value={form.phone} onChange={setField('phone')} />
                    <TextInput label="Address line 1" required value={form.line1} onChange={setField('line1')} />
                    <TextInput label="Address line 2" value={form.line2} onChange={setField('line2')} />
                    <TextInput label="City" required value={form.city} onChange={setField('city')} />
                    <TextInput label="State" required value={form.state} onChange={setField('state')} />
                    <TextInput
                      label="Postal code"
                      required
                      value={form.postalCode}
                      onChange={setField('postalCode')}
                    />
                    <label className={classes.checkRow}>
                      <input
                        type="checkbox"
                        checked={Boolean(form.isDefault)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setForm((f) => ({ ...f, isDefault: checked }));
                        }}
                      />
                      Set as default
                    </label>
                    <Button type="submit" radius="md" loading={savingAddress} variant="default">
                      Save address
                    </Button>
                  </Stack>
                </form>
              ) : null}

              <form onSubmit={onSubmit}>
                <Stack mt="lg">
                  <Button
                    type="submit"
                    radius="xl"
                    loading={pending}
                    disabled={!cart.items.length || !selectedId}
                  >
                    Pay {formatInr(cart.subtotal + (cart.subtotal >= 199900 ? 0 : 9900))}
                  </Button>
                  {!selectedId ? (
                    <Text size="sm" c="dimmed">
                      Add and select an address to place your order.{' '}
                      <Link href="/account">Manage in account</Link>
                    </Text>
                  ) : null}
                  {error ? (
                    <Text c="red" size="sm">
                      {error}
                    </Text>
                  ) : null}
                </Stack>
              </form>
            </div>
            <aside className={classes.summary}>
              <Text fw={600}>{cart.itemCount} items</Text>
              <Text>Subtotal {formatInr(cart.subtotal)}</Text>
              <Text size="sm" c="dimmed">
                UPI / cards via Razorpay. Dev mode auto-captures without keys.
              </Text>
            </aside>
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
