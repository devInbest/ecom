'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef } from 'react';

import { useAuth } from '@/providers/AuthProvider';
import { useLoginModal } from '@/providers/LoginModalProvider';

function LoginRedirect() {
  const router = useRouter();
  const params = useSearchParams();
  const { isAuthenticated, loading } = useAuth();
  const { openLogin } = useLoginModal();
  const next = params.get('next') || '/';
  const started = useRef(false);

  useEffect(() => {
    if (loading || started.current) return;
    started.current = true;

    if (isAuthenticated) {
      router.replace(next);
      return;
    }

    openLogin({
      onSuccess: () => router.replace(next),
    });
    router.replace('/');
  }, [isAuthenticated, loading, next, openLogin, router]);

  return null;
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginRedirect />
    </Suspense>
  );
}
