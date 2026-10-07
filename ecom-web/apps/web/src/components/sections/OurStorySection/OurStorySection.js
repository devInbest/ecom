import {
  IconAward,
  IconBulb,
  IconHeart,
  IconWorld,
} from '@tabler/icons-react';
import Image from 'next/image';

import ourStoryImg from '@/assets/images/banners/ourStoryImg.jpg';

import classes from './OurStorySection.module.scss';

const VALUES = [
  { icon: IconBulb, label: 'Creative expression' },
  { icon: IconHeart, label: 'Inclusivity' },
  { icon: IconAward, label: 'High quality' },
  { icon: IconWorld, label: 'Sustainability' },
];

export default function OurStorySection() {
  return (
    <section className={classes.section} aria-labelledby="our-story-heading">
      <div className={classes.media}>
        <Image
          src={ourStoryImg}
          alt="NONSENSE models in denim streetwear"
          fill
          sizes="(max-width: 900px) 100vw, 50vw"
          className={classes.image}
          placeholder="blur"
        />
      </div>

      <div className={classes.content}>
        <div className={classes.copy}>
          <p className={classes.brand}>NONSENSE</p>
          <h2 id="our-story-heading" className={classes.title}>
            Our story
          </h2>
          <p className={classes.body}>
            NONSENSE isn&apos;t just a brand — it&apos;s a culture. Rooted in pop culture and
            individuality, we craft unisex streetwear that blends luxury with affordability. From
            bold online drops to everyday wear, we&apos;re building a community where fashion is
            fearless, inclusive, and unapologetically bold.
          </p>

          <ul className={classes.values}>
            {VALUES.map(({ icon: Icon, label }) => (
              <li key={label} className={classes.value}>
                <Icon className={classes.icon} size={28} stroke={1.25} aria-hidden="true" />
                <span className={classes.valueLabel}>{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
