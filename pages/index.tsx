// pages/index.tsx
import { useEffect, useState, useCallback, useRef } from 'react'
import Head from 'next/head'
import type { ScoredListing, AreaStats } from '../lib/dld'

// ── Seed listings (replace / extend with your feed or scraper) ──────────────
// These are the "ask price" side. The DLD API provides the "market" side.
const SEED_LISTINGS = [
  { id:'L001', source:'Bayut', title:'Binghatti Nova — 1BR', area:'Jumeirah Village Circle', rooms:'1BR', beds:1, sizeSqft:682, askPrice:710000, yieldPct:9.3, domDays:7, view:'Pool' },
  { id:'L002', source:'PF',    title:'Marquise Square — 2BR', area:'Business Bay', rooms:'2BR', beds:2, sizeSqft:1108, askPrice:1580000, yieldPct:8.0, domDays:38, view:'Canal' },
  { id:'L003', source:'Bayut', title:'Ciel Tower — Studio', area:'Dubai Marina', rooms:'Studio', beds:0, sizeSqft:445, askPrice:870000, yieldPct:8.1, domDays:9, view:'Sea' },
  { id:'L004', source:'PF',    title:'Burj Vista — 2BR', area:'Downtown Dubai', rooms:'2BR', beds:2, sizeSqft:1252, askPrice:3050000, yieldPct:6.7, domDays:45, view:'Burj' },
  { id:'L005', source:'Bayut', title:'Binghatti Crest — 1BR', area:'Jumeirah Village Circle', rooms:'1BR', beds:1, sizeSqft:654, askPrice:645000, yieldPct:9.5, domDays:71, view:'Garden' },
  { id:'L006', source:'PF',    title:'Ellington House — Studio', area:'Business Bay', rooms:'Studio', beds:0, sizeSqft:514, askPrice:820000, yieldPct:7.8, domDays:12, view:'Canal' },
  { id:'L007', source:'Bayut', title:'Index Tower — Studio', area:'DIFC', rooms:'Studio', beds:0, sizeSqft:492, askPrice:1060000, yieldPct:7.5, domDays:55, view:'City' },
  { id:'L008', source:'PF',    title:'Damac Heights — 1BR', area:'Dubai Marina', rooms:'1BR', beds:1, sizeSqft:724, askPrice:1310000, yieldPct:7.1, domDays:22, view:'Marina' },
  { id:'L009', source:'Bayut', title:'Sobha Hartland — 1BR', area:'Dubai Hills Estate', rooms:'1BR', beds:1, sizeSqft:760, askPrice:1060000, yieldPct:7.6, domDays:8, view:'Park' },
  { id:'L010', source:'PF',    title:'Address Residences — 1BR', area:'Downtown Dubai', rooms:'1BR', beds:1, sizeSqft:832, askPrice:2180000, yieldPct:6.4, domDays:60, view:'Fountain' },
  { id:'L011', source:'Bayut', title:'Jumeirah Living — 2BR', area:'Dubai Marina', rooms:'2BR', beds:2, sizeSqft:1490, askPrice:2380000, yieldPct:6.2, domDays:33, view:'Marina' },
  { id:'L012', source:'PF',    title:'Expo Valley — 3BR', area:'Dubai Hills Estate', rooms:'3BR', beds:3, sizeSqft:3200, askPrice:3780000, yieldPct:5.8, domDays:14, view:'Golf' },
]

type Score = 'A' | 'B' | 'C' | 'D'

