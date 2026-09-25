import { useId, type CSSProperties } from 'react';
import './home-art.css';

// Adaptation of the supplied paired, skewed rows, with CSS hover staggering.
export function LayeredText() {
  const words = ['\u00a0', 'SEE IT', 'ON YOU', 'FIRST.', '\u00a0'];
  return <h1 className="layered-heading" aria-label="See it on you first." tabIndex={0}>
    <span className="layered-rows" aria-hidden="true">{words.slice(0, -1).map((word, i) => <span className="layered-row" key={i} style={{ '--row': i, '--offset': `${(i - 1.5) * 12}px` } as CSSProperties}>
      <span className="layered-pair"><span>{word}</span><span>{words[i+1]}</span></span>
    </span>)}</span>
  </h1>;
}

// Five rotating nested text rings from the supplied TangleFooter, scaled to fit
// the narrow sidepanel with SVG viewBox coordinates instead of measured pixels.
export function TangleFooter() {
  const uid = useId().replace(/\W/g, '');
  const lines = ['WEARWISE · SEE IT ON YOU FIRST · ', 'YOUR STYLE · YOUR WAY · ', 'SCAN · SELECT · TRY ON · ', 'FIND YOUR NEXT LOOK · ', 'A NEW WAY TO TRY ON · '];
  return <footer className="tangle-footer" aria-label="WearWise: scan, select and try on">
    <svg viewBox="0 0 480 240" aria-hidden="true">
      <defs>{lines.map((_, i) => {
        const r = 40 + i*44;
        return <path key={i} id={`${uid}-ring-${i}`} d={`M ${240+r} 240 A ${r} ${r} 0 1 1 ${240-r} 240 A ${r} ${r} 0 1 1 ${240+r} 240`} />;
      })}</defs>
      {lines.map((line, i) => <g key={i} style={{ transformOrigin: '240px 240px', animationDuration: `${42+i*8}s`, animationDelay: `${-i*7}s`, animationDirection: i%2 ? 'reverse' : 'normal' }}>
        <use href={`#${uid}-ring-${i}`} fill="none" stroke={i%2 ? '#7861ba' : '#40305e'} strokeWidth="28" />
        <text fill="#fff8ec" fontSize="15" fontWeight="700" dominantBaseline="central" letterSpacing=".7"><textPath href={`#${uid}-ring-${i}`}>{line.repeat(12)}</textPath></text>
      </g>)}
    </svg>
  </footer>;
}
