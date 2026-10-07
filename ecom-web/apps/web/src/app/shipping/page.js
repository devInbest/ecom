import Link from 'next/link';

import InfoPage, { InfoCallout, InfoCard, InfoGrid, InfoSection } from '@/components/layout/InfoPage/InfoPage';
import { brand } from '@/constants/site';

export const metadata = {
  title: 'Shipping Policy | NONSENSE',
  description: 'NONSENSE delivery timelines, shipping fees, COD, and serviceability across India.',
};

const toc = [
  { href: '#coverage', label: 'Coverage' },
  { href: '#fees', label: 'Fees & free shipping' },
  { href: '#timelines', label: 'Timelines' },
  { href: '#cod', label: 'Cash on Delivery' },
  { href: '#attempts', label: 'Delivery attempts' },
  { href: '#delays', label: 'Delays' },
  { href: '#help', label: 'Help' },
];

const {
  freeShippingThresholdInr,
  metroDeliveryDays,
  restOfIndiaDeliveryDays,
} = brand.policies;

export default function ShippingPage() {
  return (
    <InfoPage
      title="Shipping Policy"
      lead={`We ship across serviceable Indian pincodes. Free standard shipping on prepaid orders over ₹${freeShippingThresholdInr.toLocaleString('en-IN')}.`}
      updated="25 August 2026"
      toc={toc}
    >
      <InfoSection id="coverage" title="Coverage">
        <p>
          NONSENSE ships pan-India through partnered couriers. Enter your pincode at checkout to confirm
          serviceability. We currently do not ship internationally.
        </p>
      </InfoSection>

      <InfoSection id="fees" title="Fees & free shipping">
        <InfoGrid>
          <InfoCard meta="Prepaid" title={`Free over ₹${freeShippingThresholdInr.toLocaleString('en-IN')}`}>
            <p>Standard shipping is free on prepaid orders meeting the threshold after discounts.</p>
          </InfoCard>
          <InfoCard meta="Below threshold" title="Flat shipping">
            <p>A modest flat shipping fee is shown at checkout before you pay — no surprise add-ons at the door.</p>
          </InfoCard>
        </InfoGrid>
        <InfoCallout>
          <p>
            All checkout prices show a single-figure total with tax and shipping broken out, consistent
            with Indian e-commerce disclosure guidelines.
          </p>
        </InfoCallout>
      </InfoSection>

      <InfoSection id="timelines" title="Delivery timelines">
        <ul>
          <li>
            <strong>Metro cities:</strong> typically {metroDeliveryDays} business days after dispatch.
          </li>
          <li>
            <strong>Rest of India:</strong> typically {restOfIndiaDeliveryDays} business days after
            dispatch.
          </li>
          <li>
            Orders usually dispatch within 1–2 business days of payment confirmation (or COD
            confirmation).
          </li>
        </ul>
        <p>
          Timelines exclude Sundays, public holidays, and courier force majeure. Track progress anytime
          on <Link href="/track-order">Track Order</Link>.
        </p>
      </InfoSection>

      <InfoSection id="cod" title="Cash on Delivery">
        <p>
          COD is available on eligible pincodes and order values shown at checkout. A small COD
          handling fee may apply and will be displayed before you place the order. Please keep the
          exact payable amount ready for the courier.
        </p>
      </InfoSection>

      <InfoSection id="attempts" title="Delivery attempts">
        <p>
          Couriers typically attempt delivery up to two times. If you are unavailable, they may leave
          a call / SMS. Unclaimed shipments return to origin; re-shipping may require a fresh order
          or prepaid re-dispatch fee.
        </p>
      </InfoSection>

      <InfoSection id="delays" title="Wrong, late, or damaged parcels">
        <ul>
          <li>Inspect the package on delivery when possible; note visible damage on the POD.</li>
          <li>Report wrong item, short shipment, or transit damage within 48 hours with photos.</li>
          <li>
            Late delivery beyond the stated schedule may qualify for return / refund options under
            e-commerce consumer guidelines — contact support and we will make it right.
          </li>
        </ul>
      </InfoSection>

      <InfoSection id="help" title="Help">
        <p>
          Shipping questions: <a href={`mailto:${brand.supportEmail}`}>{brand.supportEmail}</a> ·{' '}
          {brand.phone} ({brand.hours})
          <br />
          Also see <Link href="/returns">Return &amp; Refund Policy</Link> and{' '}
          <Link href="/contact">Contact Us</Link>.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
