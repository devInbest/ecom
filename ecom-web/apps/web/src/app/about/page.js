import Link from 'next/link';

import InfoPage, {
  InfoCallout,
  InfoCard,
  InfoGrid,
  InfoSection,
} from '@/components/layout/InfoPage/InfoPage';
import { brand } from '@/constants/site';

export const metadata = {
  title: 'About Us | NONSENSE',
  description: brand.description,
};

export default function AboutPage() {
  return (
    <InfoPage
      title="About Us"
      lead="NONSENSE is a Mumbai-born tee house obsessed with hand-feel — oversized graphics, denser cotton, and cuts that hold their shape after the wash."
    >
      <InfoSection title="Our story">
        <p>
          NONSENSE started as a small studio experiment: what if every tee began with
          fabric, not a print? We source midweight cottons, test drape on the body,
          and finish with graphics that feel intentional — puff prints, towelling
          embroidery, and tonal marks that survive real wear.
        </p>
        <p>
          Today we design for men and women across India, shipping from our Mumbai
          atelier with the same editorial eye we bring to every drop.
        </p>
      </InfoSection>

      <InfoSection title="What we stand for">
        <InfoGrid>
          <InfoCard meta="01" title="Fabric first">
            <p>Rib, waffle, jersey, and knit constructions chosen for structure and softness — never thin blanks.</p>
          </InfoCard>
          <InfoCard meta="02" title="Honest fit">
            <p>Oversized, boxy, boyfriend, and classic cuts labelled clearly so you know what lands at your door.</p>
          </InfoCard>
          <InfoCard meta="03" title="Limited drops">
            <p>Smaller runs mean sharper colourways and less warehouse waste. When a graphic sells out, it moves on.</p>
          </InfoCard>
          <InfoCard meta="04" title="Clear commerce">
            <p>
              Shipping, returns, and privacy policies written in plain language — aligned with India&apos;s Consumer
              Protection Act, 2019 and e-commerce disclosure norms.
            </p>
          </InfoCard>
        </InfoGrid>
      </InfoSection>

      <InfoSection title="Studio">
        <p>
          {brand.address.line1}, {brand.address.line2}
          <br />
          {brand.address.city}, {brand.address.state} {brand.address.postalCode}
          <br />
          {brand.address.country}
        </p>
        <InfoCallout>
          <p>
            Questions about a drop or an order? Reach us at{' '}
            <Link href="/contact">{brand.supportEmail}</Link> or visit{' '}
            <Link href="/contact">Contact Us</Link>.
          </p>
        </InfoCallout>
      </InfoSection>
    </InfoPage>
  );
}
