'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import type { ReadingView, SpreadResult, NatalChartResult } from '@/lib/types';
import CardDisplay from '@/components/CardDisplay';
import ReportFlow from '@/components/ReportFlow';

function isChart(basic: unknown): basic is NatalChartResult {
  return !!basic && typeof basic === 'object' && 'sun' in (basic as object);
}
function isSpread(basic: unknown): basic is SpreadResult {
  return !!basic && typeof basic === 'object' && 'cards' in (basic as object);
}

export default function ReadingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [view, setView] = useState<ReadingView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<ReadingView>(`/api/readings/${id}`).then(setView).catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load this reading.'));
  }, [id]);

  if (error) return <div className="container container--narrow" style={{ paddingTop: 60 }}><p className="form-error">{error}</p></div>;
  if (!view) return <div className="container container--narrow" style={{ paddingTop: 60 }}><p className="form-note">Loading…</p></div>;

  return (
    <div className="container container--narrow" style={{ paddingTop: 50, paddingBottom: 70 }}>
      <h1 className="heading-tarot" style={{ fontSize: 30, marginBottom: 8 }}>{view.type.replace(/_/g, ' ')}</h1>
      {view.question && <p className="form-note" style={{ marginBottom: 20 }}>Question: {view.question}</p>}

      {isSpread(view.resultBasic) && <CardDisplay cards={view.resultBasic.cards} />}
      {isChart(view.resultBasic) && (
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 20 }}>
          {view.resultBasic.sun && <span className="tag tag--gold">Sun: {view.resultBasic.sun.sign}</span>}
          {view.resultBasic.moon && <span className="tag tag--gold">Moon: {view.resultBasic.moon.sign}</span>}
          {view.resultBasic.ascendant && <span className="tag tag--gold">Ascendant: {view.resultBasic.ascendant.sign}</span>}
        </div>
      )}

      <ReportFlow readingId={view.id} />
    </div>
  );
}
