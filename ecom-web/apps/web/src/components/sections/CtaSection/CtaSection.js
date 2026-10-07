import { Button } from '@mantine/core';

import Container from '@/components/common/Container/Container';

import classes from './CtaSection.module.scss';

export default function CtaSection() {
  return (
    <section className={classes.section} id="pricing">
      <Container>
        <div className={classes.banner}>
          <div>
            <h2>Ready to launch your next website?</h2>
            <p>Use this starter to ship faster with consistent architecture and reusable UI.</p>
          </div>
          <Button size="md" variant="white" color="dark" component="a" href="#contact">
            Start Building
          </Button>
        </div>
      </Container>
    </section>
  );
}
