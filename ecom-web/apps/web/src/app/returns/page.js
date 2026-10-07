import Link from 'next/link';

import InfoPage, { InfoCallout, InfoSection } from '@/components/layout/InfoPage/InfoPage';
import { brand } from '@/constants/site';

export const metadata = {
  title: 'Return & Refund Policy | NONSENSE',
  description: 'NONSENSE return window, refund timelines, and exchange rules for apparel.',
};

const toc = [
  { href: '#window', label: 'Return window' },
  { href: '#eligible', label: 'Eligibility' },
  { href: '#process', label: 'How to return' },
  { href: '#refunds', label: 'Refunds' },
  { href: '#exchanges', label: 'Exchanges' },
  { href: '#exceptions', label: 'Exceptions' },
  { href: '#help', label: 'Need help' },
];

const { returnWindowDays, refundBusinessDays, refundMaxDays } = brand.policies;

export default function ReturnsPage() {
  return (
    <InfoPage
      title="Return & Refund Policy"
      lead={`Unused NONSENSE tees can be returned within ${returnWindowDays} days of delivery. Refunds follow after quality check — typically within ${refundBusinessDays} business days, and no later than ${refundMaxDays} days from acceptance.`}
      updated="25 August 2026"
      toc={toc}
    >
      <InfoSection id="window" title="Return window">
        <p>
          You may initiate a return within <strong>{returnWindowDays} days</strong> of the courier
          marking the order delivered. The window follows common Indian apparel e-commerce practice
          and our disclosure duties under the Consumer Protection (E-Commerce) Rules, 2020.
        </p>
      </InfoSection>

      <InfoSection id="eligible" title="Eligibility">
        <ul>
          <li>Item is unused, unwashed, and free of perfume / deodorant stains.</li>
          <li>Original tags, hygiene seals (if any), and packaging are intact.</li>
          <li>You include the invoice or order number with the return.</li>
          <li>Size / colour exchanges are allowed when stock is available.</li>
        </ul>
        <InfoCallout>
          <p>
            Defective, wrong, or damaged-on-arrival items are always eligible — even if the window
            has nearly closed — under the Consumer Protection Act, 2019.
          </p>
        </InfoCallout>
      </InfoSection>

      <InfoSection id="process" title="How to return">
        <ol>
          <li>
            Email <a href={`mailto:${brand.supportEmail}`}>{brand.supportEmail}</a> or use{' '}
            <Link href="/contact">Contact Us</Link> with your order number, reason, and photos for
            damage claims.
          </li>
          <li>We confirm eligibility and schedule a reverse pickup where your pincode is serviceable.</li>
          <li>Hand the packed tee to the courier; keep the AWB / pickup receipt.</li>
          <li>After warehouse QC (usually 1–3 business days), we approve the refund or exchange.</li>
        </ol>
        <p>
          If reverse pickup is unavailable, we will share a return address. Reasonable return
          shipping for approved defect / wrong-item cases is covered by NONSENSE.
        </p>
      </InfoSection>

      <InfoSection id="refunds" title="Refunds">
        <ul>
          <li>
            <strong>Prepaid:</strong> refunded to the original payment method within{' '}
            {refundBusinessDays} business days after QC approval (banks may take additional time to
            post).
          </li>
          <li>
            <strong>COD:</strong> refunded via NEFT/IMPS to a bank account you share securely. We
            never ask for OTP or UPI PIN.
          </li>
          <li>
            In line with e-commerce consumer guidelines, accepted refunds are completed within a
            maximum of <strong>{refundMaxDays} days</strong>.
          </li>
          <li>Shipping fees on the original order are refunded only for NONSENSE errors or defects.</li>
        </ul>
      </InfoSection>

      <InfoSection id="exchanges" title="Exchanges">
        <p>
          Prefer another size? Request an exchange when you open the return. If the new size is
          unavailable we will refund. Price differences on exchanges are settled before re-shipment.
        </p>
      </InfoSection>

      <InfoSection id="exceptions" title="Non-returnable">
        <ul>
          <li>Final-sale or clearance items marked non-returnable at checkout.</li>
          <li>Items returned after the window without a defect claim.</li>
          <li>Products showing wear, alterations, or missing tags.</li>
        </ul>
      </InfoSection>

      <InfoSection id="help" title="Need help">
        <p>
          Support: <a href={`mailto:${brand.supportEmail}`}>{brand.supportEmail}</a> · {brand.phone}
          <br />
          Grievance: <a href={`mailto:${brand.grievance.email}`}>{brand.grievance.email}</a> (
          {brand.grievance.responseSla})
        </p>
      </InfoSection>
    </InfoPage>
  );
}
