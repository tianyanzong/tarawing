'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import type { Article } from '@/lib/types';

export default function ArticleDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Article>(`/api/library/${slug}`).then(setArticle).catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load this article.'));
  }, [slug]);

  if (error) return <div className="container container--narrow" style={{ paddingTop: 60 }}><p className="form-error">{error}</p></div>;
  if (!article) return <div className="container container--narrow" style={{ paddingTop: 60 }}><p className="form-note">Loading…</p></div>;

  return (
    <div className="container container--narrow" style={{ paddingTop: 50, paddingBottom: 70 }}>
      <span className="tag tag--gold" style={{ marginBottom: 14, display: 'inline-block' }}>{article.category}</span>
      <h1 style={{ fontSize: 32, marginBottom: 20 }}>{article.title}</h1>
      <p style={{ lineHeight: 1.75, color: 'var(--parchment-dim)' }}>{article.body}</p>
    </div>
  );
}
