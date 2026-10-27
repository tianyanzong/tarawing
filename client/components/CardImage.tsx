'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { Card } from '@/lib/types';
import { getCardArtAsset } from '@/lib/cardArtAssets';

interface CardImageProps {
  card: Card;
  priority?: boolean;
}

function monogram(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

function ArtFallback({ card, unavailable = false }: { card: Card; unavailable?: boolean }) {
  return (
    <div
      className="card-art-fallback"
      role="img"
      aria-label={`${card.name}${unavailable ? ' artwork unavailable' : ''}`}
    >
      <span className="card-art-fallback__monogram" aria-hidden="true">{monogram(card.name)}</span>
      <span className="card-art-fallback__label">
        {unavailable ? 'Artwork unavailable' : card.name}
      </span>
    </div>
  );
}

export default function CardImage({ card, priority = false }: CardImageProps) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const asset = getCardArtAsset(card);

  // Unknown decks and malformed card data keep an explicit text fallback.
  if (!asset) return <ArtFallback card={card} />;
  if (status === 'error') return <ArtFallback card={card} unavailable />;

  return (
    <div
      className={`card-art-stage${card.reversed ? ' is-reversed' : ''}`}
      style={{ aspectRatio: `${asset.width} / ${asset.height}` }}
      aria-busy={status === 'loading'}
    >
      {status === 'loading' && <span className="card-art-skeleton" aria-hidden="true" />}
      <Image
        src={asset}
        alt={`${card.name}${card.reversed ? ' reversed' : ''} card artwork`}
        fill
        sizes="(max-width: 600px) 42vw, 180px"
        priority={priority}
        placeholder="blur"
        className={`card-art-image${status === 'loaded' ? ' is-loaded' : ''}`}
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
      />
    </div>
  );
}
