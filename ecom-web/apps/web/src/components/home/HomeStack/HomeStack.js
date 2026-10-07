import { Children } from 'react';

import classes from './HomeStack.module.scss';

export default function HomeStack({ children }) {
  const items = Children.toArray(children);
  const lastIndex = items.length - 1;

  return (
    <div className={classes.stack}>
      {items.map((child, index) => {
        const isLast = index === lastIndex;
        return (
          <div
            key={child.key ?? index}
            className={[classes.panel, isLast ? classes.panelLast : ''].filter(Boolean).join(' ')}
            style={{ zIndex: index + 1 }}
          >
            <div className={classes.panelInner}>{child}</div>
          </div>
        );
      })}
    </div>
  );
}
