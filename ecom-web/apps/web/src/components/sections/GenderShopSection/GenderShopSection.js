import Image from 'next/image';
import Link from 'next/link';

import menFashionModel1 from '@/assets/images/banners/menFashionModel-1.jpg';
import womenFashionModel1 from '@/assets/images/banners/womenFashionModel-1.jpg';

import classes from './GenderShopSection.module.scss';

const PANELS = [
  {
    href: '/shop/men',
    title: 'Shop mens',
    image: menFashionModel1,
    alt: 'Model in NONSENSE menswear',
  },
  {
    href: '/shop/women',
    title: 'Shop womens',
    image: womenFashionModel1,
    alt: 'Model in NONSENSE womenswear',
  },
];

export default function GenderShopSection() {
  return (
    <section className={classes.section} aria-label="Shop by gender">
      <div className={classes.grid}>
        {PANELS.map((panel) => (
          <div key={panel.href} className={classes.reveal}>
            <Link href={panel.href} className={classes.panel}>
              <Image
                src={panel.image}
                alt={panel.alt}
                fill
                sizes="(max-width: 900px) 100vw, 50vw"
                className={classes.image}
              />
              <div className={classes.veil} aria-hidden="true" />
              <div className={classes.copy}>
                <h2 className={classes.title}>{panel.title}</h2>
                <span className={classes.cta}>Explore</span>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
