import Footer from '@/components/layout/Footer/Footer';
import Header from '@/components/layout/Header/Header';
import HomeStack from '@/components/home/HomeStack/HomeStack';
import FeaturedDropsSection from '@/components/sections/FeaturedDropsSection/FeaturedDropsSection';
import GenderShopSection from '@/components/sections/GenderShopSection/GenderShopSection';
import HeroSection from '@/components/sections/HeroSection/HeroSection';
import OurStorySection from '@/components/sections/OurStorySection/OurStorySection';
import { catalogApi } from '@/services/api';

async function getFeatured() {
  try {
    const data = await catalogApi.featured();
    return data.items || [];
  } catch {
    return [];
  }
}

export default async function Home() {
  const featured = await getFeatured();

  return (
    <>
      <Header />
      <main>
        <HomeStack>
          <HeroSection />
          <GenderShopSection />
          <FeaturedDropsSection products={featured} />
          <OurStorySection />
        </HomeStack>
      </main>
      <Footer />
    </>
  );
}
