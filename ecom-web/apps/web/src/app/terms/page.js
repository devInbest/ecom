import Link from 'next/link';

import InfoPage, { InfoCallout, InfoSection } from '@/components/layout/InfoPage/InfoPage';
import { brand } from '@/constants/site';

export const metadata = {
  title: 'Terms & Condition | NONSENSE',
  description: 'Terms and conditions for shopping at NONSENSE.',
};

const toc = [
  { href: '#agreement', label: 'Agreement' },
  { href: '#account', label: 'Accounts' },
  { href: '#orders', label: 'Orders & pricing' },
  { href: '#products', label: 'Products' },
  { href: '#payments', label: 'Payments' },
  { href: '#ip', label: 'Intellectual property' },
  { href: '#liability', label: 'Liability' },
  { href: '#law', label: 'Governing law' },
];

export default function TermsPage() {
  return (
    <InfoPage
      title="Terms & Condition"
      lead="These terms govern your use of NONSENSE’s website and purchases. By placing an order you agree to them."
      updated="25 August 2026"
      toc={toc}
    >
      <InfoSection id="agreement" title="Agreement">
        <p>
          These Terms &amp; Conditions (&quot;Terms&quot;) form a binding agreement between you and {brand.name}{' '}
          for use of our website, apps, and checkout. Related policies —
          <Link href="/privacy-policy"> Privacy</Link>, <Link href="/shipping"> Shipping</Link>, and{' '}
          <Link href="/returns"> Returns &amp; Refunds</Link> — are incorporated by reference.
        </p>
      </InfoSection>

      <InfoSection id="account" title="Accounts">
        <p>
          You must provide accurate phone/email details and keep OTPs confidential. You are
          responsible for activity under your account. We may suspend accounts involved in fraud,
          abuse, or chargebacks.
        </p>
      </InfoSection>

      <InfoSection id="orders" title="Orders & pricing">
        <ul>
          <li>All prices are in Indian Rupees (INR) and include applicable GST unless stated otherwise.</li>
          <li>An order is an offer to buy; acceptance occurs when we confirm payment and begin fulfilment.</li>
          <li>We may cancel orders for stock errors, pricing mistakes, suspected fraud, or courier restrictions, with a full refund of amounts paid.</li>
          <li>Promotions cannot be combined unless we say so; we may modify or end offers without notice.</li>
        </ul>
      </InfoSection>

      <InfoSection id="products" title="Products">
        <p>
          Product images are studio / lifestyle references. Colour may vary slightly by screen and
          dye lot. Sizing charts and fit labels (oversized, boxy, boyfriend, classic) are guides —
          check the product page before purchase.
        </p>
      </InfoSection>

      <InfoSection id="payments" title="Payments">
        <p>
          We accept prepaid methods via our payment partner and Cash on Delivery (COD) where
          available. Failed or incomplete payments may auto-cancel the order. For COD, the amount
          due must be paid to the courier at delivery; refusal may lead to return-to-origin and
          limits on future COD eligibility.
        </p>
      </InfoSection>

      <InfoSection id="ip" title="Intellectual property">
        <p>
          NONSENSE marks, product photography, copy, and site design are owned by us or our licensors.
          Licensed character / brand graphics are used under licence where applicable — you may not
          reproduce them for commercial use.
        </p>
      </InfoSection>

      <InfoSection id="liability" title="Limitation of liability">
        <p>
          To the fullest extent permitted by Indian law, NONSENSE is not liable for indirect or
          consequential losses arising from site use or delayed delivery beyond our reasonable
          control. Nothing in these Terms limits liability for death, personal injury, or fraud
          where such limitation is unlawful.
        </p>
        <InfoCallout>
          <p>
            Consumer rights under the Consumer Protection Act, 2019 remain available for defective,
            spurious, or misdescribed goods.
          </p>
        </InfoCallout>
      </InfoSection>

      <InfoSection id="law" title="Governing law">
        <p>
          These Terms are governed by the laws of India. Courts in Mumbai, Maharashtra have
          exclusive jurisdiction, without prejudice to your rights before a consumer forum /
          commission under applicable law.
        </p>
        <p>
          Questions: <a href={`mailto:${brand.legalEmail}`}>{brand.legalEmail}</a> ·{' '}
          <Link href="/contact">Contact Us</Link>
        </p>
      </InfoSection>
    </InfoPage>
  );
}