function scoreColor(s: Score) {
  return { A:'#0F6E56', B:'#3B6D11', C:'#854F0B', D:'#A32D2D' }[s]
}
function scoreBg(s: Score) {
  return { A:'#E1F5EE', B:'#EAF3DE', C:'#FAEEDA', D:'#FCEBEB' }[s]
}
function fmtAed(n: number) {
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` : `${(n / 1_000).toFixed(0)}K`
}

export default function Home() {
  const [listings, setListings] = useState<ScoredListing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastFetch, setLastFetch] = useState('')

  // filters
  const [scoreFilter, setScoreFilter] = useState<Score | 'ALL'>('ALL')
  const [areaFilter, setAreaFilter] = useState('')
  const [bedsFilter, setBedsFilter] = useState<number | ''>( '')
  const [minGap, setMinGap] = useState(5)
  const [sortBy, setSortBy] = useState<'gap'|'yield'|'price-asc'|'txn'>('gap')
  const [favMode, setFavMode] = useState(false)
  const [favs, setFavs] = useState<Set<string>>(new Set())

  // AI
  const [aiOpen, setAiOpen] = useState(false)
  const [aiQ, setAiQ] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiAnswer, setAiAnswer] = useState('')
  const aiRef = useRef<HTMLInputElement>(null)

  // Load DLD stats and score listings
  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/transactions?months=6')
      if (!res.ok) throw new Error(`API ${res.status}`)
      const { stats, fetchedAt }: { stats: AreaStats[]; fetchedAt: string } = await res.json()

      // Score each seed listing against DLD market stats
      const scored: ScoredListing[] = []
      for (const seed of SEED_LISTINGS) {
        const stat = stats.find(
          s => s.area.toLowerCase() === seed.area.toLowerCase() &&
               s.rooms === seed.rooms
        )
        if (!stat || stat.txnCount < 2) continue

        const askPsf = seed.askPrice / seed.sizeSqft
        const gapPct = Math.round(((stat.medianPsf - askPsf) / stat.medianPsf) * 1000) / 10
        const score: Score = gapPct >= 18 ? 'A' : gapPct >= 10 ? 'B' : gapPct >= 4 ? 'C' : 'D'

        scored.push({
          ...seed,
          askPsf: Math.round(askPsf),
          avgTxnPsf: stat.avgPsf,
          medianTxnPsf: stat.medianPsf,
          txnCount: stat.txnCount,
          gapPct,
          score,
          recentTxns: stat.transactions,
        })
      }

      setListings(scored)
      setLastFetch(new Date(fetchedAt).toLocaleString('ja-JP'))
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Persist favs
  useEffect(() => {
    const saved = localStorage.getItem('dubai-deals-favs')
    if (saved) setFavs(new Set(JSON.parse(saved)))
  }, [])
  const toggleFav = (id: string) => {
    setFavs(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      localStorage.setItem('dubai-deals-favs', JSON.stringify([...next]))
      return next
    })
  }

  const filtered = listings
    .filter(p => scoreFilter === 'ALL' || p.score === scoreFilter)
    .filter(p => !areaFilter || p.area === areaFilter)
    .filter(p => bedsFilter === '' || p.beds === bedsFilter)
    .filter(p => p.gapPct >= minGap)
    .filter(p => !favMode || favs.has(p.id))
    .sort((a, b) => {
      if (sortBy === 'gap') return b.gapPct - a.gapPct
      if (sortBy === 'yield') return b.yieldPct - a.yieldPct
      if (sortBy === 'price-asc') return a.askPrice - b.askPrice
      return b.txnCount - a.txnCount
    })

  const areas = [...new Set(listings.map(p => p.area))].sort()
  const scoreACount = filtered.filter(p => p.score === 'A').length
  const avgGap = filtered.length ? (filtered.reduce((s, p) => s + p.gapPct, 0) / filtered.length).toFixed(1) : '—'
  const maxYield = filtered.length ? Math.max(...filtered.map(p => p.yieldPct)).toFixed(1) : '—'

  const askAI = async (q?: string) => {
    const question = q ?? aiQ
    if (!question.trim() || aiLoading) return
    setAiLoading(true)
    setAiAnswer('')
    setAiOpen(true)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, listings: filtered.slice(0, 20) }),
      })
      const { answer, error: err } = await res.json()
      setAiAnswer(answer ?? err ?? 'エラーが発生しました')
    } catch {
      setAiAnswer('通信エラーが発生しました')
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>Dubai Deals — 成約履歴ベース割安物件レーダー</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Fraunces:ital,wght@0,300;0,500;1,300&family=DM+Sans:wght@300;400;500&display=swap" />
      </Head>

      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        :root{
          --ink:#1A1612;--ink2:#4A4540;--ink3:#8A8480;
          --line:#E2DED8;--line2:#CCC8C2;
          --bg:#FAF8F5;--surf:#FFFFFF;--surf2:#F5F2EE;
          --teal:#0F6E56;--teal-bg:#E1F5EE;--teal-mid:#1D9E75;
          --coral:#993C1D;--coral-bg:#FAECE7;--coral-mid:#D85A30;
          --amber:#854F0B;--amber-bg:#FAEEDA;--amber-mid:#BA7517;
        }
        body{background:var(--bg);color:var(--ink);font-family:'DM Sans',sans-serif;font-size:14px;line-height:1.5;}
        button{cursor:pointer;font-family:'DM Sans',sans-serif;}
        select,input{font-family:'DM Sans',sans-serif;}
        .mono{font-family:'DM Mono',monospace;}
        .serif{font-family:'Fraunces',serif;}
      `}</style>

      {/* ── Header ── */}
      <header style={{padding:'1.25rem 1.5rem 1rem',borderBottom:'1px solid var(--line)',background:'var(--surf)',display:'flex',justifyContent:'space-between',alignItems:'flex-end'}}>
        <div>
          <h1 className="serif" style={{fontSize:'1.5rem',fontWeight:300}}>Dubai <em style={{fontStyle:'italic',fontWeight:500}}>Deals</em></h1>
          <p style={{fontSize:11,color:'var(--ink3)',marginTop:3,letterSpacing:.3}}>DLD成約履歴ベース — 割安物件レーダー</p>
        </div>
        <div style={{textAlign:'right',fontSize:11,color:'var(--ink3)'}}>
          {lastFetch && <div>最終取得 {lastFetch}</div>}
          <div style={{marginTop:4,display:'flex',gap:6,justifyContent:'flex-end',alignItems:'center'}}>
            <span style={{width:6,height:6,borderRadius:'50%',background:loading?'var(--amber-mid)':'var(--teal-mid)',display:'inline-block'}}/>
            <span>{loading ? 'DLD取得中...' : 'ライブデータ'}</span>
          </div>
        </div>
      </header>

      {/* ── KPI bar ── */}
      <div style={{display:'flex',gap:1,background:'var(--line)',borderBottom:'1px solid var(--line)'}}>
        {[
          ['表示件数', String(filtered.length), 'var(--ink)'],
          ['スコアA', String(scoreACount), 'var(--teal)'],
          ['平均乖離率', avgGap+'%', 'var(--ink)'],
          ['最高利回り', maxYield+'%', 'var(--teal)'],
          ['成約データ月数', '6ヶ月', 'var(--ink)'],
        ].map(([lbl, val, color]) => (
          <div key={lbl} style={{flex:1,background:'var(--surf)',padding:'.9rem 1.2rem',textAlign:'center'}}>
            <div className="serif mono" style={{fontSize:'1.3rem',fontWeight:500,color}}>{val}</div>
            <div style={{fontSize:10,color:'var(--ink3)',marginTop:4,letterSpacing:.5}}>{lbl}</div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div style={{background:'var(--surf)',padding:'.75rem 1.5rem',borderBottom:'1px solid var(--line)',display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
        {/* Score seg */}
        <div style={{display:'flex',border:'1px solid var(--line2)',borderRadius:6,overflow:'hidden',background:'var(--surf2)'}}>
          {(['ALL','A','B','C'] as const).map(s => (
            <button key={s} onClick={() => setScoreFilter(s)}
              style={{padding:'5px 13px',fontSize:12,background:scoreFilter===s?'var(--surf)':'transparent',
                color:scoreFilter===s&&s!=='ALL'?scoreColor(s as Score):'var(--ink3)',
                fontWeight:scoreFilter===s?500:400,border:'none'}}>
              {s}
            </button>
          ))}
        </div>

        <select value={areaFilter} onChange={e => setAreaFilter(e.target.value)}
          style={{background:'var(--surf)',border:'1px solid var(--line2)',color:'var(--ink)',padding:'5px 10px',borderRadius:6,fontSize:12}}>
          <option value="">全エリア</option>
          {areas.map(a => <option key={a}>{a}</option>)}
        </select>

        <select value={bedsFilter} onChange={e => setBedsFilter(e.target.value === '' ? '' : Number(e.target.value))}
          style={{background:'var(--surf)',border:'1px solid var(--line2)',color:'var(--ink)',padding:'5px 10px',borderRadius:6,fontSize:12}}>
          <option value="">間取り全て</option>
          <option value={0}>Studio</option>
          <option value={1}>1BR</option>
          <option value={2}>2BR</option>
          <option value={3}>3BR+</option>
        </select>

        <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'var(--ink3)'}}>
          <span>最低乖離</span>
          <input type="range" min={0} max={30} value={minGap} step={1}
            style={{width:80,accentColor:'var(--teal)'}}
            onChange={e => setMinGap(Number(e.target.value))} />
          <span style={{fontWeight:500,color:'var(--ink)',minWidth:30}}>{minGap}%+</span>
        </div>

        <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
          style={{background:'var(--surf)',border:'1px solid var(--line2)',color:'var(--ink)',padding:'5px 10px',borderRadius:6,fontSize:12}}>
          <option value="gap">乖離率↓</option>
          <option value="yield">利回り↓</option>
          <option value="price-asc">価格↑</option>
          <option value="txn">成約数↓</option>
        </select>

        <button onClick={() => { setFavMode(f => !f) }}
          style={{marginLeft:'auto',background:'var(--surf)',border:`1px solid ${favMode?'var(--coral-mid)':'var(--line2)'}`,
            color:favMode?'var(--coral)':'var(--ink3)',padding:'5px 12px',borderRadius:6,fontSize:12}}>
          {favMode ? '♥' : '♡'} お気に入り ({favs.size})
        </button>
      </div>

      {/* ── Info bar ── */}
      <div style={{padding:'.4rem 1.5rem',fontSize:11,color:'var(--ink3)',background:'var(--surf2)',borderBottom:'1px solid var(--line)',display:'flex',justifyContent:'space-between'}}>
        <span>{filtered.length}件表示 — 乖離率 = DLD直近6ヶ月成約中央値との差</span>
        <span className="mono">DLD Open Data API</span>
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{margin:'1rem 1.5rem',padding:'.75rem 1rem',background:'var(--coral-bg)',border:'1px solid var(--coral-mid)',borderRadius:6,fontSize:13,color:'var(--coral)'}}>
          DLDデータ取得エラー: {error}。デモデータを表示中。
          <button onClick={loadData} style={{marginLeft:12,color:'var(--coral)',background:'none',border:'none',textDecoration:'underline',fontSize:13}}>再試行</button>
        </div>
      )}

      {/* ── Grid ── */}
      {loading ? (
        <div style={{padding:'3rem',textAlign:'center',color:'var(--ink3)'}}>
          <div className="serif" style={{fontSize:'1.1rem',fontWeight:300}}>DLD成約データを取得中...</div>
        </div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:1,background:'var(--line)'}}>
          {filtered.length === 0 ? (
            <div style={{gridColumn:'1/-1',padding:'3rem',textAlign:'center',color:'var(--ink3)'}}>
              <span className="serif" style={{fontWeight:300,fontSize:'1.1rem'}}>条件に合う物件が見つかりません</span>
            </div>
          ) : filtered.map(p => (
            <Card key={p.id} p={p} isFav={favs.has(p.id)} onFav={toggleFav} onAI={q => { setAiQ(q); askAI(q) }} />
          ))}
        </div>
      )}

      {/* ── AI Panel ── */}
      <div style={{background:'var(--surf)',borderTop:'1px solid var(--line)'}}>
        <div onClick={() => setAiOpen(o => !o)}
          style={{display:'flex',alignItems:'center',gap:8,padding:'.8rem 1.5rem',cursor:'pointer',borderBottom:'1px solid var(--line)'}}>
          <div>
            <div className="serif" style={{fontSize:'.95rem',fontWeight:300}}>成約データ AI 分析</div>
            <div style={{fontSize:11,color:'var(--ink3)'}}>エリア・スコア・利回りで条件指定できます</div>
          </div>
          <span style={{marginLeft:'auto',fontSize:12,color:'var(--ink3)'}}>{aiOpen ? '▲' : '▼'}</span>
        </div>

        {aiOpen && (
          <div style={{padding:'1rem 1.5rem'}}>
            <div style={{display:'flex',gap:8}}>
              <input ref={aiRef} value={aiQ} onChange={e => setAiQ(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && askAI()}
                placeholder="例：スコアAで利回りが一番高い物件は？"
                style={{flex:1,background:'var(--surf2)',border:'1px solid var(--line2)',color:'var(--ink)',padding:'8px 12px',borderRadius:6,fontSize:13}} />
              <button onClick={() => askAI()}
                style={{background:'var(--ink)',color:'#FAF8F5',border:'none',padding:'8px 16px',borderRadius:6,fontSize:12,fontWeight:500}}>
                {aiLoading ? '...' : '分析'}
              </button>
            </div>

            <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:8}}>
              {['スコアAで利回りが一番高い物件は？','成約件数が多くて割安なエリアは？','200万AED以下の割安物件は？'].map(q => (
                <button key={q} onClick={() => { setAiQ(q); askAI(q) }}
                  style={{fontSize:11,padding:'4px 10px',borderRadius:20,border:'1px solid var(--line2)',color:'var(--ink3)',background:'var(--surf)'}}>
                  {q}
                </button>
              ))}
            </div>

            {(aiAnswer || aiLoading) && (
              <div style={{marginTop:12,background:'var(--surf2)',border:'1px solid var(--line)',borderRadius:6,padding:'.85rem 1rem',fontSize:13,lineHeight:1.65,color:'var(--ink)'}}>
                {aiLoading ? <span style={{color:'var(--ink3)'}}>分析中...</span> : aiAnswer}
              </div>
            )}

            <div style={{marginTop:8,fontSize:10,color:'var(--ink3)',lineHeight:1.5,padding:'.5rem .8rem',background:'var(--surf2)',borderRadius:5,border:'1px solid var(--line)'}}>
              成約データはDLD（Dubai Land Department）Open Data APIから取得。乖離率は直近6ヶ月の同エリア・同間取り成約中央値との比較。
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ── Card component ───────────────────────────────────────────────────────────
function Card({ p, isFav, onFav, onAI }: {
  p: ScoredListing
  isFav: boolean
  onFav: (id: string) => void
  onAI: (q: string) => void
}) {
  const barW = Math.min(100, Math.max(0, p.gapPct) * 3.5)
  const fillColor = p.gapPct >= 15 ? 'var(--teal-mid)' : p.gapPct >= 8 ? 'var(--amber-mid)' : 'var(--coral-mid)'
  const domColor = p.domDays <= 14 ? 'var(--teal)' : p.domDays <= 45 ? 'var(--amber)' : 'var(--coral)'
  const isHot = p.gapPct >= 15 && p.domDays <= 14
  const isStale = p.domDays > 50

  return (
    <div style={{background:'var(--surf)',padding:'1.1rem 1.2rem',transition:'background .1s'}}
      onMouseEnter={e => (e.currentTarget.style.background='var(--surf2)')}
      onMouseLeave={e => (e.currentTarget.style.background='var(--surf)')}>

      {/* Score + fav */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:8}}>
        <div className="mono" style={{width:30,height:30,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',
          fontSize:13,fontWeight:500,background:scoreBg(p.score),color:scoreColor(p.score)}}>
          {p.score}
        </div>
        <button onClick={() => onFav(p.id)}
          style={{background:'none',border:'none',fontSize:16,color:isFav?'var(--coral-mid)':'var(--line2)',lineHeight:1,padding:0}}>
          {isFav ? '♥' : '♡'}
        </button>
      </div>

      {/* Title + tags */}
      <div className="serif" style={{fontSize:'1rem',fontWeight:300,marginBottom:4,lineHeight:1.35}}>{p.title}</div>
      <div style={{fontSize:11,color:'var(--ink3)',marginBottom:12,display:'flex',gap:6,flexWrap:'wrap'}}>
        {[p.area, p.rooms, `${p.sizeSqft.toLocaleString()} sqft`, `${p.view}ビュー`].map(t => (
          <span key={t} style={{background:'var(--surf2)',border:'1px solid var(--line)',padding:'2px 7px',borderRadius:3}}>{t}</span>
        ))}
      </div>

      {/* Price section */}
      <div style={{background:'var(--surf2)',borderRadius:6,padding:'.65rem .8rem',marginBottom:10}}>
        <div className="serif mono" style={{fontSize:'1.2rem',fontWeight:500}}>AED {fmtAed(p.askPrice)}</div>
        <div style={{display:'flex',gap:12,marginTop:4,fontSize:11,color:'var(--ink3)'}}>
          <span>聞値 <span className="mono">{p.askPsf.toLocaleString()}</span> psf</span>
          <span>成約均 <span className="mono">{p.medianTxnPsf.toLocaleString()}</span> psf</span>
          <span style={{color:p.gapPct>=0?'var(--teal)':'var(--coral)',fontWeight:500}}>
            乖離 -{p.gapPct.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Recent txns */}
      <div style={{marginBottom:10}}>
        <div style={{fontSize:10,color:'var(--ink3)',letterSpacing:.5,marginBottom:6}}>
          直近成約 ({p.txnCount}件中 最新{Math.min(5, p.recentTxns.length)}件)
        </div>
        <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
          {p.recentTxns.slice(0, 5).map((t, i) => (
            <span key={i} className="mono" style={{fontSize:10,padding:'3px 7px',borderRadius:3,
              background: i < 2 ? 'var(--teal-bg)' : 'var(--surf2)',
              border: `1px solid ${i < 2 ? 'var(--teal-mid)' : 'var(--line)'}`,
              color: i < 2 ? 'var(--teal)' : 'var(--ink2)'}}>
              {new Date(t.transaction_date).toLocaleDateString('ja-JP',{month:'short',day:'numeric'})} {Math.round(t.psf).toLocaleString()}psf
            </span>
          ))}
        </div>
      </div>

      {/* Gap bar */}
      <div style={{marginBottom:10}}>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:4}}>
          <span style={{color:'var(--ink3)'}}>割安度</span>
          <span className="mono" style={{fontWeight:500}}>{p.gapPct.toFixed(1)}%</span>
        </div>
        <div style={{height:5,background:'var(--line)',borderRadius:3,overflow:'hidden'}}>
          <div style={{height:'100%',width:`${barW}%`,background:fillColor,borderRadius:3}} />
        </div>
      </div>

      {/* Metrics */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6,marginBottom:10}}>
        {[
          ['利回り', `${p.yieldPct.toFixed(1)}%`, 'var(--teal)'],
          ['市場日数', `${p.domDays}日`, domColor],
          ['成約件数', String(p.txnCount), 'var(--ink2)'],
        ].map(([l,v,c]) => (
          <div key={l} style={{background:'var(--surf2)',border:'1px solid var(--line)',borderRadius:5,padding:'.4rem .5rem',textAlign:'center'}}>
            <div className="mono" style={{fontSize:12,fontWeight:500,color:c}}>{v}</div>
            <div style={{fontSize:9,color:'var(--ink3)',marginTop:2,letterSpacing:.3}}>{l}</div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{display:'flex',alignItems:'center',gap:6,borderTop:'1px solid var(--line)',paddingTop:10}}>
        <span className="mono" style={{fontSize:10,color:'var(--ink3)',background:'var(--surf2)',border:'1px solid var(--line)',padding:'2px 6px',borderRadius:3}}>{p.source}</span>
        {isHot && <span style={{fontSize:10,padding:'2px 7px',borderRadius:3,background:'var(--teal-bg)',color:'var(--teal)',border:'1px solid #9FE1CB'}}>新着+割安</span>}
        {isStale && <span style={{fontSize:10,padding:'2px 7px',borderRadius:3,background:'var(--amber-bg)',color:'var(--amber)',border:'1px solid #FAC775'}}>長期滞留</span>}
        <button onClick={() => onAI(`${p.title}の成約データをもとに投資判断を教えて`)}
          style={{marginLeft:'auto',fontSize:11,color:'var(--teal)',background:'none',border:'none',padding:0}}>
          AI分析 →
        </button>
      </div>
    </div>
  )
}
