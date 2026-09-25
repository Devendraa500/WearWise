import type { ReactNode } from 'react';
import './animations.css';

export function InfiniteRibbon({ children, reverse = false }: { children: ReactNode; reverse?: boolean }) {
  const repeats = Array.from({ length: 10 }, (_, index) => <span key={index}>{children}</span>);
  return <div className={`infinite-ribbon${reverse ? ' reverse' : ''}`}>
    <div className="infinite-ribbon-track" aria-hidden="true">{repeats}</div>
    <span className="sr-only">{children}</span>
  </div>;
}
