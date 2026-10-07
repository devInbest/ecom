import Link from 'next/link';

import Container from '@/components/common/Container/Container';
import Footer from '@/components/layout/Footer/Footer';
import Header from '@/components/layout/Header/Header';

import classes from './InfoPage.module.scss';

export default function InfoPage({
  eyebrow = 'NONSENSE',
  title,
  lead,
  updated,
  children,
  toc,
}) {
  return (
    <>
      <Header />
      <main className={classes.page}>
        <div className={classes.heroBand} aria-hidden="true" />
        <Container className={classes.shell}>
          <header className={classes.hero}>
            <p className={classes.eyebrow}>{eyebrow}</p>
            <h1>{title}</h1>
            {lead ? <p className={classes.lead}>{lead}</p> : null}
            {updated ? <p className={classes.updated}>Last updated {updated}</p> : null}
          </header>

          <div className={toc?.length ? classes.layout : classes.single}>
            {toc?.length ? (
              <aside className={classes.toc} aria-label="On this page">
                <p className={classes.tocLabel}>On this page</p>
                <nav>
                  <ul>
                    {toc.map((item) => (
                      <li key={item.href}>
                        <Link href={item.href}>{item.label}</Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              </aside>
            ) : null}
            <div className={classes.content}>{children}</div>
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}

export function InfoSection({ id, title, children }) {
  return (
    <section id={id} className={classes.section}>
      {title ? <h2>{title}</h2> : null}
      {children}
    </section>
  );
}

export function InfoCallout({ children }) {
  return <aside className={classes.callout}>{children}</aside>;
}

export function InfoGrid({ children }) {
  return <div className={classes.grid}>{children}</div>;
}

export function InfoCard({ title, children, meta }) {
  return (
    <article className={classes.card}>
      {meta ? <p className={classes.cardMeta}>{meta}</p> : null}
      {title ? <h3>{title}</h3> : null}
      <div>{children}</div>
    </article>
  );
}
