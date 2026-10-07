'use client';

import { Button, Textarea, TextInput } from '@mantine/core';
import { useState } from 'react';

import InfoPage, { InfoCallout, InfoCard, InfoGrid, InfoSection } from '@/components/layout/InfoPage/InfoPage';
import { brand } from '@/constants/site';

import classes from './contact.module.scss';

export default function ContactPage() {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    orderNumber: '',
    message: '',
  });

  function setField(key) {
    return (e) => {
      const value = e?.currentTarget?.value ?? e ?? '';
      setForm((f) => ({ ...f, [key]: value }));
    };
  }

  async function onSubmit(e) {
    e.preventDefault();
    setPending(true);
    // Client-side mailto handoff keeps support zero-infra for now.
    const body = [
      `Name: ${form.name}`,
      `Email: ${form.email}`,
      `Phone: ${form.phone || '—'}`,
      `Order: ${form.orderNumber || '—'}`,
      '',
      form.message,
    ].join('\n');
    window.location.href = `mailto:${brand.supportEmail}?subject=${encodeURIComponent(
      `NONSENSE support — ${form.name}`,
    )}&body=${encodeURIComponent(body)}`;
    setSent(true);
    setPending(false);
  }

  return (
    <InfoPage
      title="Contact Us"
      lead="Order help, sizing questions, or press — write us and we respond within one business day during studio hours."
    >
      <InfoSection title="Reach the studio">
        <InfoGrid>
          <InfoCard meta="Email" title="Support">
            <p>
              <a href={`mailto:${brand.supportEmail}`}>{brand.supportEmail}</a>
            </p>
          </InfoCard>
          <InfoCard meta="Phone" title="Call / WhatsApp">
            <p>
              <a href={`tel:${brand.phone.replace(/\s/g, '')}`}>{brand.phone}</a>
              <br />
              {brand.hours}
            </p>
          </InfoCard>
          <InfoCard meta="Visit" title="Atelier">
            <p>
              {brand.address.line1}
              <br />
              {brand.address.line2}
              <br />
              {brand.address.city}, {brand.address.state} {brand.address.postalCode}
            </p>
          </InfoCard>
          <InfoCard meta="Escalation" title="Grievance officer">
            <p>
              {brand.grievance.name}
              <br />
              <a href={`mailto:${brand.grievance.email}`}>{brand.grievance.email}</a>
              <br />
              Response SLA: {brand.grievance.responseSla}
            </p>
          </InfoCard>
        </InfoGrid>
      </InfoSection>

      <InfoSection title="Send a message">
        <InfoCallout>
          <p>
            For faster order help, include your order number from the confirmation email. You can also{' '}
            <a href="/track-order">track an order</a> if you are signed in.
          </p>
        </InfoCallout>

        <form className={classes.form} onSubmit={onSubmit}>
          <div className={classes.row}>
            <TextInput
              label="Name"
              required
              value={form.name}
              onChange={setField('name')}
              radius="md"
            />
            <TextInput
              label="Email"
              type="email"
              required
              value={form.email}
              onChange={setField('email')}
              radius="md"
            />
          </div>
          <div className={classes.row}>
            <TextInput
              label="Phone"
              value={form.phone}
              onChange={setField('phone')}
              placeholder="+91"
              radius="md"
            />
            <TextInput
              label="Order number"
              value={form.orderNumber}
              onChange={setField('orderNumber')}
              placeholder="Optional"
              radius="md"
            />
          </div>
          <Textarea
            label="Message"
            required
            minRows={4}
            value={form.message}
            onChange={setField('message')}
            radius="md"
          />
          <Button type="submit" radius="xl" loading={pending} className={classes.submit}>
            Email support
          </Button>
          {sent ? (
            <p className={classes.hint}>Opening your mail app… if nothing opens, write us at {brand.supportEmail}.</p>
          ) : null}
        </form>
      </InfoSection>
    </InfoPage>
  );
}
