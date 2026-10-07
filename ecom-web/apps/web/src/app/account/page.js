'use client';

import { Button, Checkbox, Modal, Select, TextInput } from '@mantine/core';
import {
  IconBriefcase,
  IconHome,
  IconMapPin,
  IconPencil,
  IconPlus,
  IconStar,
  IconTrash,
  IconUser,
} from '@tabler/icons-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import Reveal from '@/components/account/Reveal';
import { useAuth } from '@/providers/AuthProvider';
import { useLoginModal } from '@/providers/LoginModalProvider';
import { authApi, orderApi } from '@/services/api';
import { formatInr } from '@/utils/money';
import { formatOrderDate, initials, statusLabel } from '@/utils/orders';

import classes from './account.module.scss';

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
  isDefault: false,
};

const CATEGORY_META = {
  HOME: { label: 'Home', Icon: IconHome, tone: 'home' },
  WORK: { label: 'Work', Icon: IconBriefcase, tone: 'work' },
  OTHER: { label: 'Other', Icon: IconMapPin, tone: 'other' },
};

const CATEGORY_ORDER = ['HOME', 'WORK', 'OTHER'];

function formatLines(address) {
  return [address.line1, address.line2, `${address.city}, ${address.state} ${address.postalCode}`]
    .filter(Boolean)
    .join('\n');
}

function CategoryIcon({ category, size = 22 }) {
  const meta = CATEGORY_META[category] || CATEGORY_META.OTHER;
  const Icon = meta.Icon;
  return (
    <span className={`${classes.icon3d} ${classes[`tone_${meta.tone}`]}`} aria-hidden="true">
      <span className={classes.icon3dFace}>
        <Icon size={size} stroke={1.6} />
      </span>
      <span className={classes.icon3dShadow} />
    </span>
  );
}

