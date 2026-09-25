import { useId } from 'react';

// Supplied avatar's blue preset, grain layers, blinking eyes and press effect.
// CSS replaces the original Tailwind/Motion dependencies for this extension.
export default function Avatar({ small = false }: { small?: boolean }) {
  const uid = useId().replace(/\W/g, '');
  return <div className={`ai-avatar${small ? ' small' : ''}`} role="img" aria-label="WearWise AI avatar">
    {[0.72, 3.2].map((frequency, index) => <svg key={frequency} className="avatar-grain" aria-hidden="true" width="100%" height="100%">
      <defs><filter id={`grain-${uid}-${index}`} x="0%" y="0%" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency={frequency} numOctaves={index ? 1 : 4} stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter></defs>
      <rect width="100%" height="100%" filter={`url(#grain-${uid}-${index})`} />
    </svg>)}
    <div className="avatar-shine" aria-hidden="true" />
    <div className="avatar-shade" aria-hidden="true" />
    <div className="avatar-eyes" aria-hidden="true"><i /><i /></div>
  </div>;
}
