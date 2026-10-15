import { useEffect, useMemo, useState } from 'react';
import { allLocales, htmlLang, layoutCopy, type Locale } from '../lib/locales';
import type { CmsArticleDraft } from '../lib/cms-content';
import type { LocaleRelease } from '../lib/locale-release';

type ListedArticle = { locale: Locale; slug: string; path: string; sha?: string };
type Session = { user: string; repository: string; branch: string; locales: LocaleRelease[] };
type TranslationDraft = { article: CmsArticleDraft; warnings: string[] };
const blankArticle = (): CmsArticleDraft => ({ locale: 'en', slug: '', title: '', description: '', category: '', publishedAt: new Date().toISOString().slice(0, 10), status: 'draft', body: '' });
async function api<T>(path: string, init?: RequestInit) {
  const response = await fetch(path, { credentials: 'same-origin', ...init, headers: { ...(init?.headers ?? {}), ...(init?.body ? { 'content-type': 'application/json' } : {}) } });
  const data = await response.json().catch(() => ({})) as T & { error?: string | string[] };
  if (!response.ok) throw new Error(Array.isArray(data.error) ? data.error.join(' ') : data.error || 'The request could not be completed.');
  return data;
}

export default function CmsAdmin() {
  const [session, setSession] = useState<Session | null>(null);
  const [articles, setArticles] = useState<ListedArticle[]>([]);
  const [article, setArticle] = useState<CmsArticleDraft>(blankArticle);
  const [renderJson, setRenderJson] = useState('');
  const [sha, setSha] = useState<string | undefined>();
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [translationTargets, setTranslationTargets] = useState<Locale[]>([]);
  const [translationDrafts, setTranslationDrafts] = useState<Record<string, TranslationDraft>>({});
  const [translationRenderJson, setTranslationRenderJson] = useState<Record<string, string>>({});
  const [translationBusy, setTranslationBusy] = useState(false);
  const [localeFilter, setLocaleFilter] = useState<Locale | 'all'>('all');
  const localeName = useMemo(() => layoutCopy.en.localeNames, []);
  const load = async () => {
    setLoading(true);
    try { const current = await api<Session>('/api/cms/session'); setSession(current); const listing = await api<{ articles: ListedArticle[] }>('/api/cms/articles'); setArticles(listing.articles); setNotice(''); }
    catch (error) { setSession(null); setNotice(error instanceof Error ? error.message : 'Unable to load the CMS.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const update = <K extends keyof CmsArticleDraft>(key: K, value: CmsArticleDraft[K]) => setArticle((current) => ({ ...current, [key]: value }));
  const updateIdentity = <K extends 'locale' | 'slug'>(key: K, value: CmsArticleDraft[K]) => { setSha(undefined); setTranslationTargets([]); clearTranslations(); update(key, value); };
  const clearTranslations = () => { setTranslationDrafts({}); setTranslationRenderJson({}); };
  const visibleArticles = localeFilter === 'all' ? articles : articles.filter((entry) => entry.locale === localeFilter);
  const publishedLocales = session?.locales.filter((entry) => entry.state === 'published').length ?? 0;
  const reviewLocales = session?.locales.filter((entry) => entry.state !== 'published').length ?? 0;
  const startNew = () => { setArticle(blankArticle()); setRenderJson(''); setSha(undefined); clearTranslations(); setNotice('New article draft. It is not published until you select Published and save.'); };
  const openArticle = async (entry: ListedArticle) => {
    setLoading(true);
    try {
      const data = await api<{ markdown: string; sha?: string }>(`/api/cms/articles/${entry.locale}/${entry.slug}`);
      const match = data.markdown.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
      if (!match) throw new Error('This file is not a CMS article.');
      const fields = Object.fromEntries(match[1].split('\n').map((line) => { const divider = line.indexOf(': '); return divider < 0 ? [] : [line.slice(0, divider), JSON.parse(line.slice(divider + 2))]; }));
      setArticle({ ...blankArticle(), ...fields, body: match[2].trim() } as CmsArticleDraft); setRenderJson(fields.render ? JSON.stringify(fields.render, null, 2) : ''); clearTranslations(); setSha(data.sha); setNotice(`Loaded ${entry.locale}/${entry.slug}.`);
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to open this article.'); }
    finally { setLoading(false); }
  };
  const toggleTranslationTarget = (locale: Locale) => setTranslationTargets((current) => current.includes(locale) ? current.filter((entry) => entry !== locale) : [...current, locale]);
  const generateTranslationDrafts = async () => {
    if (!translationTargets.length) { setNotice('Choose at least one target language.'); return; }
    setTranslationBusy(true);
    try {
      const result = await api<{ drafts: TranslationDraft[] }>('/api/cms/translation-drafts', { method: 'POST', body: JSON.stringify({ source: article, targetLocales: translationTargets }) });
      setTranslationDrafts(Object.fromEntries(result.drafts.map((entry) => [entry.article.locale, entry])));
      setTranslationRenderJson(Object.fromEntries(result.drafts.filter((entry) => entry.article.render).map((entry) => [entry.article.locale, JSON.stringify(entry.article.render, null, 2)])));
      const warnings = result.drafts.flatMap((entry) => entry.warnings);
      setNotice(warnings.length ? `Translation drafts generated with warnings: ${warnings.join(' ')}` : `Generated ${result.drafts.length} translation drafts. They remain needs-review.`);
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Translation draft generation failed.'); }
    finally { setTranslationBusy(false); }
  };
  const updateTranslation = (locale: Locale, key: 'title' | 'description' | 'body', value: string) => setTranslationDrafts((current) => ({ ...current, [locale]: { ...current[locale], article: { ...current[locale].article, [key]: value } } }));
  const saveTranslationDrafts = async () => {
    setTranslationBusy(true);
    try {
      const entries = Object.values(translationDrafts).map((entry) => {
        const json = translationRenderJson[entry.article.locale];
        if (!json?.trim()) return { article: entry.article };
        try { return { article: { ...entry.article, render: JSON.parse(json) as CmsArticleDraft['render'] } }; } catch { throw new Error(`Rendering JSON for ${entry.article.locale} is invalid.`); }
      });
      if (!entries.length) { setNotice('Generate translation drafts before saving them.'); return; }
      const result = await api<{ ok: boolean; saved: Array<{ locale: Locale; slug: string }>; failures: Array<{ locale?: string; slug?: string; error: string }> }>('/api/cms/articles/batch', { method: 'POST', body: JSON.stringify({ entries }) });
      await load();
      const failureText = result.failures.length ? ` Failures: ${result.failures.map((failure) => `${failure.locale ?? ''}/${failure.slug ?? ''} ${failure.error}`).join(' ')}` : '';
      setNotice(`Saved ${result.saved.length} translation drafts to GitHub.${failureText}`);
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Translation drafts could not be saved.'); }
    finally { setTranslationBusy(false); }
  };
  const save = async (event: { preventDefault: () => void }) => {
    event.preventDefault();
    if (!article.slug) { setNotice('Add a URL slug before saving.'); return; }
    setLoading(true);
    try {
      let render: CmsArticleDraft['render'];
      if (renderJson.trim()) {
        try { render = JSON.parse(renderJson) as CmsArticleDraft['render']; } catch { setNotice('Rendering data must be valid JSON.'); setLoading(false); return; }
      }
      const result = await api<{ sha?: string; commit?: string }>(`/api/cms/articles/${article.locale}/${article.slug}`, { method: 'PUT', body: JSON.stringify({ article: { ...article, ...(render ? { render } : {}), ...(!render ? { render: undefined } : {}) }, sha }) });
      setSha(result.sha); setNotice(`Saved to GitHub${result.commit ? ` (${result.commit.slice(0, 7)})` : ''}. The normal GitHub deployment will build it from this commit.`);
      const listing = await api<{ articles: ListedArticle[] }>('/api/cms/articles'); setArticles(listing.articles);
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to save this article.'); }
    finally { setLoading(false); }
  };
  const logout = async () => { try { await api('/api/cms-auth/logout', { method: 'POST' }); } finally { location.assign('/admin/'); } };
  if (loading && !session) return <section className="cms-state"><h1>Loading editorial workspace…</h1></section>;
  if (!session) return <section className="cms-state"><p className="cms-eyebrow">PixelTokb editorial workspace</p><h1>Sign in to manage articles</h1><p>Only approved GitHub users with write access to this repository can open the editor.</p>{notice && <p className="cms-notice cms-error" role="alert">{notice}</p>}<a className="cms-button" href="/api/cms-auth/login">Continue with GitHub</a></section>;
  return <div className="cms-shell">
    <header className="cms-header"><div><p className="cms-eyebrow">PixelTokb editorial workspace</p><h1>Blog editor</h1><p>Signed in as <strong>{session.user}</strong> · {session.repository} / {session.branch}</p></div><button className="cms-secondary" type="button" onClick={() => void logout()}>Sign out</button></header>
    {notice && <p className={`cms-notice ${notice.includes('Unable') || notice.includes('could not') || notice.includes('Authentication') ? 'cms-error' : ''}`} role="status">{notice}</p>}
    <div className="cms-grid">
      <aside className="cms-library"><div className="cms-library-heading"><h2>Articles</h2><button type="button" className="cms-secondary" onClick={startNew}>New article</button></div><p>Articles are stored as Markdown in <code>content/blog</code>. Nothing is created until you save.</p><label className="cms-filter">Show language<select value={localeFilter} onChange={(event) => setLocaleFilter(event.target.value as Locale | 'all')}><option value="all">All languages</option>{allLocales.map((locale) => <option key={locale} value={locale} lang={htmlLang[locale]}>{localeName[locale]}</option>)}</select></label>{articles.length ? (visibleArticles.length ? <ul>{visibleArticles.map((entry) => <li key={`${entry.locale}/${entry.slug}`}><button type="button" onClick={() => void openArticle(entry)}><span lang={htmlLang[entry.locale]}>{localeName[entry.locale]}</span><strong>{entry.slug}</strong></button></li>)}</ul> : <p className="cms-empty">No articles in this language yet.</p>) : <p className="cms-empty">No CMS articles yet. Existing published articles remain unchanged.</p>}</aside>
      <form className="cms-editor" onSubmit={(event) => void save(event)}>
        <div className="cms-editor-heading"><div><p className="cms-eyebrow">Article details</p><h2>{article.title || 'New article'}</h2></div><label className="cms-status">Status<select value={article.status} onChange={(event) => update('status', event.target.value as CmsArticleDraft['status'])}><option value="draft">Draft</option><option value="needs-review">Needs review</option><option value="published">Published</option></select></label></div>
        <div className="cms-fields"><label>Language<select value={article.locale} onChange={(event) => updateIdentity('locale', event.target.value as Locale)}>{allLocales.map((locale) => <option key={locale} value={locale} lang={htmlLang[locale]}>{localeName[locale]}</option>)}</select></label><label>Publication date<input type="date" value={article.publishedAt} onChange={(event) => update('publishedAt', event.target.value)} required /></label><label>URL slug<input value={article.slug} onChange={(event) => updateIdentity('slug', event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-{2,}/g, '-').replace(/^-|-$/g, ''))} placeholder="example-image-workflow" required /></label><label>Category<input value={article.category} onChange={(event) => update('category', event.target.value)} placeholder="Compression basics" required /></label><label className="cms-wide">Title<input value={article.title} onChange={(event) => update('title', event.target.value)} maxLength={120} required /></label><label className="cms-wide">Search description<input value={article.description} onChange={(event) => update('description', event.target.value)} maxLength={180} required /></label><label className="cms-wide">Article body (Markdown)<textarea value={article.body} onChange={(event) => update('body', event.target.value)} rows={18} placeholder="Write the article body here. Use real, reproducible evidence for any test result." required /></label><label className="cms-wide">Rendering data (JSON)<textarea value={renderJson} onChange={(event) => setRenderJson(event.target.value)} rows={12} placeholder={'Required for Published. Include articleId, sourceLocale, readMinutes, categorySlug, workflow, example and sources.'} /></label></div>
        <div className="cms-editor-actions"><p>CMS articles use the same public blog templates as existing articles. Published status requires complete rendering data; drafts and needs-review files stay out of public routes, hreflang and the sitemap. Changing language or slug starts a new GitHub file.</p><button className="cms-button" disabled={loading} type="submit">{loading ? 'Saving…' : 'Save to GitHub'}</button></div>
        <section className="cms-translation-panel" aria-labelledby="translation-heading"><div className="cms-editor-heading"><div><p className="cms-eyebrow">Google Cloud Translation</p><h2 id="translation-heading">Translation drafts</h2></div><button className="cms-secondary" type="button" disabled={translationBusy || !article.body} onClick={() => void generateTranslationDrafts()}>{translationBusy ? 'Working…' : 'Generate drafts'}</button></div><p className="cms-translation-note">Choose languages for a review draft. The source article is sent as text to Google Cloud Translation; images stay local. Drafts are never published automatically.</p><div className="cms-translation-targets">{allLocales.filter((locale) => locale !== article.locale).map((locale) => <label key={locale}><input type="checkbox" checked={translationTargets.includes(locale)} onChange={() => toggleTranslationTarget(locale)} /> <span lang={htmlLang[locale]}>{localeName[locale]}</span></label>)}</div>{Object.values(translationDrafts).length ? <><div className="cms-translation-grid">{Object.values(translationDrafts).map(({ article: draft, warnings }) => <article className="cms-translation-card" key={draft.locale} lang={htmlLang[draft.locale]} dir={session.locales.find((entry) => entry.locale === draft.locale)?.direction}><header><h3>{localeName[draft.locale]}</h3><span>needs-review</span></header>{warnings.length ? <p className="cms-translation-warning" role="status">{warnings.join(' ')}</p> : null}<div className="cms-translation-pair"><div className="cms-translation-source" lang={htmlLang[article.locale]} dir={session.locales.find((entry) => entry.locale === article.locale)?.direction}><strong>Source: {localeName[article.locale]}</strong><p>{article.title}</p><p>{article.description}</p><pre>{article.body}</pre></div><div className="cms-translation-target"><label>Translated title<input value={draft.title} onChange={(event) => updateTranslation(draft.locale, 'title', event.target.value)} /></label><label>Translated description<input value={draft.description} onChange={(event) => updateTranslation(draft.locale, 'description', event.target.value)} /></label><label>Translated body<textarea value={draft.body} onChange={(event) => updateTranslation(draft.locale, 'body', event.target.value)} rows={10} /></label>{draft.render ? <label>Translated rendering data (JSON)<textarea value={translationRenderJson[draft.locale] ?? ''} onChange={(event) => setTranslationRenderJson((current) => ({ ...current, [draft.locale]: event.target.value }))} rows={8} /></label> : null}</div></div></article>)}</div><button className="cms-button" type="button" disabled={translationBusy} onClick={() => void saveTranslationDrafts()}>Save all review drafts to GitHub</button></> : <p className="cms-empty">No translation drafts yet. Select target languages and generate them from the current source article.</p>}</section>
      </form>
    </div>
    <section className="cms-locales"><div><p className="cms-eyebrow">Language release control</p><h2>Locale status</h2><p>Only the three reviewed site languages are public. The remaining languages are editable for preparation, but are deliberately not exposed as incomplete public pages.</p><div className="cms-locale-summary"><strong>{publishedLocales} public</strong><span>{reviewLocales} awaiting review</span></div></div><ul>{session.locales.map((entry) => <li key={entry.locale}><span lang={htmlLang[entry.locale]}>{localeName[entry.locale]}</span><span dir={entry.direction}>{entry.direction.toUpperCase()}</span><strong data-state={entry.state}>{entry.state.replace('-', ' ')}</strong></li>)}</ul></section>
  </div>;
}
