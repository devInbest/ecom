import { Paper } from '@mantine/core';

import Container from '@/components/common/Container/Container';
import { featureItems } from '@/constants/site';

import classes from './FeaturesSection.module.scss';

export default function FeaturesSection() {
  return (
    <section className={classes.features} id="services">
      <Container>
        <div className={classes.heading}>
          <h2>What You&apos;ll Get</h2>
        </div>

        <div className={classes.grid}>
          {featureItems.map((item, index) => (
            <Paper key={item.title} withBorder radius="md" p="lg" className={classes.card}>
              <span className={classes.index}>0{index + 1}</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </Paper>
          ))}
        </div>
      </Container>
    </section>
  );
}
