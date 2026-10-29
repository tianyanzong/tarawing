'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import type { ArticleSummary } from '@/lib/types';

export default function LibraryPage() {
  const [articles, setArticles] = useState<ArticleSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<ArticleSummary[]>('/api/library').then(setArticles).catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load the library.'));
  }, []);

  return (
    <div className="container container--narrow" style={{ paddingTop: 50, paddingBottom: 70 }}>
      <h1 style={{ fontSize: 34, marginBottom: 8 }}>Library</h1>
      <p className="form-note" style={{ marginBottom: 30 }}>Short reads on how to interpret what Tarawing draws for you.</p>
      {error && <p className="form-error">{error}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {articles?.map((a) => (
          <Link key={a.id} href={`/library/${a.slug}`} className="panel" style={{ display: 'block' }}>
            <span className="tag tag--gold" style={{ marginBottom: 10, display: 'inline-block' }}>{a.category}</span>
            <h3 style={{ fontSize: 19 }}>{a.title}</h3>
          </Link>
        ))}
        {articles && articles.length === 0 && <p className="form-note">Nothing published yet.</p>}
      </div>
    </div>
  );
}
