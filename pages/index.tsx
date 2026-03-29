import { useEffect, useState, useCallback } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import type { ScoredListing, Grade } from '../lib/score'
import { GRADE_COLOR, GRADE_BG, fmtAed } from '../lib/score'
import { TRANSLATIONS, type Locale } from '../lib/i18n'

function GapBar({ pct }: { pct: number }) {
  const w = Math.min(100, Math.max(0, pct) * 3.5)
  const col = pct >= 15 ? '#1D9E75' : pct >= 8 ? '#BA7517' : '#D85A30'
  return (
    <div style={{ height: 4, background: 'var(--line)', borderRadius: 2, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${w}%`, background: col, borderRadius: 2 }} />
    </div>
  )
}

export default function Home() {
  const router = useRouter()
  const locale = (router.locale ?? 'en') as Locale
  const tx = TRANSLATIONS[locale]
  const [listings, setListings] = useState<ScoredListing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [usingSeed, setUsingSeed] = useState(false)
  const [gradeF, setGradeF] = useState<Grade | 'ALL'>('ALL')
  const [areaF, setAreaF] = useState('')
  const [bedsF, setBedsF] = useState<number | ''>('')
  const [sortBy, setSortBy] = useState<'gap'|'yield'|'price-asc'>('gap')
  const [favs, setFavs] = useState<Set<string>>(new Set())
  const [aiOpen, setAiOpen] = useState(false)
  const [aiQ, setAiQ] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiAnswer, setAiAnswer] = useState('')

  const load = useCallback(async (bust = false) => {
    setLoading(true); setError('')
    try {
      const res = await fetch(`/api/listings${bust ? '?bust=1' : ''}`)
      if (!res.ok) throw new Error('HTTP ' + res.status)
      const { listings: data, usingSeed: us } = await res.json()
      setListings(data); setUsingSeed(us)
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    try { const s = localStorage.getItem('dd-favs'); if (s) setFavs(new Set(JSON.parse(s))) } catch {}
  }, [])

  const toggleFav = (id: string) => setFavs(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id)
    try { localStorage.setItem('dd-favs', JSON.stringify([...next])) } catch {}
    return next
  })

  const areas = [...new Set(listings.map(p => p.area))].sort()
  const filtered = listings
    .filter(p => gradeF === 'ALL' || p.grade === gradeF)
    .filter(p => !areaF || p.area === areaF)
    .filter(p => bedsF === '' || p.beds === bedsF)
    .sort((a, b) => sortBy === 'gap' ? b.gapPct - a.gapPct : sortBy === 'yield' ? b.yieldPct - a.yieldPct : a.askPrice - b.askPrice)

  const askAI = async (q: string) => {
    if (!q.trim() || aiLoading) return
    setAiQ(q); setAiLoading(true); setAiAnswer(''); setAiOpen(true)
    try {
      const res = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: q, listings: filtered.slice(0, 20), locale }) })
      const { answer, error: e } = await res.json()
      setAiAnswer(answer ?? e ?? '')
    } catch { setAiAnswer('Error') } finally { setAiLoading(false) }
  }

  const fltSt = { background: 'var(--surf)', border: '1px solid var(--line2)', color: 'var(--ink)', padding: '5px 10px', borderRadius: 6, fontSize: 12 } as const

  return (
    <>
      <Head><title>Dubai Deals</title><meta name="viewport" content="width=device-width,initial-scale=1"/></Head>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}:root{--ink:#1A1612;--ink2:#4A4540;--ink3:#8A8480;--line:#E2DED8;--line2:#CCC8C2;--bg:#FAF8F5;--surf:#FFF;--surf2:#F5F2EE;--teal:#0F6E56}body{background:var(--bg);color:var(--ink);font-family:'DM Sans',sans-serif;font-size:14px;line-height:1.5}`}</style>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=Fraunces:ital,wght@0,300;1,300&display=swap"/>
      <header style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--line)', background: 'var(--surf)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: 'Fraunces,serif', fontSize: '1.5rem', fontWeight: 300 }}>Dubai <em style={{ fontWeight: 500 }}>Deals</em></h1>
          <p style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 2 }}>{tx.tagline}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link href="/market" style={{ ...fltSt, textDecoration: 'none' }}>{locale === 'ja' ? '\u30c8\u30ec\u30f3\u30c9' : 'Trends'}</Link>
          <button onClick={() => load(true)} style={{ ...fltSt, cursor: 'pointer' }}>{tx.refresh}</button>
        </div>
      </header>

      {usingSeed && !loading && <div style={{ padding: '.5rem 1.5rem', background: '#FAEEDA', fontSize: 11, color: '#854F0B' }}>Demo data \u2014 {tx.noApiKey}</div>}

      <div style={{ background: 'var(--surf)', padding: '.7rem 1.5rem', borderBottom: '1px solid var(--line)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', border: '1px solid var(--line2)', borderRadius: 6, overflow: 'hidden' }}>
          {(['ALL', 'A', 'B', 'C', 'D'] as const).map(g => (
            <button key={g} onClick={() => setGradeF(g)} style={{ padding: '5px 10px', fontSize: 12, border: 'none', cursor: 'pointer', background: gradeF === g ? 'var(--surf2)' : 'transparent', fontWeight: gradeF === g ? 500 : 400 }}>{g === 'ALL' ? tx.allGrades : g}</button>
          ))}
        </div>
        <select value={areaF} onChange={e => setAreaF(e.target.value)} style={fltSt}>
          <option value="">{tx.allAreas}</option>
          {areas.map(a => <option key={a}>{a}</option>)}
        </select>
        <select value={String(bedsF)} onChange={e => setBedsF(e.target.value === '' ? '' : Number(e.target.value))} style={fltSt}>
          <option value="">{tx.allTypes}</option>
          <option value="0">{tx.studio}</option>
          <option value="1">1BR</option><option value="2">2BR</option><option value="3">3BR+</option>
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as 'gap'|'yield'|'price-asc')} style={fltSt}>
          <option value="gap">{tx.sortDisc}</option>
          <option value="yield">{tx.sortYield}</option>
          <option value="price-asc">{tx.sortPrice}</option>
        </select>
      </div>

      {loading && <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--ink3)' }}>{tx.loading}</div>}
      {error && <div style={{ padding: '1rem 1.5rem', color: '#A32D2D' }}>{error}</div>}
      {!loading && !error && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 1, background: 'var(--line)' }}>
          {filtered.length === 0 && <div style={{ gridColumn: '1/-1', padding: '3rem', textAlign: 'center', color: 'var(--ink3)' }}>{tx.noResults}</div>}
          {filtered.map(p => (
            <article key={p.id} style={{ background: 'var(--surf)', padding: '1.1rem 1.2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 500, background: GRADE_BG[p.grade], color: GRADE_COLOR[p.grade] }}>{p.grade}</div>
                <button onClick={() => toggleFav(p.id)} style={{ background: 'none', border: 'none', fontSize: 17, lineHeight: 1, padding: 0, color: favs.has(p.id) ? '#D85A30' : 'var(--line2)', cursor: 'pointer' }}>{favs.has(p.id) ? '\u2605' : '\u2606'}</button>
              </div>
              <h2 style={{ fontFamily: 'Fraunces,serif', fontSize: '.95rem', fontWeight: 300, marginBottom: 5, lineHeight: 1.3 }}>
                <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>{p.title}</a>
              </h2>
              <div style={{ background: 'var(--surf2)', borderRadius: 6, padding: '.6rem .8rem', marginBottom: 10 }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 500 }}>AED {fmtAed(p.askPrice)}</div>
                {p.hasMarketData && <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 4 }}>{tx.disc} <span style={{ color: '#0F6E56', fontWeight: 500 }}>-{p.gapPct.toFixed(1)}%</span></div>}
              </div>
              {p.hasMarketData && <div style={{ marginBottom: 10 }}><GapBar pct={p.gapPct}/></div>}
              <div style={{ borderTop: '1px solid var(--line)', paddingTop: 10, display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 10, color: 'var(--ink3)', background: 'var(--surf2)', border: '1px solid var(--line)', padding: '2px 6px', borderRadius: 3 }}>{p.area} {p.rooms}</span>
                <button onClick={() => askAI(`${p.title} - investment analysis`)} style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--teal)', background: 'none', border: 'none', cursor: 'pointer' }}>{tx.aiBtn}</button>
              </div>
            </article>
          ))}
        </div>
      )}

      {aiOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 250, padding: '1rem' }} onClick={e => e.target === e.currentTarget && setAiOpen(false)}>
          <div style={{ background: 'var(--surf)', borderRadius: 12, padding: '1.5rem', width: '100%', maxWidth: 500, maxHeight: '80vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '1rem', marginBottom: 8, fontWeight: 500 }}>{tx.aiTitle}</h2>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input value={aiQ} onChange={e => setAiQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && askAI(aiQ)}
                placeholder={tx.aiPlaceholder} style={{ flex: 1, padding: '8px 10px', border: '1px solid var(--line2)', borderRadius: 6, fontSize: 13, background: 'var(--surf2)', color: 'var(--ink)' }}/>
              <button onClick={() => askAI(aiQ)} disabled={aiLoading} style={{ padding: '8px 16px', background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>{aiLoading ? tx.analyzing : tx.analyze}</button>
            </div>
            {aiAnswer && <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--ink2)' }}>{aiAnswer}</p>}
            <button onClick={() => setAiOpen(false)} style={{ marginTop: 12, fontSize: 12, color: 'var(--ink3)', background: 'none', border: 'none', cursor: 'pointer' }}>Close</button>
          </div>
        </div>
      )}
    </>
  )
}
