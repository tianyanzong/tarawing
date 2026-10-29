'use client';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import type { DrawnCard } from '@/lib/types';
import CardDisplay from '@/components/CardDisplay';
import ReportFlow from '@/components/ReportFlow';

const DECKS = [
  { key: 'tarot', label: 'Tarot Cards', note: 'Deep, archetypal, psychological.' },
  { key: 'playing_cards', label: 'Playing Card Divination', note: 'Fast, grounded, good for yes/no.' },
];

function TarotPageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const requestedDeck = params.get('deck');
  const retiredLenormandUrl = requestedDeck === 'lenormand';
  const initialDeck = DECKS.some((deck) => deck.key === requestedDeck) ? requestedDeck! : 'tarot';
  const [deck, setDeck] = useState(initialDeck);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ id: string; cards: DrawnCard[] } | null>(null);

  useEffect(() => {
    if (retiredLenormandUrl) router.replace('/spreads?type=lenormand_pair');
  }, [retiredLenormandUrl, router]);

  async function draw() {
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await api.post<{ id: string; resultBasic: { cards: DrawnCard[] } }>('/api/readings', {
        type: deck, question: question || undefined,
      });
      setResult({ id: res.id, cards: res.resultBasic.cards });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'The cards would not shuffle. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (retiredLenormandUrl) {
    return <div className="container" style={{ paddingTop: 50 }}><p className="form-note">Opening the Lenormand Pair...</p></div>;
  }

  return (
    <div className="container container--narrow" style={{ paddingTop: 50, paddingBottom: 70 }}>
      <h1 className="heading-tarot" style={{ fontSize: 34, marginBottom: 12 }}>Draw a card</h1>
      <p className="form-note" style={{ marginBottom: 30 }}>
        Choose a deck, optionally ask a question, then draw. This is a single-card free
        draw — for a full layout, visit the <Link href="/spreads?type=holy_triangle" style={{ color: 'var(--gold-bright)' }}>Sacred Layout Engine</Link>.
      </p>

      <div className="form-field">
        <label>Deck</label>
        <select value={deck} onChange={(e) => setDeck(e.target.value)}>
          {DECKS.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
        </select>
        <span className="form-note">{DECKS.find((d) => d.key === deck)?.note}</span>
      </div>

      <div className="form-field">
        <label>Your question (optional)</label>
        <textarea rows={3} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Will I get the job offer next week?" />
      </div>

      <button className="btn btn-primary" onClick={draw} disabled={loading}>
        {loading ? 'Shuffling…' : 'Draw'}
      </button>
      {error && <p className="form-error" style={{ marginTop: 14 }}>{error}</p>}

      {result && (
        <>
          <CardDisplay cards={result.cards} />
          <ReportFlow readingId={result.id} />
        </>
      )}
    </div>
  );
}

export default function TarotPage() {
  return (
    <Suspense fallback={<div className="container" style={{ paddingTop: 50 }}><p className="form-note">Loading cards...</p></div>}>
      <TarotPageContent />
    </Suspense>
  );
}
