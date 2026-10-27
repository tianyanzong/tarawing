'use client';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import type { SpreadResult } from '@/lib/types';
import CardDisplay from '@/components/CardDisplay';
import ReportFlow from '@/components/ReportFlow';

// Order matches the request: Holy Triangle, Gypsy Cross, Hexagram, Star of
// Solomon. Deck is fixed per spread (enforced server-side too, in
// cardService.SPREAD_DECK) — there is deliberately no deck selector here.
const SPREAD_OPTIONS = [
  {
    key: 'holy_triangle', label: 'Holy Triangle', count: 3, deckLabel: 'Tarot cards',
    blurb: 'Past, Present, Future — a fast, general-purpose read for when you want a quick, clear answer rather than a deep dive.',
  },
  {
    key: 'gypsy_cross', label: 'Gypsy Cross', count: 5, deckLabel: '36-card shortened playing-card deck',
    blurb: 'Ideal for relationship blockages and hidden obstacles. Traditionally dealt from a shortened pack (a standard deck with the 2, 3, 4, and 5 ranks removed), not Tarot.',
  },
  {
    key: 'hexagram', label: 'Hexagram Spread', count: 7, deckLabel: 'Tarot cards',
    blurb: 'Examines a specific problem from every angle — past, present, future, internal and external influence, advice, and likely outcome.',
  },
  {
    key: 'solomon_star', label: 'Star of Solomon', count: 8, deckLabel: 'Tarot cards',
    blurb: 'The supreme spread, for deep spiritual blockages and complex, layered situations. Not a quick read — give it a real question.',
  },
] as const;

type SpreadKey = typeof SPREAD_OPTIONS[number]['key'];

function SpreadsPageContent() {
  const params = useSearchParams();
  const initial = SPREAD_OPTIONS.find((s) => s.key === params.get('type'))?.key ?? 'holy_triangle';
  const [spreadKey, setSpreadKey] = useState<SpreadKey>(initial);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ id: string; spread: SpreadResult } | null>(null);

  const info = SPREAD_OPTIONS.find((s) => s.key === spreadKey)!;

  function changeSpread(key: SpreadKey) {
    setSpreadKey(key);
    setResult(null);
    setError(null);
  }

  async function draw() {
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await api.post<{ id: string; resultBasic: SpreadResult }>('/api/readings', {
        type: spreadKey, question: question || undefined,
      });
      setResult({ id: res.id, spread: res.resultBasic });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'The layout could not be dealt. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container container--narrow" style={{ paddingTop: 50, paddingBottom: 70 }}>
      <h1 className="heading-tarot" style={{ fontSize: 34, marginBottom: 8 }}>The Sacred Layout Engine</h1>
      <p className="form-note" style={{ marginBottom: 30 }}>
        Geometry-based spreads, dealt into fixed positions. Pick a layout below.
      </p>

      <div className="form-field">
        <label>Spread</label>
        <select value={spreadKey} onChange={(e) => changeSpread(e.target.value as SpreadKey)}>
          {SPREAD_OPTIONS.map((s) => (
            <option key={s.key} value={s.key}>{s.label} ({s.count} cards)</option>
          ))}
        </select>
      </div>

      <div className="panel" style={{ marginBottom: 24 }}>
        <h3 className="heading-tarot" style={{ fontSize: 19, marginBottom: 8 }}>{info.label}</h3>
        <p style={{ color: 'var(--parchment-dim)', lineHeight: 1.6, marginBottom: 10 }}>{info.blurb}</p>
        <span className="tag tag--gold">{info.count} cards</span>{' '}
        <span className="tag">{info.deckLabel}</span>
      </div>

      <div className="form-field">
        <label>Your question (optional)</label>
        <textarea rows={3} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="What do I need to know about this situation?" />
      </div>

      <button className="btn btn-primary" onClick={draw} disabled={loading}>
        {loading ? 'Dealing…' : `Deal the ${info.label}`}
      </button>
      {error && <p className="form-error" style={{ marginTop: 14 }}>{error}</p>}

      {result && (
        <>
          <CardDisplay cards={result.spread.cards} />
          <ReportFlow readingId={result.id} />
        </>
      )}
    </div>
  );
}

export default function SpreadsPage() {
  return (
    <Suspense fallback={<div className="container" style={{ paddingTop: 50 }}><p className="form-note">Loading layouts...</p></div>}>
      <SpreadsPageContent />
    </Suspense>
  );
}
