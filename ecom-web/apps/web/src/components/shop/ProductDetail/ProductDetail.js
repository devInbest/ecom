'use client';

import { Accordion, Modal } from '@mantine/core';
import { IconMinus, IconPlus, IconRuler2, IconX } from '@tabler/icons-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

import Container from '@/components/common/Container/Container';
import ProductCard from '@/components/shop/ProductCard/ProductCard';
import WishlistButton from '@/components/shop/WishlistButton/WishlistButton';
import { brand } from '@/constants/site';
import { useAuth } from '@/providers/AuthProvider';
import { useCart } from '@/providers/CartProvider';
import { useLoginModal } from '@/providers/LoginModalProvider';
import { formatInr, formatInrDetail } from '@/utils/money';

import classes from './ProductDetail.module.scss';

const COLOR_SWATCH = {
  Black: '#111111',
  White: '#f5f5f4',
  Pink: '#f9a8d4',
  Red: '#b91c1c',
  Navy: '#1e3a5f',
  Olive: '#4d5c3a',
  Yellow: '#eab308',
  Mustard: '#ca8a04',
  Cream: '#f5efe6',
  Graphite: '#3f3f46',
  Charcoal: '#3f3f46',
  Lime: '#84cc16',
  Blue: '#1d4ed8',
  Green: '#166534',
  Periwinkle: '#818cf8',
};

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

const SIZE_CHART = [
  { size: 'XS', chest: '38–40', length: '26', shoulder: '19' },
  { size: 'S', chest: '40–42', length: '27', shoulder: '20' },
  { size: 'M', chest: '42–44', length: '28', shoulder: '21' },
  { size: 'L', chest: '44–46', length: '29', shoulder: '22' },
  { size: 'XL', chest: '46–48', length: '30', shoulder: '23' },
  { size: 'XXL', chest: '48–50', length: '31', shoulder: '24' },
];

function buildGalleryRows(images) {
  const list = images.length ? images : [null];
  const rows = [];
  let i = 0;

  if (list.length > 0) {
    rows.push({ type: 'full', items: [list[0]] });
    i = 1;
  }

  let nextPair = true;
  while (i < list.length) {
    if (nextPair) {
      if (i + 1 < list.length) {
        rows.push({ type: 'pair', items: [list[i], list[i + 1]] });
        i += 2;
      } else {
        rows.push({ type: 'full', items: [list[i]] });
        i += 1;
      }
      nextPair = false;
    } else {
      rows.push({ type: 'full', items: [list[i]] });
      i += 1;
      nextPair = true;
    }
  }

  return rows;
}

function AccordionToggleIcon() {
  return (
    <span className={classes.accToggle} aria-hidden="true">
      <IconPlus className={classes.accPlus} size={16} stroke={1.75} />
      <IconMinus className={classes.accMinus} size={16} stroke={1.75} />
    </span>
  );
}

function firstAvailableSize(variants) {
  return (
    SIZE_ORDER.find((sizeLabel) => {
      const variant = variants.find((v) => v.size === sizeLabel);
      return variant && variant.stock > 0;
    }) ||
    variants[0]?.size ||
    ''
  );
}

