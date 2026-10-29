import type { DrawnCard } from '@/lib/types';
import CardImage from './CardImage';

export default function CardDisplay({ cards }: { cards: DrawnCard[] }) {
  return (
    <div className={`card-row${cards.length === 1 ? ' card-row--single' : ''}`}>
      {cards.map((dc, i) => (
        <article
          className="tarot-card"
          key={`${dc.position}-${dc.card.name}-${i}`}
          style={{ animationDelay: `${i * 90}ms` }}
        >
          <div className="position">{dc.position}</div>
          <CardImage card={dc.card} priority={i === 0} />
          <div className="name">{dc.card.name}</div>
          {dc.card.reversed != null && (
            <div className="orientation">{dc.card.reversed ? 'Reversed' : 'Upright'}</div>
          )}
          <div className="meaning">{dc.card.meaning}</div>
        </article>
      ))}
    </div>
  );
}
