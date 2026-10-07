'use client';

import { Button, Stack, Text, TextInput, Title } from '@mantine/core';
import Script from 'next/script';
import { useState } from 'react';

import env from '@/constants/env';
import { useAuth } from '@/providers/AuthProvider';
import { authApi } from '@/services/api';

import classes from './LoginForm.module.scss';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseIdentifier(raw) {
  const value = String(raw || '').trim();
  if (!value) {
    return { error: 'Enter your email or phone number' };
  }

  if (value.includes('@') || /[a-zA-Z]/.test(value)) {
    if (!EMAIL_RE.test(value)) {
      return { error: 'Enter a valid email address' };
    }
    return { type: 'email', value: value.toLowerCase() };
  }

  const compact = value.replace(/[^\d+]/g, '');
  let phone = compact;

  if (/^\d{10}$/.test(compact)) {
    phone = `+91${compact}`;
  } else if (/^91\d{10}$/.test(compact)) {
    phone = `+${compact}`;
  } else if (/^\+91\d{10}$/.test(compact)) {
    phone = compact;
  } else if (/^\+[1-9]\d{9,14}$/.test(compact)) {
    phone = compact;
  } else {
    return { error: 'Enter a valid 10-digit phone or +country code number' };
  }

  return { type: 'phone', value: phone };
}

function GoogleIcon({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={classes.googleIcon}
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export default function LoginForm({ onSuccess }) {
  const { loginWithSession } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('identifier');
  const [fieldError, setFieldError] = useState('');
  const [devCode, setDevCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function finish(session) {
    await loginWithSession(session);
    await onSuccess?.(session);
  }

  async function sendOtp(e) {
    e.preventDefault();
    setError('');
    const parsed = parseIdentifier(identifier);
    if (parsed.error) {
      setFieldError(parsed.error);
      return;
    }
    if (parsed.type === 'email') {
      setFieldError('Use Continue with Google to sign in with email');
      return;
    }

    setFieldError('');
    setLoading(true);
    try {
      const res = await authApi.sendOtp(parsed.value);
      setPhone(parsed.value);
      if (res.devCode) setDevCode(res.devCode);
      setStep('otp');
    } catch (err) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const session = await authApi.verifyOtp(phone, code);
      await finish(session);
    } catch (err) {
      setError(err.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  }

  async function googleSignIn() {
    setError('');
    setFieldError('');
    if (!env.googleClientId || !window.google?.accounts?.id) {
      setError(
        'Google sign-in needs NEXT_PUBLIC_GOOGLE_CLIENT_ID and the GIS script. Use phone OTP for now.',
      );
      return;
    }
    window.google.accounts.id.initialize({
      client_id: env.googleClientId,
      callback: async (response) => {
        try {
          const session = await authApi.google(response.credential);
          await finish(session);
        } catch (err) {
          setError(err.message || 'Google sign-in failed');
        }
      },
    });
    window.google.accounts.id.prompt();
  }

  return (
    <div className={classes.form}>
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />
      <Title order={2} className={classes.title}>
        Sign in
      </Title>

      {step === 'identifier' ? (
        <form onSubmit={sendOtp}>
          <Stack gap="md">
            <TextInput
              label="Email/phone"
              placeholder="Email or phone number"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.currentTarget.value);
                if (fieldError) setFieldError('');
              }}
              error={fieldError || undefined}
              required
              autoComplete="username"
            />
            <Button type="submit" loading={loading} radius="xl" fullWidth className={classes.submit}>
              Send OTP
            </Button>
          </Stack>
        </form>
      ) : (
        <form onSubmit={verifyOtp}>
          <Stack gap="md">
            <TextInput
              label="OTP"
              value={code}
              onChange={(e) => setCode(e.currentTarget.value)}
              required
              maxLength={6}
              inputMode="numeric"
              autoComplete="one-time-code"
            />
            {devCode ? (
              <Text size="sm" c="dimmed">
                Dev OTP: <strong>{devCode}</strong>
              </Text>
            ) : null}
            <Button type="submit" loading={loading} radius="xl" fullWidth className={classes.submit}>
              Verify & continue
            </Button>
            <Button
              variant="subtle"
              fullWidth
              onClick={() => {
                setStep('identifier');
                setCode('');
                setDevCode('');
                setError('');
              }}
            >
              Change email/phone
            </Button>
          </Stack>
        </form>
      )}

      <div className={classes.divider} role="separator" aria-label="or">
        <span>or</span>
      </div>

      <Button
        variant="default"
        radius="xl"
        fullWidth
        leftSection={<GoogleIcon />}
        className={classes.google}
        onClick={googleSignIn}
      >
        Continue with Google
      </Button>

      {error ? (
        <Text mt="md" c="red" size="sm">
          {error}
        </Text>
      ) : null}
    </div>
  );
}
