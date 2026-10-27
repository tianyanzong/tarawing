'use client';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import type { NatalChartResult, SpreadResult } from '@/lib/types';
import ReportFlow from '@/components/ReportFlow';
import CardDisplay from '@/components/CardDisplay';

function ZodiacRow({ label, point }: { label: string; point: NatalChartResult['sun'] | null }) {
  if (!point) return null;
  return (
    <div className="panel" style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span className="form-note">{label}</span>
        <span style={{ fontFamily: 'var(--font-tarot)', fontSize: 24, color: 'var(--gold-bright)' }}>{point.sign}</span>
      </div>
      <div className="form-note">{point.degreeInSign}° into {point.sign}</div>
      {point.precisionNote && <p className="form-error" style={{ marginTop: 8 }}>{point.precisionNote}</p>}
    </div>
  );
}

function NatalChartMode() {
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [tzOffset, setTzOffset] = useState('0');
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ id: string; chart: NatalChartResult } | null>(null);

  async function cast() {
    if (!birthDate) { setError('Birth date is required.'); return; }
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await api.post<{ id: string; resultBasic: NatalChartResult }>('/api/readings', {
        type: 'astrology_natal',
        birthDate,
        birthTime: birthTime || undefined,
        latitude: latitude ? Number(latitude) : undefined,
        longitude: longitude ? Number(longitude) : undefined,
        timezoneOffsetMinutes: tzOffset ? Number(tzOffset) : undefined,
        question: question || undefined,
      });
      setResult({ id: res.id, chart: res.resultBasic });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not cast the chart. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <p className="form-note" style={{ marginBottom: 30 }}>
        Sun sign only needs your birth date. Moon sign and Ascendant need an exact
        birth time — and Ascendant additionally needs your birth location.
      </p>

      <div className="form-field">
        <label>Birth date</label>
        <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
      </div>
      <div className="form-field">
        <label>Birth time (optional, improves accuracy)</label>
        <input type="time" value={birthTime} onChange={(e) => setBirthTime(e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: 14 }}>
        <div className="form-field" style={{ flex: 1 }}>
          <label>Latitude (optional — needed for Ascendant)</label>
          <input type="number" step="0.0001" placeholder="e.g. 40.7128" value={latitude} onChange={(e) => setLatitude(e.target.value)} />
        </div>
        <div className="form-field" style={{ flex: 1 }}>
          <label>Longitude</label>
          <input type="number" step="0.0001" placeholder="e.g. -74.0060" value={longitude} onChange={(e) => setLongitude(e.target.value)} />
        </div>
      </div>
      <div className="form-field">
        <label>Timezone offset from UTC, in minutes (e.g. UTC+8 → 480; UTC-5 → -300)</label>
        <input type="number" value={tzOffset} onChange={(e) => setTzOffset(e.target.value)} />
      </div>
      <div className="form-field">
        <label>Your question (optional)</label>
        <textarea rows={3} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="What should I focus on this year?" />
      </div>

      <button className="btn btn-primary" onClick={cast} disabled={loading}>
        {loading ? 'Casting…' : 'Cast my chart'}
      </button>
      {error && <p className="form-error" style={{ marginTop: 14 }}>{error}</p>}

      {result && (
        <div style={{ marginTop: 30 }}>
          <ZodiacRow label="Sun" point={result.chart.sun} />
          <ZodiacRow label="Moon" point={result.chart.moon} />
          <ZodiacRow label="Ascendant" point={result.chart.ascendant} />
          {result.chart.caveats.map((c, i) => <p key={i} className="form-error">{c}</p>)}
          <p className="form-note">{result.chart.planetsNote}</p>
          <ReportFlow readingId={result.id} />
        </div>
      )}
    </>
  );
}

function SevenPlanetsMode() {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ id: string; spread: SpreadResult } | null>(null);

  async function draw() {
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await api.post<{ id: string; resultBasic: SpreadResult }>('/api/readings', {
        type: 'seven_planets', question: question || undefined,
      });
      setResult({ id: res.id, spread: res.resultBasic });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'The layout could not be dealt. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <p className="form-note" style={{ marginBottom: 30 }}>
        The bridge between cards and astrology: one Tarot card drawn for each
        of the seven classical planetary domains — Sun, Moon, Mercury, Venus,
        Mars, Jupiter, and Saturn. (7 Tarot cards.)
      </p>
      <div className="form-field">
        <label>Your question (optional)</label>
        <textarea rows={3} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="What should I focus on this year?" />
      </div>
      <button className="btn btn-primary" onClick={draw} disabled={loading}>
        {loading ? 'Dealing…' : 'Deal the Seven Planets'}
      </button>
      {error && <p className="form-error" style={{ marginTop: 14 }}>{error}</p>}
      {result && (
        <>
          <CardDisplay cards={result.spread.cards} />
          <ReportFlow readingId={result.id} />
        </>
      )}
    </>
  );
}

function AstrologyPageContent() {
  const params = useSearchParams();
  const initialMode = params.get('mode') === 'seven_planets' ? 'seven_planets' : 'natal';
  const [mode, setMode] = useState<'natal' | 'seven_planets'>(initialMode);

  return (
    <div className="container container--narrow" style={{ paddingTop: 50, paddingBottom: 70 }}>
      <h1 className="heading-tarot" style={{ fontSize: 34, marginBottom: 20 }}>Astrology</h1>

      <div style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
        <button className={`tab-btn ${mode === 'natal' ? 'is-active' : ''}`} onClick={() => setMode('natal')}>Natal Chart</button>
        <button className={`tab-btn ${mode === 'seven_planets' ? 'is-active' : ''}`} onClick={() => setMode('seven_planets')}>Seven Planets</button>
      </div>

      {mode === 'natal' ? <NatalChartMode /> : <SevenPlanetsMode />}
    </div>
  );
}

export default function AstrologyPage() {
  return (
    <Suspense fallback={<div className="container" style={{ paddingTop: 50 }}><p className="form-note">Loading astrology...</p></div>}>
      <AstrologyPageContent />
    </Suspense>
  );
}
