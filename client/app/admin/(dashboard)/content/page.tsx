'use client';
import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import type { Article, FaqItem } from '@/lib/types';

const emptyArticle = { title: '', slug: '', category: 'tarot', body: '', published: true };
const emptyFaq = { question: '', answer: '', category: 'general', sortOrder: 0 };

export default function AdminContentPage() {
  const [tab, setTab] = useState<'articles' | 'faq'>('articles');
  const [articles, setArticles] = useState<Article[] | null>(null);
  const [faqs, setFaqs] = useState<FaqItem[] | null>(null);
  const [articleForm, setArticleForm] = useState(emptyArticle);
  const [faqForm, setFaqForm] = useState(emptyFaq);
  const [error, setError] = useState<string | null>(null);

  async function loadArticles() { setArticles(await api.get<Article[]>('/api/admin/articles', true)); }
  async function loadFaqs() { setFaqs(await api.get<FaqItem[]>('/api/admin/faq', true)); }
  useEffect(() => { loadArticles().catch(() => setError('Could not load articles.')); loadFaqs().catch(() => setError('Could not load FAQ.')); }, []);

  async function saveArticle(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post('/api/admin/articles', articleForm, true);
      setArticleForm(emptyArticle);
      loadArticles();
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Could not save article.'); }
  }
  async function deleteArticle(id: string) { await api.del(`/api/admin/articles/${id}`, true); loadArticles(); }

  async function saveFaq(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post('/api/admin/faq', faqForm, true);
      setFaqForm(emptyFaq);
      loadFaqs();
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Could not save FAQ item.'); }
  }
  async function deleteFaq(id: string) { await api.del(`/api/admin/faq/${id}`, true); loadFaqs(); }

  return (
    <div>
      <h1 style={{ fontSize: 28, marginBottom: 20 }}>Content & FAQ</h1>
      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        <button className={`tab-btn ${tab === 'articles' ? 'is-active' : ''}`} onClick={() => setTab('articles')}>Library articles</button>
        <button className={`tab-btn ${tab === 'faq' ? 'is-active' : ''}`} onClick={() => setTab('faq')}>FAQ</button>
      </div>
      {error && <p className="form-error">{error}</p>}

      {tab === 'articles' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
          <table className="data-table">
            <thead><tr><th>Title</th><th>Category</th><th></th></tr></thead>
            <tbody>
              {articles?.map((a) => (
                <tr key={a.id}><td>{a.title}</td><td>{a.category}</td><td><button className="btn btn-ghost" onClick={() => deleteArticle(a.id)}>Delete</button></td></tr>
              ))}
            </tbody>
          </table>
          <form onSubmit={saveArticle} className="panel">
            <div className="form-field"><label>Title</label><input required value={articleForm.title} onChange={(e) => setArticleForm({ ...articleForm, title: e.target.value })} /></div>
            <div className="form-field"><label>Slug</label><input required value={articleForm.slug} onChange={(e) => setArticleForm({ ...articleForm, slug: e.target.value })} /></div>
            <div className="form-field"><label>Category</label><input required value={articleForm.category} onChange={(e) => setArticleForm({ ...articleForm, category: e.target.value })} /></div>
            <div className="form-field"><label>Body</label><textarea required rows={5} value={articleForm.body} onChange={(e) => setArticleForm({ ...articleForm, body: e.target.value })} /></div>
            <button className="btn btn-primary" type="submit">Publish article</button>
          </form>
        </div>
      )}

      {tab === 'faq' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
          <table className="data-table">
            <thead><tr><th>Question</th><th></th></tr></thead>
            <tbody>
              {faqs?.map((f) => (
                <tr key={f.id}><td>{f.question}</td><td><button className="btn btn-ghost" onClick={() => deleteFaq(f.id)}>Delete</button></td></tr>
              ))}
            </tbody>
          </table>
          <form onSubmit={saveFaq} className="panel">
            <div className="form-field"><label>Question</label><input required value={faqForm.question} onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })} /></div>
            <div className="form-field"><label>Answer</label><textarea required rows={4} value={faqForm.answer} onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })} /></div>
            <div className="form-field"><label>Category</label><input value={faqForm.category} onChange={(e) => setFaqForm({ ...faqForm, category: e.target.value })} /></div>
            <div className="form-field"><label>Sort order</label><input type="number" value={faqForm.sortOrder} onChange={(e) => setFaqForm({ ...faqForm, sortOrder: Number(e.target.value) })} /></div>
            <button className="btn btn-primary" type="submit">Add FAQ item</button>
          </form>
        </div>
      )}
    </div>
  );
}
