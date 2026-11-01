import { useState } from 'react';
import { BRAND_ASSETS, BRANDING } from './branding';

export function BrandLogo({ variant = 'full', className = '', priority = false }: { variant?: 'full' | 'compact'; className?: string; priority?: boolean }) {
  const [failed, setFailed] = useState(false);
  const full = variant === 'full';
  const source = full ? BRAND_ASSETS.logo : BRAND_ASSETS.compactMark;
  return (
    <span className={`brand-logo brand-logo-${variant} ${failed ? 'brand-logo-fallback' : ''} ${className}`} aria-label={`${BRANDING.title} — ${BRANDING.subtitle}`}>
      {!failed && <img src={source} alt={`${BRANDING.title} — ${BRANDING.subtitle}`} loading={priority ? 'eager' : 'lazy'} onError={() => setFailed(true)} />}
      {failed && <span className="brand-logo-text"><strong>{BRANDING.title}</strong><small>{BRANDING.subtitle}</small></span>}
    </span>
  );
}
