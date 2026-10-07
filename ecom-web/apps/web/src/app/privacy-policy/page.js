import Link from 'next/link';

import InfoPage, { InfoCallout, InfoSection } from '@/components/layout/InfoPage/InfoPage';
import { brand } from '@/constants/site';

export const metadata = {
  title: 'Privacy Policy | NONSENSE',
  description: 'How NONSENSE collects, uses, and protects your personal information.',
};

const toc = [
  { href: '#who-we-are', label: 'Who we are' },
  { href: '#what-we-collect', label: 'What we collect' },
  { href: '#how-we-use', label: 'How we use data' },
  { href: '#sharing', label: 'Sharing' },
  { href: '#retention', label: 'Retention & security' },
  { href: '#rights', label: 'Your rights' },
  { href: '#cookies', label: 'Cookies' },
  { href: '#contact', label: 'Contact' },
];

export default function PrivacyPolicyPage() {
  return (
    <InfoPage
      title="Privacy Policy"
      lead="We collect only what we need to run the store, ship your order, and improve NONSENSE — never sell your data."
      updated="25 August 2026"
      toc={toc}
    >
      <InfoSection id="who-we-are" title="Who we are">
        <p>
          This policy applies to {brand.name} (&quot;NONSENSE&quot;, &quot;we&quot;, &quot;us&quot;) operating nonsense.store and
          related checkout experiences. Our studio address is {brand.address.line1}, {brand.address.line2},{' '}
          {brand.address.city}, {brand.address.state} {brand.address.postalCode}, {brand.address.country}.
        </p>
        <p>
          We process personal data in line with the Information Technology Act, 2000, the SPDI Rules,
          2011, and emerging obligations under India&apos;s Digital Personal Data Protection Act, 2023.
        </p>
      </InfoSection>

      <InfoSection id="what-we-collect" title="What we collect">
        <ul>
          <li>
            <strong>Account &amp; auth:</strong> phone number, OTP verification status, name, and Google
            profile details when you choose Google sign-in.
          </li>
          <li>
            <strong>Orders:</strong> shipping address, items purchased, payment status, and order
            history. Card/UPI details are handled by our payment partner (e.g. Razorpay); we do not store
            full card numbers.
          </li>
          <li>
            <strong>Support:</strong> messages you send via email, WhatsApp, or the contact form,
            including optional order numbers.
          </li>
          <li>
            <strong>Technical:</strong> device/browser type, approximate location from IP, and basic
            analytics cookies needed to keep the site secure and fast.
          </li>
        </ul>
      </InfoSection>

      <InfoSection id="how-we-use" title="How we use data">
        <ul>
          <li>Create and secure your account, cart, and checkout.</li>
          <li>Fulfil, ship, and support orders; send transactional SMS/email.</li>
          <li>Detect fraud, abuse, and payment failures.</li>
          <li>Improve product pages, sizing guidance, and site performance.</li>
          <li>Send marketing only if you opt in — you can unsubscribe any time.</li>
        </ul>
      </InfoSection>

      <InfoSection id="sharing" title="When we share data">
        <p>We share data only with processors who help us run the business:</p>
        <ul>
          <li>Payment gateways and banks for authorised transactions.</li>
          <li>Logistics partners for delivery and returns pickup.</li>
          <li>OTP / messaging providers for login and shipping alerts.</li>
          <li>Cloud hosting and analytics vendors under confidentiality terms.</li>
        </ul>
        <p>We do not sell personal information. We may disclose data if required by law or to protect rights and safety.</p>
      </InfoSection>

      <InfoSection id="retention" title="Retention & security">
        <p>
          Order and invoice records are kept as required under Indian tax and consumer laws. Account
          data stays while your account is active; you may request deletion subject to legal hold
          obligations. We use industry-standard safeguards (HTTPS, access controls, least-privilege
          staff access). No method of transmission is 100% secure — please use a strong device lock
          and avoid sharing OTPs.
        </p>
      </InfoSection>

      <InfoSection id="rights" title="Your rights">
        <p>Subject to applicable law, you may request access, correction, or deletion of your personal data, and withdraw consent for marketing.</p>
        <InfoCallout>
          <p>
            Email <a href={`mailto:${brand.legalEmail}`}>{brand.legalEmail}</a> or our grievance desk at{' '}
            <a href={`mailto:${brand.grievance.email}`}>{brand.grievance.email}</a>. We aim to respond
            within {brand.grievance.responseSla}.
          </p>
        </InfoCallout>
      </InfoSection>

      <InfoSection id="cookies" title="Cookies">
        <p>
          We use essential cookies for login sessions and cart continuity, plus limited analytics to
          understand which pages perform. You can block non-essential cookies in your browser; the
          shop may still require essential cookies to check out.
        </p>
      </InfoSection>

      <InfoSection id="contact" title="Contact">
        <p>
          Privacy questions: <a href={`mailto:${brand.legalEmail}`}>{brand.legalEmail}</a>
          <br />
          General support: <Link href="/contact">{brand.supportEmail}</Link>
        </p>
      </InfoSection>
    </InfoPage>
  );
}