export default function ProductDetail({ product, related = [] }) {
  const { isAuthenticated } = useAuth();
  const { openLogin } = useLoginModal();
  const { addItem } = useCart();
  const colors = useMemo(
    () => [...new Set(product.variants.map((v) => v.color))],
    [product.variants],
  );
  const [color, setColor] = useState(colors[0] || '');
  const sizesForColor = product.variants.filter((v) => v.color === color);
  const sizeOptions = useMemo(
    () =>
      SIZE_ORDER.map((sizeLabel) => ({
        size: sizeLabel,
        variant: sizesForColor.find((v) => v.size === sizeLabel),
      })),
    [sizesForColor],
  );
  const [size, setSize] = useState(() => firstAvailableSize(sizesForColor));
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [sizeChartOpen, setSizeChartOpen] = useState(false);
  const [stickyVisible, setStickyVisible] = useState(false);
  const [stickyDismissed, setStickyDismissed] = useState(false);
  const layoutRef = useRef(null);
  const galleryRef = useRef(null);
  const relatedRef = useRef(null);

  const variant = product.variants.find((v) => v.color === color && v.size === size);
  const price = variant?.price ?? product.basePrice;
  const compareAt = product.compareAt;
  const discountPercent =
    compareAt && compareAt > price ? Math.round(((compareAt - price) / compareAt) * 100) : null;
  const images = product.images?.length ? product.images : [];
  const galleryRows = useMemo(() => buildGalleryRows(images), [images]);

  useEffect(() => {
    const layout = layoutRef.current;
    const gallery = galleryRef.current;
    if (!layout || !gallery) return;

    const desktopQuery = window.matchMedia('(min-width: 1024px)');

    const syncLayoutHeight = () => {
      if (!desktopQuery.matches) {
        layout.style.minHeight = '';
        return;
      }

      layout.style.minHeight = `${gallery.offsetHeight}px`;
    };

    syncLayoutHeight();

    const resizeObserver = new ResizeObserver(syncLayoutHeight);
    resizeObserver.observe(gallery);

    window.addEventListener('resize', syncLayoutHeight);
    desktopQuery.addEventListener('change', syncLayoutHeight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', syncLayoutHeight);
      desktopQuery.removeEventListener('change', syncLayoutHeight);
    };
  }, [galleryRows, product.id]);

  useEffect(() => {
    setStickyDismissed(false);
  }, [product.id]);

  useEffect(() => {
    const related = relatedRef.current;
    if (!related) {
      setStickyVisible(false);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setStickyVisible(entry.isIntersecting);
      },
      {
        threshold: 0.08,
        rootMargin: '0px 0px -8% 0px',
      },
    );

    observer.observe(related);

    return () => observer.disconnect();
  }, [related.length, product.id]);

  async function onAdd() {
    if (!isAuthenticated) {
      openLogin({
        onSuccess: async () => {
          if (!variant) return;
          setPending(true);
          setMessage('');
          try {
            await addItem(variant.id, 1, { notify: false });
            setMessage('Added Successfully');
          } catch (err) {
            setMessage(err.message || 'Could not add to bag');
          } finally {
            setPending(false);
          }
        },
      });
      return;
    }
    if (!variant) return;
    setPending(true);
    setMessage('');
    try {
      await addItem(variant.id, 1, { notify: false });
      setMessage('Added Successfully');
    } catch (err) {
      setMessage(err.message || 'Could not add to bag');
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div className={classes.layout} ref={layoutRef}>
        <div className={classes.galleryColumn} ref={galleryRef}>
          {galleryRows.map((row, rowIndex) => {
            let imageIndex = galleryRows
              .slice(0, rowIndex)
              .reduce((count, item) => count + item.items.length, 0);

            return (
              <div
                key={`gallery-row-${rowIndex}`}
                className={row.type === 'pair' ? classes.galleryRowPair : classes.galleryRowFull}
              >
                {row.items.map((src) => {
                  const index = imageIndex;
                  imageIndex += 1;

                  return (
                    <figure key={src || `empty-${index}`} className={classes.galleryShot}>
                      {src ? (
                        <Image
                          src={src}
                          alt={`${product.name} view ${index + 1}`}
                          fill
                          priority={index === 0}
                          sizes={
                            row.type === 'pair'
                              ? '(max-width: 900px) 50vw, 25vw'
                              : '(max-width: 900px) 100vw, 50vw'
                          }
                          className={classes.galleryImage}
                        />
                      ) : (
                        <div className={classes.galleryPlaceholder} />
                      )}
                    </figure>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div className={classes.buyColumn}>
          <aside className={classes.buyPanel}>
            <div className={classes.buyInner}>
            <header className={classes.productHead}>
              {product.category ? (
                <nav className={classes.breadcrumb} aria-label="Breadcrumb">
                  <Link href={`/shop/${product.gender === 'WOMEN' ? 'women' : 'men'}`}>Shop</Link>
                  <span aria-hidden="true">/</span>
                  <Link
                    href={`/shop/${product.gender === 'WOMEN' ? 'women' : 'men'}?category=${encodeURIComponent(product.category.slug)}`}
                  >
                    {product.category.name}
                  </Link>
                </nav>
              ) : null}
              <div className={classes.metaTop}>
                <div className={classes.badges}>
                  {discountPercent ? (
                    <span className={classes.discountBadge}>-{discountPercent}%</span>
                  ) : null}
                  {product.featured ? (
                    <span className={classes.seasonBadge}>New season</span>
                  ) : null}
                </div>
                <WishlistButton productId={product.id} className={classes.wishIcon} size={22} />
              </div>

              <h1 className={classes.title}>{product.name}</h1>

              <div className={classes.priceBlock}>
                <div className={classes.priceRow}>
                  <p className={classes.price}>{formatInrDetail(price)}</p>
                  {compareAt ? <p className={classes.compare}>{formatInrDetail(compareAt)}</p> : null}
                </div>
                <p className={classes.taxNote}>MRP inclusive of all taxes</p>
              </div>
            </header>

            <div className={classes.section}>
              <p className={classes.colorLabel}>
                <span className={classes.colorLabelPrefix}>COLOUR:</span> {color}
              </p>
              <div className={classes.colorSwatches} role="list">
                {colors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="listitem"
                    className={color === c ? classes.colorThumbActive : classes.colorThumbBtn}
                    onClick={() => {
                      setColor(c);
                      const nextVariants = product.variants.filter((v) => v.color === c);
                      setSize(firstAvailableSize(nextVariants));
                    }}
                    aria-label={c}
                    aria-pressed={color === c}
                    title={c}
                  >
                    {images[0] ? (
                      <Image
                        src={images[0]}
                        alt={c}
                        fill
                        sizes="72px"
                        className={classes.colorThumbImage}
                      />
                    ) : (
                      <span
                        className={classes.colorThumbFallback}
                        style={{ background: COLOR_SWATCH[c] || '#78716c' }}
                        aria-hidden="true"
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className={classes.section}>
              <div className={classes.sectionHead}>
                <span className={classes.sectionLabel}>Choose a size</span>
                <button type="button" className={classes.sizeGuideBtn} onClick={() => setSizeChartOpen(true)}>
                  <IconRuler2 size={14} stroke={1.75} />
                  Size guide
                </button>
              </div>
              <div className={classes.sizeRow}>
                {sizeOptions.map(({ size: sizeLabel, variant: sizeVariant }) => (
                  <button
                    key={sizeLabel}
                    type="button"
                    disabled={!sizeVariant || sizeVariant.stock < 1}
                    className={size === sizeLabel ? classes.sizeActive : classes.sizeBtn}
                    onClick={() => setSize(sizeLabel)}
                  >
                    {sizeLabel}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              className={classes.addBtn}
              disabled={!variant || variant.stock < 1 || pending}
              onClick={onAdd}
            >
              {pending ? 'Adding…' : message || 'Add to bag'}
            </button>

            <div className={classes.offers}>
              <div className={classes.offer}>
                <p className={classes.offerLabel}>Bank offer</p>
                <p>
                  Extra 5% off on prepaid UPI · use code <strong>NONSENSE5</strong>
                </p>
              </div>
              <div className={classes.offer}>
                <p className={classes.offerLabel}>Free shipping</p>
                <p>
                  On prepaid orders over ₹{brand.policies.freeShippingThresholdInr.toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            <Accordion
              multiple
              defaultValue={[]}
              chevron={<AccordionToggleIcon />}
              transitionDuration={420}
              transitionTimingFunction="cubic-bezier(0.22, 1, 0.36, 1)"
              className={classes.accordion}
              classNames={{
                item: classes.accItem,
                control: classes.accControl,
                panel: classes.accPanel,
                content: classes.accContent,
                chevron: classes.accChevron,
              }}
            >
              <Accordion.Item value="description">
                <Accordion.Control>Product description</Accordion.Control>
                <Accordion.Panel>
                  <p>{product.description}</p>
                  <ul>
                    {(product.highlights?.length
                      ? product.highlights
                      : [
                          'Designed for everyday street wear',
                          'Midweight cotton with a soft hand-feel',
                          'Print placement may vary slightly by size',
                        ]
                    ).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                    <li>Machine wash cold</li>
                  </ul>
                </Accordion.Panel>
              </Accordion.Item>
              <Accordion.Item value="composition">
                <Accordion.Control>Composition, care & origin</Accordion.Control>
                <Accordion.Panel>
                  <p>
                    {product.fabric || '100% cotton'} · {product.texture} fit ·{' '}
                    {product.neck || 'Crew neck'} · {product.sleeve || 'Short sleeve'}
                  </p>
                  <p>Machine wash cold. Do not bleach. Tumble dry low.</p>
                </Accordion.Panel>
              </Accordion.Item>
              <Accordion.Item value="policy">
                <Accordion.Control>Delivery & returns</Accordion.Control>
                <Accordion.Panel>
                  <p>
                    Metro delivery typically {brand.policies.metroDeliveryDays} business days after
                    dispatch. Returns within {brand.policies.returnWindowDays} days for unused items
                    with tags. See our <Link href="/shipping">Shipping</Link> and{' '}
                    <Link href="/returns">Returns</Link> policies.
                  </p>
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>
            </div>
          </aside>
        </div>
      </div>

      {related.length ? (
        <Container className={classes.relatedWrap}>
          <section className={classes.related} ref={relatedRef}>
            <div className={classes.relatedHead}>
              <h2>You might also like</h2>
            </div>
            <div className={classes.relatedGrid}>
              {related.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </div>
          </section>
        </Container>
      ) : null}

      <div
        className={`${classes.sticky} ${stickyVisible && !stickyDismissed ? classes.stickyOn : ''}`.trim()}
      >
        <Container className={classes.stickyInner}>
          <div className={classes.stickyMeta}>
            {images[0] ? (
              <div className={classes.stickyThumb}>
                <Image src={images[0]} alt="" fill sizes="56px" />
              </div>
            ) : null}
            <div>
              <p className={classes.stickyName}>{product.name}</p>
              <p className={classes.stickyPrice}>{formatInr(price)}</p>
            </div>
          </div>
          <div className={classes.stickyActions}>
            <button
              type="button"
              className={classes.stickyAddBtn}
              disabled={!variant || variant.stock < 1 || pending}
              onClick={onAdd}
            >
              {pending ? 'Adding…' : 'Add to bag'}
            </button>
            <button
              type="button"
              className={classes.stickyCloseBtn}
              onClick={() => setStickyDismissed(true)}
              aria-label="Hide sticky bar"
            >
              <IconX size={18} stroke={1.5} />
            </button>
          </div>
        </Container>
      </div>

      <Modal
        opened={sizeChartOpen}
        onClose={() => setSizeChartOpen(false)}
        title="Size guide (inches)"
        centered
        radius="md"
      >
        <p className={classes.chartNote}>
          {product.texture} fit — garment measurements in inches. If between sizes, size down for a
          neater look.
        </p>
        {product.fitGuide ? (
          <div className={classes.fitGuide}>
            <Image
              src={product.fitGuide}
              alt={`${product.name} size and fit guide`}
              width={720}
              height={900}
              className={classes.fitGuideImage}
            />
          </div>
        ) : null}
        <div className={classes.tableWrap}>
          <table className={classes.table}>
            <thead>
              <tr>
                <th>Size</th>
                <th>Chest</th>
                <th>Length</th>
                <th>Shoulder</th>
              </tr>
            </thead>
            <tbody>
              {SIZE_CHART.map((row) => (
                <tr key={row.size} className={row.size === size ? classes.rowActive : undefined}>
                  <td>{row.size}</td>
                  <td>{row.chest}</td>
                  <td>{row.length}</td>
                  <td>{row.shoulder}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>
    </>
  );
}
