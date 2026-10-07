'use client';

import { Modal } from '@mantine/core';
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

import LoginForm from '@/components/auth/LoginForm/LoginForm';

import classes from './LoginModal.module.scss';

const LoginModalContext = createContext(null);

export function LoginModalProvider({ children }) {
  const [opened, setOpened] = useState(false);
  const onSuccessRef = useRef(null);
  const sessionKeyRef = useRef(0);

  const closeLogin = useCallback(() => {
    setOpened(false);
    onSuccessRef.current = null;
  }, []);

  const openLogin = useCallback((opts = {}) => {
    onSuccessRef.current = opts.onSuccess || null;
    sessionKeyRef.current += 1;
    setOpened(true);
  }, []);

  async function handleSuccess(session) {
    const next = onSuccessRef.current;
    closeLogin();
    if (next) await next(session);
  }

  const value = useMemo(() => ({ openLogin, closeLogin }), [openLogin, closeLogin]);

  return (
    <LoginModalContext.Provider value={value}>
      {children}
      <Modal
        opened={opened}
        onClose={closeLogin}
        centered
        radius="lg"
        size="sm"
        title={null}
        withCloseButton
        closeButtonProps={{
          'aria-label': 'Close sign in',
          size: 'md',
        }}
        overlayProps={{ className: classes.overlay }}
        classNames={{
          content: classes.content,
          body: classes.body,
          header: classes.header,
          close: classes.close,
        }}
      >
        {opened ? (
          <LoginForm key={sessionKeyRef.current} onSuccess={handleSuccess} />
        ) : null}
      </Modal>
    </LoginModalContext.Provider>
  );
}

export function useLoginModal() {
  const ctx = useContext(LoginModalContext);
  if (!ctx) throw new Error('useLoginModal must be used within LoginModalProvider');
  return ctx;
}
