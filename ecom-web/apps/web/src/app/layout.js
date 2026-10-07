import '@mantine/core/styles.css';
import './globals.scss';

import { Fraunces, IBM_Plex_Mono, Source_Sans_3 } from 'next/font/google';

import env from '@/constants/env';
import { brand } from '@/constants/site';
import { AuthProvider } from '@/providers/AuthProvider';
import { CartProvider } from '@/providers/CartProvider';
import { LoginModalProvider } from '@/providers/LoginModalProvider';
import { WishlistProvider } from '@/providers/WishlistProvider';
import MantineProvider from '@/providers/MantineProvider';

const display = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const body = Source_Sans_3({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata = {
  title: `${env.appName} | ${brand.tagline}`,
  description: brand.description,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        <MantineProvider>
          <AuthProvider>
            <LoginModalProvider>
              <CartProvider>
                <WishlistProvider>{children}</WishlistProvider>
              </CartProvider>
            </LoginModalProvider>
          </AuthProvider>
        </MantineProvider>
      </body>
    </html>
  );
}
