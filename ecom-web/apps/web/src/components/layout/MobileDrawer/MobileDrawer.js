'use client';

import { Burger, Button, Drawer, Stack } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconChevronDown } from '@tabler/icons-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import Logo from '@/components/common/Logo/Logo';
import ThemeToggle from '@/components/common/ThemeToggle/ThemeToggle';
import { useAuth } from '@/providers/AuthProvider';
import { useLoginModal } from '@/providers/LoginModalProvider';
import { pickCategoryTree, shopNavSections } from '@/constants/navigation';
import { catalogApi } from '@/services/api';

import classes from './MobileDrawer.module.scss';

function shopHref(gender, slug) {
  const base = `/shop/${gender}`;
  return slug ? `${base}?category=${encodeURIComponent(slug)}` : base;
}

export default function MobileDrawer() {
  const [opened, { toggle, close }] = useDisclosure(false);
  const { isAuthenticated, loading } = useAuth();
  const { openLogin } = useLoginModal();
  const [tree, setTree] = useState([]);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    if (!opened) return;
    catalogApi
      .categories()
      .then((data) => setTree(data.items || []))
      .catch(() => setTree([]));
  }, [opened]);

  const sections = shopNavSections.map((section) => ({
    ...section,
    categories: pickCategoryTree(tree, section.treeGender),
  }));

  return (
    <div className={classes.mobileOnly}>
      <Burger
        opened={opened}
        onClick={toggle}
        aria-label="Open navigation menu"
        className={classes.burger}
      />

      <Drawer
        opened={opened}
        onClose={close}
        title={<Logo />}
        padding="md"
        position="right"
        size="90%"
      >
        <Stack className={classes.drawerContent} gap="lg">
          <nav>
            <ul className={classes.navList}>
              {sections.map((section) => (
                <li key={section.key} className={classes.section}>
                  <div className={classes.sectionHead}>
                    <Link href={section.href} onClick={close} className={classes.navItem}>
                      {section.label}
                    </Link>
                    {section.categories.length ? (
                      <button
                        type="button"
                        className={classes.expandBtn}
                        aria-expanded={Boolean(expanded[section.key])}
                        onClick={() =>
                          setExpanded((prev) => ({
                            ...prev,
                            [section.key]: !prev[section.key],
                          }))
                        }
                      >
                        <IconChevronDown
                          size={18}
                          stroke={1.75}
                          className={expanded[section.key] ? classes.chevronOpen : undefined}
                        />
                      </button>
                    ) : null}
                  </div>
                  {expanded[section.key] ? (
                    <ul className={classes.subNav}>
                      {section.categories.map((root) => (
                        <li key={root.id}>
                          <Link
                            href={shopHref(section.gender, root.slug)}
                            onClick={close}
                            className={classes.subTitle}
                          >
                            {root.name}
                          </Link>
                          {(root.children || []).length ? (
                            <ul className={classes.leafNav}>
                              {root.children.map((child) => (
                                <li key={child.id}>
                                  <Link href={shopHref(section.gender, child.slug)} onClick={close}>
                                    {child.name}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          </nav>

          <div className={classes.actions}>
            <ThemeToggle />
            {loading ? null : isAuthenticated ? (
              <>
                <Button component={Link} href="/account" onClick={close} radius="xl">
                  Account
                </Button>
                <Button
                  component={Link}
                  href="/account/orders"
                  onClick={close}
                  radius="xl"
                  variant="default"
                >
                  Orders
                </Button>
                <Button
                  component={Link}
                  href="/track-order"
                  onClick={close}
                  radius="xl"
                  variant="default"
                >
                  Track order
                </Button>
              </>
            ) : (
              <Button
                radius="xl"
                onClick={() => {
                  close();
                  openLogin();
                }}
              >
                Login
              </Button>
            )}
            <Button component={Link} href="/wishlist" onClick={close} radius="xl" variant="default">
              Wishlist
            </Button>
            <Button component={Link} href="/cart" onClick={close} radius="xl" variant="default">
              Cart
            </Button>
          </div>
        </Stack>
      </Drawer>
    </div>
  );
}