export default function AccountPage() {
  const router = useRouter();
  const { user, loading, isAuthenticated, logout, applyUser } = useAuth();
  const { openLogin } = useLoginModal();
  const [profile, setProfile] = useState({ name: '', email: '' });
  const [profileOpen, setProfileOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ ok: '', err: '' });

  const [addressOpen, setAddressOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addressDraft, setAddressDraft] = useState(EMPTY_ADDRESS);
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressMsg, setAddressMsg] = useState({ ok: '', err: '' });
  const [busyAddressId, setBusyAddressId] = useState('');
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      openLogin({
        onSuccess: () => router.replace('/account'),
      });
      router.replace('/');
    }
  }, [loading, isAuthenticated, openLogin, router]);

  useEffect(() => {
    if (!user) return;
    setProfile({
      name: user.name || '',
      email: user.email || '',
    });
  }, [user]);

  useEffect(() => {
    if (!isAuthenticated) return;
    orderApi
      .list()
      .then((list) => setOrders(Array.isArray(list) ? list.slice(0, 3) : []))
      .catch(() => setOrders([]));
  }, [isAuthenticated]);

  const memberSince = useMemo(() => {
    if (!user?.createdAt) return null;
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      month: 'long',
      year: 'numeric',
    }).format(new Date(user.createdAt));
  }, [user]);

  const addresses = user?.addresses || [];
  const groupedAddresses = useMemo(() => {
    return CATEGORY_ORDER.map((category) => ({
      category,
      ...CATEGORY_META[category],
      items: addresses.filter((address) => (address.category || 'HOME') === category),
    })).filter((group) => group.items.length > 0);
  }, [addresses]);

  function setProfileField(key) {
    return (e) => setProfile((f) => ({ ...f, [key]: e.currentTarget.value }));
  }

  function setAddressField(key) {
    return (e) => {
      const value = e?.currentTarget?.value ?? e ?? '';
      setAddressDraft((f) => ({ ...f, [key]: value }));
    };
  }

  function openEditProfile() {
    setProfile({
      name: user.name || '',
      email: user.email || '',
    });
    setProfileMsg({ ok: '', err: '' });
    setProfileOpen(true);
  }

  function closeProfileModal() {
    setProfileOpen(false);
    setProfileMsg({ ok: '', err: '' });
  }

  async function saveProfile(e) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg({ ok: '', err: '' });
    try {
      const next = await authApi.update({
        name: profile.name.trim(),
        email: profile.email.trim(),
      });
      applyUser(next);
      setProfileOpen(false);
      setProfileMsg({ ok: 'Profile saved.', err: '' });
    } catch (err) {
      setProfileMsg({ ok: '', err: err.message || 'Could not save profile.' });
    } finally {
      setSavingProfile(false);
    }
  }

  function startAddAddress() {
    setEditingAddressId(null);
    setAddressDraft({
      ...EMPTY_ADDRESS,
      fullName: user.name || '',
      phone: user.phone || '+91',
      isDefault: addresses.length === 0,
    });
    setAddressMsg({ ok: '', err: '' });
    setAddressOpen(true);
  }

  function startEditAddress(address) {
    setEditingAddressId(address.id);
    setAddressDraft({
      fullName: address.fullName || '',
      phone: address.phone || '+91',
      line1: address.line1 || '',
      line2: address.line2 || '',
      city: address.city || '',
      state: address.state || '',
      postalCode: address.postalCode || '',
      country: address.country || 'IN',
      category: address.category || 'HOME',
      isDefault: Boolean(address.isDefault),
    });
    setAddressMsg({ ok: '', err: '' });
    setAddressOpen(true);
  }

  function closeAddressModal() {
    setAddressOpen(false);
    setEditingAddressId(null);
    setAddressDraft(EMPTY_ADDRESS);
    setAddressMsg({ ok: '', err: '' });
  }

  async function saveAddress(e) {
    e.preventDefault();
    setSavingAddress(true);
    setAddressMsg({ ok: '', err: '' });
    const payload = {
      fullName: addressDraft.fullName.trim(),
      phone: addressDraft.phone.trim(),
      line1: addressDraft.line1.trim(),
      line2: addressDraft.line2.trim() || undefined,
      city: addressDraft.city.trim(),
      state: addressDraft.state.trim(),
      postalCode: addressDraft.postalCode.trim(),
      country: addressDraft.country.trim() || 'IN',
      category: addressDraft.category || 'HOME',
      isDefault: Boolean(addressDraft.isDefault),
    };

    try {
      const next = editingAddressId
        ? await authApi.updateAddress(editingAddressId, payload)
        : await authApi.addAddress(payload);
      applyUser(next);
      closeAddressModal();
    } catch (err) {
      setAddressMsg({ ok: '', err: err.message || 'Could not save address.' });
    } finally {
      setSavingAddress(false);
    }
  }

  async function removeAddress(addressId) {
    if (!window.confirm('Delete this address?')) return;
    setBusyAddressId(addressId);
    setAddressMsg({ ok: '', err: '' });
    try {
      const next = await authApi.deleteAddress(addressId);
      applyUser(next);
      if (editingAddressId === addressId) closeAddressModal();
    } catch (err) {
      setAddressMsg({ ok: '', err: err.message || 'Could not delete address.' });
    } finally {
      setBusyAddressId('');
    }
  }

  async function makeDefault(addressId) {
    setBusyAddressId(addressId);
    setAddressMsg({ ok: '', err: '' });
    try {
      const next = await authApi.setDefaultAddress(addressId);
      applyUser(next);
    } catch (err) {
      setAddressMsg({ ok: '', err: err.message || 'Could not update default.' });
    } finally {
      setBusyAddressId('');
    }
  }

  if (!user) {
    return <p className={classes.loading}>Loading…</p>;
  }

  return (
    <>
      <div className={classes.layout}>
        <div className={classes.mainCol}>
          <Reveal as="section" className={classes.section}>
            <div className={classes.sectionTop}>
              <div className={classes.sectionHeading}>
                <span className={`${classes.icon3d} ${classes.tone_profile}`} aria-hidden="true">
                  <span className={classes.icon3dFace}>
                    <IconUser size={22} stroke={1.6} />
                  </span>
                  <span className={classes.icon3dShadow} />
                </span>
                <div>
                  <h2 className={classes.sectionTitle}>Your details</h2>
                  <p className={classes.sectionLead}>How we know you across drops and orders.</p>
                </div>
              </div>
              <button type="button" className={classes.iconBtn} onClick={openEditProfile} aria-label="Edit details">
                <IconPencil size={18} stroke={1.75} />
              </button>
            </div>

            <div className={classes.identity}>
              <div className={classes.avatar} aria-hidden="true">
                {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : initials(user.name)}
              </div>
              <div className={classes.who}>
                <strong>{user.name || 'NONSENSE member'}</strong>
                <p>{user.email || user.phone || 'Signed in'}</p>
              </div>
            </div>

            <dl className={classes.metaGrid}>
              <div className={classes.metaItem}>
                <dt>Phone</dt>
                <dd>{user.phone || 'Not linked'}</dd>
              </div>
              <div className={classes.metaItem}>
                <dt>Email</dt>
                <dd>{user.email || 'Add an email'}</dd>
              </div>
              <div className={classes.metaItem}>
                <dt>Member since</dt>
                <dd>{memberSince || '—'}</dd>
              </div>
              <div className={classes.metaItem}>
                <dt>Account</dt>
                <dd>{user.role === 'ADMIN' ? 'Admin' : 'Customer'}</dd>
              </div>
            </dl>

            {profileMsg.ok ? <p className={classes.statusOk}>{profileMsg.ok}</p> : null}
          </Reveal>

          <Reveal as="section" className={classes.section} delay={80}>
            <div className={classes.sectionTop}>
              <div className={classes.sectionHeading}>
                <CategoryIcon category="HOME" />
                <div>
                  <h2 className={classes.sectionTitle}>Addresses</h2>
                  <p className={classes.sectionLead}>Home, work, and other places we can ship to.</p>
                </div>
              </div>
              <button type="button" className={classes.addBtn} onClick={startAddAddress}>
                <IconPlus size={16} stroke={2} />
                Add
              </button>
            </div>

            {addressMsg.err ? <p className={classes.statusErr}>{addressMsg.err}</p> : null}

            {!addresses.length ? (
              <p className={classes.empty}>No saved addresses yet. Add one before your next order.</p>
            ) : null}

            <div className={classes.addressGroups}>
              {groupedAddresses.map(({ category, label, items }, groupIndex) => (
                <Reveal key={category} className={classes.addressGroup} delay={100 + groupIndex * 60}>
                  <h3 className={classes.groupTitle}>
                    <CategoryIcon category={category} size={18} />
                    {label}
                  </h3>
                  <div className={classes.addressList}>
                    {items.map((address, index) => (
                      <article
                        key={address.id}
                        className={`${classes.addressCard} ${address.isDefault ? classes.addressDefault : ''}`}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className={classes.addressBody}>
                          <div className={classes.addressHead}>
                            <strong>{address.fullName}</strong>
                            {address.isDefault ? (
                              <span className={classes.defaultBadge}>
                                <IconStar size={11} stroke={2} />
                                Default
                              </span>
                            ) : null}
                          </div>
                          <p className={classes.addressLines}>{formatLines(address)}</p>
                          <p className={classes.addressPhone}>{address.phone}</p>
                        </div>
                        <div className={classes.addressActions}>
                          <button
                            type="button"
                            className={classes.iconBtn}
                            aria-label="Edit address"
                            onClick={() => startEditAddress(address)}
                          >
                            <IconPencil size={16} stroke={1.75} />
                          </button>
                          <button
                            type="button"
                            className={classes.iconBtn}
                            aria-label="Delete address"
                            disabled={busyAddressId === address.id}
                            onClick={() => removeAddress(address.id)}
                          >
                            <IconTrash size={16} stroke={1.75} />
                          </button>
                          {!address.isDefault ? (
                            <button
                              type="button"
                              className={classes.textBtn}
                              disabled={busyAddressId === address.id}
                              onClick={() => makeDefault(address.id)}
                            >
                              {busyAddressId === address.id ? 'Saving…' : 'Make default'}
                            </button>
                          ) : null}
                        </div>
                      </article>
                    ))}
                  </div>
                </Reveal>
              ))}
            </div>
          </Reveal>
        </div>

        <aside className={classes.sideCol}>
          <Reveal className={classes.sidePanel} delay={60}>
            <div className={classes.sideHead}>
              <h2 className={classes.sideTitle}>Recent orders</h2>
              <Link href="/account/orders" className={classes.sectionLink}>
                View all
              </Link>
            </div>
            {orders.length ? (
              <div className={classes.orderPeek}>
                {orders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/track-order?order=${encodeURIComponent(order.orderNumber)}`}
                    className={classes.orderPeekRow}
                  >
                    <strong>{order.orderNumber}</strong>
                    <span>
                      {statusLabel(order.status)} · {formatInr(order.total)} ·{' '}
                      {formatOrderDate(order.createdAt)}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className={classes.empty}>No orders yet.</p>
            )}
          </Reveal>

          <Reveal className={classes.sidePanel} delay={120}>
            <h2 className={classes.sideTitle}>Quick links</h2>
            <div className={classes.quickLinks}>
              <Link href="/account/orders">Orders</Link>
              <Link href="/track-order">Track a parcel</Link>
              <Link href="/shop">Continue shopping</Link>
              <button
                type="button"
                onClick={() => {
                  logout();
                  router.push('/');
                }}
              >
                Sign out
              </button>
            </div>
          </Reveal>
        </aside>
      </div>

      <Modal
        opened={profileOpen}
        onClose={closeProfileModal}
        centered
        radius="lg"
        size="md"
        title="Edit details"
        withCloseButton
        closeButtonProps={{ 'aria-label': 'Close edit details', size: 'md' }}
        overlayProps={{ className: classes.modalOverlay }}
        classNames={{
          content: classes.modalContent,
          header: classes.modalHeader,
          title: classes.modalTitle,
          body: classes.modalBody,
          close: classes.modalClose,
        }}
      >
        <form className={classes.modalForm} onSubmit={saveProfile}>
          <TextInput
            label="Display name"
            value={profile.name}
            onChange={setProfileField('name')}
            required
            radius="md"
          />
          <TextInput
            label="Email"
            type="email"
            description="Optional — used for order updates."
            value={profile.email}
            onChange={setProfileField('email')}
            radius="md"
          />
          <p className={classes.hint}>Phone is verified at sign-in and cannot be changed here.</p>
          {profileMsg.err ? <p className={classes.statusErr}>{profileMsg.err}</p> : null}
          <div className={classes.actions}>
            <Button type="submit" radius="md" loading={savingProfile}>
              Save details
            </Button>
            <Button type="button" variant="default" radius="md" onClick={closeProfileModal}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        opened={addressOpen}
        onClose={closeAddressModal}
        centered
        radius="lg"
        size="lg"
        title={editingAddressId ? 'Edit address' : 'Add address'}
        withCloseButton
        closeButtonProps={{ 'aria-label': 'Close address form', size: 'md' }}
        overlayProps={{ className: classes.modalOverlay }}
        classNames={{
          content: classes.modalContent,
          header: classes.modalHeader,
          title: classes.modalTitle,
          body: classes.modalBody,
          close: classes.modalClose,
        }}
      >
        <form className={classes.modalForm} onSubmit={saveAddress}>
          <div className={classes.formRow}>
            <Select
              label="Category"
              data={[
                { value: 'HOME', label: 'Home' },
                { value: 'WORK', label: 'Work' },
                { value: 'OTHER', label: 'Other' },
              ]}
              value={addressDraft.category}
              onChange={(value) => setAddressDraft((f) => ({ ...f, category: value || 'HOME' }))}
              radius="md"
              allowDeselect={false}
            />
            <Checkbox
              className={classes.defaultCheck}
              label="Set as default shipping address"
              checked={Boolean(addressDraft.isDefault)}
              onChange={(e) => {
                const checked = e.target.checked;
                setAddressDraft((f) => ({ ...f, isDefault: checked }));
              }}
            />
          </div>
          <div className={classes.formRow}>
            <TextInput
              label="Full name"
              value={addressDraft.fullName}
              onChange={setAddressField('fullName')}
              required
              radius="md"
            />
            <TextInput
              label="Phone"
              description="E.164, e.g. +919876543210"
              value={addressDraft.phone}
              onChange={setAddressField('phone')}
              required
              radius="md"
            />
          </div>
          <TextInput
            label="Address line 1"
            value={addressDraft.line1}
            onChange={setAddressField('line1')}
            required
            radius="md"
          />
          <TextInput
            label="Address line 2"
            value={addressDraft.line2}
            onChange={setAddressField('line2')}
            radius="md"
          />
          <div className={classes.formRow}>
            <TextInput
              label="City"
              value={addressDraft.city}
              onChange={setAddressField('city')}
              required
              radius="md"
            />
            <TextInput
              label="State"
              value={addressDraft.state}
              onChange={setAddressField('state')}
              required
              radius="md"
            />
          </div>
          <div className={classes.formRow}>
            <TextInput
              label="Postal code"
              value={addressDraft.postalCode}
              onChange={setAddressField('postalCode')}
              required
              radius="md"
            />
            <TextInput
              label="Country"
              value={addressDraft.country}
              onChange={setAddressField('country')}
              required
              radius="md"
            />
          </div>
          {addressMsg.err ? <p className={classes.statusErr}>{addressMsg.err}</p> : null}
          <div className={classes.actions}>
            <Button type="submit" radius="md" loading={savingAddress}>
              {editingAddressId ? 'Save address' : 'Add address'}
            </Button>
            <Button type="button" variant="default" radius="md" onClick={closeAddressModal}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
