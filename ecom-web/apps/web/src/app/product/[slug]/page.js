import Footer from '@/components/layout/Footer/Footer';
import Header from '@/components/layout/Header/Header';
import ProductDetail from '@/components/shop/ProductDetail/ProductDetail';
import { catalogApi } from '@/services/api';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  try {
    const product = await catalogApi.bySlug(slug);
    return { title: `${product.name} | NONSENSE` };
  } catch {
    return { title: 'Product | NONSENSE' };
  }
}

async function getRelated(product) {
  try {
    const data = await catalogApi.list({
      gender: product.gender,
      categorySlug: product.category?.slug || undefined,
      limit: 8,
    });
    return (data.items || []).filter((item) => item.id !== product.id).slice(0, 4);
  } catch {
    return [];
  }
}

export default async function ProductPage({ params }) {
  const { slug } = await params;
  let product = null;
  let related = [];
  try {
    product = await catalogApi.bySlug(slug);
    related = await getRelated(product);
  } catch {
    product = null;
  }

  return (
    <>
      <Header />
      <main>
        {product ? (
          <ProductDetail product={product} related={related} />
        ) : (
          <p style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>Product not found.</p>
        )}
      </main>
      <Footer />
    </>
  );
}
