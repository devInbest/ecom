'use client';

import { ActionIcon, useMantineColorScheme } from '@mantine/core';
import { useMounted } from '@mantine/hooks';
import { IconMoon, IconSun } from '@tabler/icons-react';

import classes from './ThemeToggle.module.scss';

export default function ThemeToggle({ className }) {
  const mounted = useMounted();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const isDark = mounted && colorScheme === 'dark';

  return (
    <ActionIcon
      variant="subtle"
      aria-label={mounted ? `Switch to ${isDark ? 'light' : 'dark'} mode` : 'Toggle color mode'}
      onClick={() => toggleColorScheme()}
      className={[classes.toggle, className].filter(Boolean).join(' ')}
    >
      {isDark ? <IconSun size={18} /> : <IconMoon size={18} />}
    </ActionIcon>
  );
}
