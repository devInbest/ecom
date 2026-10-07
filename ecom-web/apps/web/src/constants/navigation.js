export const shopNavSections = [
  { key: 'men', label: 'Men', href: '/shop/men', gender: 'men', treeGender: 'MEN' },
  { key: 'women', label: 'Women', href: '/shop/women', gender: 'women', treeGender: 'WOMEN' },
  { key: 'shoes', label: 'Shoes', href: '/shop/shoes', gender: 'shoes', treeGender: 'SHOES' },
];

export function pickCategoryTree(tree, treeGender) {
  if (treeGender === 'SHOES') {
    return (tree || []).filter(
      (node) => node.slug === 'shoes' || node.slug?.startsWith('shoes-'),
    );
  }

  return (tree || []).filter((node) => !node.gender || node.gender === treeGender);
}

export const navLinks = shopNavSections.map(({ label, href }) => ({ label, href }));

export const footerShopLinks = [
  ...navLinks,
  { label: 'Account', href: '/account' },
  { label: 'Orders', href: '/account/orders' },
];

export const footerInfoLinks = [
  { label: 'About Us', href: '/about' },
  { label: 'Contact Us', href: '/contact' },
  { label: 'Track Order', href: '/track-order' },
];

export const footerPolicyLinks = [
  { label: 'Privacy Policy', href: '/privacy-policy' },
  { label: 'Terms & Condition', href: '/terms' },
  { label: 'Return & Refund Policy', href: '/returns' },
  { label: 'Shipping Policy', href: '/shipping' },
];

/** @deprecated use footerShopLinks */
export const quickLinks = footerShopLinks;
