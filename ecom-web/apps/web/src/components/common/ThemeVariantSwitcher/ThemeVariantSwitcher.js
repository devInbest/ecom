'use client';

import { Tooltip } from '@mantine/core';
import { IconPalette } from '@tabler/icons-react';

import { useThemeVariant } from '@/providers/MantineProvider';

import classes from './ThemeVariantSwitcher.module.scss';

export default function ThemeVariantSwitcher() {
  const { themeVariant, setThemeVariant, variants } = useThemeVariant();
  const activeVariant = variants.find((variant) => variant.value === themeVariant);
  const activeIndex = variants.findIndex((variant) => variant.value === themeVariant);

  const handleCycleVariant = () => {
    const nextIndex = activeIndex >= 0 ? (activeIndex + 1) % variants.length : 0;
    const nextVariant = variants[nextIndex];

    if (nextVariant) {
      setThemeVariant(nextVariant.value);
    }
  };

  return (
    <div className={classes.wrapper}>
      <Tooltip label="Click to cycle theme variant" withArrow>
        <button
          type="button"
          className={classes.badge}
          aria-label={`Active variant: ${activeVariant?.label || 'Vibrant'}. Click to switch variant.`}
          onClick={handleCycleVariant}
        >
          <IconPalette size={14} aria-hidden="true" />
          <span className={`${classes.swatch} ${classes[themeVariant]}`} aria-hidden="true" />
          {activeVariant?.label || 'Vibrant'}
        </button>
      </Tooltip>
    </div>
  );
}
