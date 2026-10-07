'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

import heroBanner1 from '@/assets/images/banners/heroBanner1.jpg';
import heroBanner2 from '@/assets/images/banners/heroBanner2.jpg';
import heroBanner3 from '@/assets/images/banners/heroBanner3.jpg';
import heroBanner4 from '@/assets/images/banners/heroBanner4.jpg';
import heroBanner5 from '@/assets/images/banners/heroBanner5.jpg';
import menBanner1 from '@/assets/images/banners/men/menBanner1.jpg';
import menBanner2 from '@/assets/images/banners/men/menBanner2.jpg';
import menBanner3 from '@/assets/images/banners/men/menBanner3.jpg';
import menBanner4 from '@/assets/images/banners/men/menBanner4.jpg';
import menBanner5 from '@/assets/images/banners/men/menBanner5.jpg';
import womenBanner1 from '@/assets/images/banners/women/womenBaneer1.jpg';
import womenBanner2 from '@/assets/images/banners/women/womenBaneer2.jpg';
import womenBanner3 from '@/assets/images/banners/women/womenBaneer3.jpg';
import womenBanner4 from '@/assets/images/banners/women/womenBaneer4.jpg';
import womenBanner5 from '@/assets/images/banners/women/womenBaneer5.jpg';

import classes from './HeroSection.module.scss';

const INTERVAL_MS = 5000;

const VARIANTS = {
  home: {
    label: 'NONSENSE hero banner',
    headline: 'Oversized graphics. Real weight.',
    portrait: false,
    slides: [
      { src: heroBanner1, alt: 'NONSENSE window display with graphic hoodies and neon lighting' },
      { src: heroBanner2, alt: 'NONSENSE seasonal edit on the shop rail' },
      { src: heroBanner3, alt: 'NONSENSE sale window with utility jumpsuits' },
      { src: heroBanner4, alt: 'NONSENSE streetwear mannequins in the store' },
      { src: heroBanner5, alt: 'NONSENSE new collection hanging in the shop window' },
    ],
  },
  men: {
    label: 'NONSENSE men banner',
    headline: 'Men',
    portrait: true,
    slides: [
      { src: menBanner1, alt: 'Man in an oversized NONSENSE tee outdoors' },
      { src: menBanner2, alt: 'NONSENSE menswear lookbook' },
      { src: menBanner3, alt: 'NONSENSE men graphic tee campaign' },
      { src: menBanner4, alt: 'NONSENSE men streetwear portrait' },
      { src: menBanner5, alt: 'NONSENSE men collection campaign' },
    ],
  },
  women: {
    label: 'NONSENSE women banner',
    headline: 'Women',
    portrait: true,
    slides: [
      { src: womenBanner1, alt: 'Woman in a NONSENSE summer look' },
      { src: womenBanner2, alt: 'NONSENSE womenswear lookbook' },
      { src: womenBanner3, alt: 'NONSENSE women graphic tee campaign' },
      { src: womenBanner4, alt: 'NONSENSE women streetwear portrait' },
      { src: womenBanner5, alt: 'NONSENSE women collection campaign' },
    ],
  },
};

export default function HeroSection({ variant = 'home', sub }) {
  const config = VARIANTS[variant] || VARIANTS.home;
  const slides = config.slides;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduceMotion = useRef(false);

  useEffect(() => {
    reduceMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    setIndex(0);
  }, [variant]);

  useEffect(() => {
    if (paused || reduceMotion.current || slides.length < 2) return undefined;

    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, INTERVAL_MS);

    return () => window.clearInterval(id);
  }, [paused, index, slides.length]);

  return (
    <section
      className={`${classes.hero} ${config.portrait ? classes.portrait : ''}`.trim()}
      aria-label={config.label}
      aria-roledescription="carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className={classes.visual}>
        {slides.map((slide, slideIndex) => (
          <div
            key={slide.alt}
            className={`${classes.slide} ${slideIndex === index ? classes.slideActive : ''}`}
            aria-hidden={slideIndex !== index}
          >
            <Image
              src={slide.src}
              alt=""
              fill
              priority={slideIndex === 0}
              sizes="100vw"
              className={classes.imageCover}
            />
            <div className={classes.glass} aria-hidden="true" />
            <div className={classes.containWrap}>
              <Image
                src={slide.src}
                alt={slide.alt}
                fill
                priority={slideIndex === 0}
                sizes="(max-width: 1400px) 100vw, 1400px"
                className={classes.imageContain}
              />
            </div>
          </div>
        ))}
        <div className={classes.veil} aria-hidden="true" />
      </div>

      <div className={classes.content}>
        <p className={classes.brand}>NONSENSE</p>
        <h1 className={classes.headline}>{config.headline}</h1>
        {sub || config.sub ? <p className={classes.sub}>{sub || config.sub}</p> : null}
      </div>
    </section>
  );
}
