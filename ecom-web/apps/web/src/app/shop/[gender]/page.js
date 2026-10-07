import { Suspense } from 'react';

import Container from '@/components/common/Container/Container';
import Footer from '@/components/layout/Footer/Footer';
import Header from '@/components/layout/Header/Header';
import HeroSection from '@/components/sections/HeroSection/HeroSection';
import ProductCard from '@/components/shop/ProductCard/ProductCard';
import ShopCategoryFilters from '@/components/shop/ShopCategoryFilters/ShopCategoryFilters';
import ShopSort from '@/components/shop/ShopSort/ShopSort';
import { pickCategoryTree } from '@/constants/navigation';
import { catalogApi } from '@/services/api';

import classes from '../shop.module.scss';

const SORT_VALUES = new Set(['recommended', 'newest', 'price_low', 'price_high']);

const SHOP_SEGMENTS = {
  men: { label: 'Men', gender: 'MEN', showHero: true },
  women: { label: 'Women', gender: 'WOMEN', showHero: true },
  shoes: { label: 'Shoes', gender: null, showHero: false },
};

async function getCategories(gender) {
  try {
    const params = gender ? { gender: gender.toUpperCase() } : {};
    const data = await catalogApi.categories(params);
    return data.items || [];
  } catch {
    return [];
  }
}

async function getProducts(gender, categorySlug, sort) {
  try {
    return await catalogApi.list({
      gender: gender ? gender.toUpperCase() : undefined,
      categorySlug: categorySlug || undefined,
      sort,
      limit: 24,
    });
  } catch {
    return { items: [], total: 0 };
  }
}

function flattenSubcategories(tree) {
  const subs = [];
  for (const root of tree) {
    for (const child of root.children || []) {
      subs.push(child);
    }
  }
  return subs.length ? subs : tree;
}

export async function generateMetadata({ params }) {
  const { gender } = await params;
  const label = SHOP_SEGMENTS[gender]?.label || 'All';
  return { title: `${label} | NONSENSE` };
}

export default async function ShopPage({ params, searchParams }) {
  const { gender } = await params;
  const segment = SHOP_SEGMENTS[gender];
  const query = await searchParams;
  const normalized = segment?.gender || undefined;
  let categorySlug = typeof query.category === 'string' ? query.category : '';
  if (!categorySlug && typeof query.collection === 'string' && normalized) {
    categorySlug = `${gender}-${query.collection.toLowerCase()}`;
  }
  const sortParam = typeof query.sort === 'string' ? query.sort : 'recommended';
  const sort = SORT_VALUES.has(sortParam) ? sortParam : 'recommended';
  const [categoryTree, data] = await Promise.all([
    gender === 'shoes' ? getCategories().then((items) => pickCategoryTree(items, 'SHOES')) : getCategories(normalized),
    getProducts(normalized ? gender : undefined, categorySlug, sort),
  ]);
  const filters = flattenSubcategories(categoryTree);
  const title = segment?.label || 'All clothing';
  const showHero = Boolean(segment?.showHero);
  const catalogCopy = data.total
    ? `${data.total} item${data.total === 1 ? '' : 's'}${gender === 'shoes' ? '.' : ' — sizes XS–XXL.'}`
    : gender === 'shoes'
      ? 'Footwear catalog coming soon.'
      : 'Premium clothing — sizes XS–XXL.';
  const hrefFor = (slug) => {
    const base = `/shop/${gender}`;
    if (!slug) {
      const params = new URLSearchParams();
      if (sort !== 'recommended') params.set('sort', sort);
      const qs = params.toString();
      return qs ? `${base}?${qs}` : base;
    }
    const params = new URLSearchParams({ category: slug });
    if (sort !== 'recommended') params.set('sort', sort);
    return `${base}?${params.toString()}`;
  };

  const filterItems = [
    { href: hrefFor(''), label: 'All', slug: '' },
    ...filters.map((item) => ({
      href: hrefFor(item.slug),
      label: item.name,
      slug: item.slug,
    })),
  ];

  return (
    <>
      <Header />
      <main>
        {showHero ? <HeroSection variant={gender} /> : null}
        <section className={showHero ? classes.pageAfterHero : classes.page}>
          <Container>
            {showHero ? null : (
              <header className={classes.head}>
                <h1>{title}</h1>
                <p>{catalogCopy}</p>
              </header>
            )}
            <div className={classes.toolbar}>
              <ShopCategoryFilters items={filterItems} activeSlug={categorySlug} />
              {showHero ? (
                <Suspense fallback={null}>
                  <ShopSort />
                </Suspense>
              ) : null}
            </div>
            <div className={classes.grid}>
              {data.items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            {!data.items.length ? (
              <p className={classes.empty}>
                {categorySlug
                  ? 'No products in this category yet.'
                  : 'Catalog loading soon — start the API and seed the DB.'}
              </p>
            ) : null}
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
