import classes from './Container.module.scss';

export default function Container({ children, className = '' }) {
  return <div className={`${classes.container} ${className}`.trim()}>{children}</div>;
}
