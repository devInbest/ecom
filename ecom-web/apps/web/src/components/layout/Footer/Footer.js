import { ActionIcon } from '@mantine/core';
import { IconBrandInstagram, IconBrandX } from '@tabler/icons-react';
import Link from 'next/link';

import Container from '@/components/common/Container/Container';
import Logo from '@/components/common/Logo/Logo';
import env from '@/constants/env';
import {
  footerInfoLinks,
  footerPolicyLinks,
  footerShopLinks,
} from '@/constants/navigation';
import { brand } from '@/constants/site';

import classes from './Footer.module.scss';

const socialLinks = [
  { href: 'https://instagram.com', label: 'Instagram', icon: IconBrandInstagram },
  { href: 'https://x.com', label: 'X', icon: IconBrandX },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className={classes.footer}>
      <Container className={classes.inner}>
        <div className={classes.brand}>
          <Logo />
          <p className={classes.contactLine}>
            <a href={`mailto:${brand.supportEmail}`}>{brand.supportEmail}</a>
          </p>
          <p className={classes.contactLine}>
            <a href={`tel:${brand.phone.replace(/\s/g, '')}`}>{brand.phone}</a>
          </p>
          <div className={classes.socialIcons}>
            {socialLinks.map(({ href, label, icon: Icon }) => (
              <ActionIcon
                key={label}
                component="a"
                href={href}
                target="_blank"
                rel="noreferrer"
                variant="subtle"
                size="lg"
                className={classes.socialIcon}
                aria-label={label}
              >
                <Icon size={18} />
              </ActionIcon>
            ))}
          </div>
        </div>

        <div className={classes.links}>
          <h3>Shop</h3>
          <ul>
            {footerShopLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div className={classes.links}>
          <h3>Company</h3>
          <ul>
            {footerInfoLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div className={classes.links}>
          <h3>Policies</h3>
          <ul>
            {footerPolicyLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </div>

      </Container>

      <div className={classes.brandStage}>
        <p className={classes.copyright}>
          {year} © {env.appName}
        </p>

        <p className={classes.megaBrand} aria-label={env.appName}>
          <span className={classes.megaWord}>{env.appName}</span>
          <span className={classes.megaDot} aria-hidden="true">
            .
          </span>
          <sup className={classes.tm} aria-hidden="true">
            TM
          </sup>
        </p>

        <div className={classes.ticker} aria-hidden="true">
          <div className={classes.tickerTrack}>
            {[0, 1].map((copy) => (
              <div key={copy} className={classes.tickerGroup}>
                {Array.from({ length: 12 }, (_, i) => (
                  <span key={i} className={classes.tickerItem}>
                    {env.appName}.
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
