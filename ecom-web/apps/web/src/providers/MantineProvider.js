'use client';

import {
  localStorageColorSchemeManager,
  MantineProvider as MantineCoreProvider,
} from '@mantine/core';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from 'react';

const THEME_KEY = 'ecom-app-color-scheme';
const THEME_VARIANT_KEY = 'ecom-app-theme-variant';
const THEME_VARIANT_EVENT = 'ecom-app-theme-variant-change';
const DEFAULT_THEME_VARIANT = 'vibrant';

const ORANGE_BRAND = [
  '#fff1eb',
  '#ffd8cc',
  '#ffb199',
  '#ff8666',
  '#ff6838',
  '#ff4f0f',
  '#e6430a',
  '#c73809',
  '#a32e08',
  '#7f2406',
];

const themeVariants = {
  vibrant: {
    label: 'Vibrant',
    brand: ORANGE_BRAND,
    accent: [
      '#e6fcff',
      '#c8f8ff',
      '#98f0ff',
      '#63e7ff',
      '#3ddfff',
      '#27d9ff',
      '#19d7ff',
      '#00bde6',
      '#00a8cd',
      '#0090b3',
    ],
  },
  ocean: {
    label: 'Ocean',
    brand: ORANGE_BRAND,
    accent: [
      '#e8fff9',
      '#cafeee',
      '#98fce0',
      '#61fbd1',
      '#37fbc5',
      '#1cfac0',
      '#0afabd',
      '#00dfa6',
      '#00c792',
      '#00ad7d',
    ],
  },
  sunset: {
    label: 'Sunset',
    brand: ORANGE_BRAND,
    accent: [
      '#fff0fa',
      '#ffd9f0',
      '#ffade0',
      '#ff7dcf',
      '#ff57c0',
      '#ff3db8',
      '#ff2fb4',
      '#e61a9f',
      '#cc0a8d',
      '#b30079',
    ],
  },
};

const ThemeVariantContext = createContext(null);

const getStoredThemeVariant = () => {
  if (typeof window === 'undefined') {
    return DEFAULT_THEME_VARIANT;
  }

  const storedVariant = window.localStorage.getItem(THEME_VARIANT_KEY);
  return storedVariant && themeVariants[storedVariant] ? storedVariant : DEFAULT_THEME_VARIANT;
};

const subscribeThemeVariant = (callback) => {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleChange = () => callback();

  window.addEventListener('storage', handleChange);
  window.addEventListener(THEME_VARIANT_EVENT, handleChange);

  return () => {
    window.removeEventListener('storage', handleChange);
    window.removeEventListener(THEME_VARIANT_EVENT, handleChange);
  };
};

export function useThemeVariant() {
  const context = useContext(ThemeVariantContext);

  if (!context) {
    throw new Error('useThemeVariant must be used within MantineProvider');
  }

  return context;
}

export default function MantineProvider({ children }) {
  const themeVariant = useSyncExternalStore(
    subscribeThemeVariant,
    getStoredThemeVariant,
    () => DEFAULT_THEME_VARIANT
  );

  const setThemeVariant = useCallback((nextVariant) => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!themeVariants[nextVariant]) {
      return;
    }

    window.localStorage.setItem(THEME_VARIANT_KEY, nextVariant);
    window.dispatchEvent(new Event(THEME_VARIANT_EVENT));
  }, []);

  const colorSchemeManager = useMemo(
    () =>
      localStorageColorSchemeManager({
        key: THEME_KEY,
      }),
    []
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme-variant', themeVariant);
  }, [themeVariant]);

  const theme = useMemo(() => {
    const selected = themeVariants[themeVariant] || themeVariants[DEFAULT_THEME_VARIANT];

    return {
      primaryColor: 'brand',
      defaultRadius: 'md',
      defaultGradient: {
        from: 'brand.7',
        to: 'accent.6',
        deg: 135,
      },
      breakpoints: {
        xs: '20em',
        sm: '30em',
        md: '48em',
        lg: '64em',
        xl: '90em',
      },
      colors: {
        brand: selected.brand,
        accent: selected.accent,
      },
      fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, sans-serif',
      headings: {
        fontFamily: 'Poppins, Inter, system-ui, sans-serif',
      },
    };
  }, [themeVariant]);

  const contextValue = useMemo(
    () => ({
      themeVariant,
      setThemeVariant,
      variants: Object.entries(themeVariants).map(([value, config]) => ({
        value,
        label: config.label,
      })),
    }),
    [themeVariant, setThemeVariant]
  );

  return (
    <ThemeVariantContext.Provider value={contextValue}>
      <MantineCoreProvider
        theme={theme}
        colorSchemeManager={colorSchemeManager}
        defaultColorScheme="light"
      >
        {children}
      </MantineCoreProvider>
    </ThemeVariantContext.Provider>
  );
}
