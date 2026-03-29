// pages/market.tsx
import { useEffect, useState, useRef, useCallback } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import type { AreaTrend } from './api/market'
import { TRANSLATIONS, type Locale } from '../lib/i18n'

declare global {
  interface Window {
    Chart: new (ctx: CanvasRenderingContext2D, config: object) => { destroy(): void }
  }
}

const AREAS = ['Downtown Dubai','Dubai Marina','Jumeirah Village Circle','Business Bay','Palm Jumeirah','DIFC','Dubai Hills Estate']
const ROOMS_LIST = ['Studio','1BR','2BR','3BR']

function ChangeChip({ pct }: { pct: number }) {
  const up = pct >= 0
  return (
    <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 3,
      background: up ? '#E1F5EE' : '#FCEBEB', color: up ? '#0F6E56' : '#A32D2D',
      border: up ? '1px solid #9FE1CB' : '1px solid #F7C1C1' }}>
      {up ? '+' : ''}{pct.toFixed(1)}%
    </span>
  )
}

function TrendChart({ trends, area, rooms }: { trends: AreaTrend[]; area: string; rooms: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<InstanceType<typeof window.Chart> | null>(null)
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas || !window.Chart) return
    const series = trends.filter(t => (area ? t.area === area : AREAS.includes(t.area)) && t.rooms === rooms).slice(0, 6)
    if (!series.length) return
    const allMonths = [...new Set(series.flatMap(s => s.trend.map(p => p.month)))].sort()
    const PALETTE = ['#1D9E75','#D85A30','#378ADD','#BA7517','#7F77DD','#D4537E']
    const datasets = series.map((s, i) => ({
      label: s.area,
      data: allMonths.map(m => { const pt = s.trend.find(p => p.month === m); return pt ? pt.medianPsf : null }),
      borderColor: PALETTE[i % PALETTE.length], borderWidth: 2, pointRadius: 3, tension: 0.35, spanGaps: true,
    }))
    if (chartRef.current) chartRef.current.destroy()
    chartRef.current = new window.Chart(canvas.getContext('2d')!, {
      type: 'line',
      data: { labels: allMonths, datasets },
      options: { responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } },
        scales: { y: { ticks: { callback: (v: unknown) => String(Number(v).toLocaleString()) } } }
      }
    })
    return () => { chartRef.current?.destroy() }
  }, [trends, area, rooms])
  return (<div style={{ position: 'relative', height: 320 }}><canvas ref={canvasRef} /></div>)
}

export default function MarketPage() {
  const router = useRouter()
  const locale = (router.locale ?? 'en') as Locale
  const tx = TRANSLATIONS[locale]
  const [trends, setTrends] = useState<AreaTrend[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [chartReady, setChartReady] = useState(false)
  const [filterArea, setFilterArea] = useState('')
  const [filterRooms, setFilterRooms] = useState('1BR')
  const [chartArea, setChartArea] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/market')
      if (!res.ok) throw new Error('HTTP ' + res.status)
      const { trends: data } = await res.json()
      setTrends(data)
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (window.Chart) { setChartReady(true); return }
    const s = document.createElement('script')
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js'
    s.onload = () => setChartReady(true)
    document.head.appendChild(s)
  }, [])

  const displayed = trends.filter(t => (!filterArea || t.area === filterArea) && (!filterRooms || t.rooms === filterRooms))
  const fltSt = { background: 'var(--surf)', border: '1px solid var(--line2)', color: 'var(--ink)', padding: '5px 10px', borderRadius: 6, fontSize: 12 } as const
  const isJa = locale === 'ja'

  return (
    <>
      <Head>
        <title>Dubai Deals - {isJa ? 'エリア市場トレンド' : 'Area Market Trends'}</title>
        <meta name="viewport" content="width=device-width,initial-scale=1"/>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=Fraunces:ital,wght@0,300;1,300&display=swap"/>
      </Head>
      <style dangerouslySetInnerHTML={{ __html: '*{box-sizing:border-box;margin:0;padding:0}:root{--ink:#1A1612;--ink3:#8A8480;--line:#E2DED8;--line2:#CCC8C2;--bg:#FAF8F5;--surf:#FFF;--surf2:#F5F2EE;--teal:#0F6E56;--serif:"Fraunces",serif;--sans:"DM Sans",sans-serif}body{background:var(--bg);color:var(--ink);font-family:var(--sans);font-size:14px;line-height:1.5}' }} />
      <header style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--line)', background: 'var(--surf)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link href="/" style={{ fontFamily: 'var(--serif)', fontSize: '1.25rem', fontWeight: 300, color: 'var(--ink)', textDecoration: 'none' }}>
          Dubai <em style={{ fontWeight: 500 }}>Deals</em>
        </Link>
        <span style={{ color: 'var(--line2)' }}>{'>'}</span>
        <span style={{ fontFamily: 'var(--serif)', fontWeight: 300, color: 'var(--ink3)' }}>
          {isJa ? 'エリア市場トレンド' : 'Area Market Trends'}
        </span>
      </header>
      <div style={{ background: 'var(--surf)', padding: '.7rem 1.5rem', borderBottom: '1px solid var(--line)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={filterArea} onChange={e => setFilterArea(e.target.value)} style={fltSt}>
          <option value="">{tx.allAreas}</option>
          {AREAS.map(a => <option key={a}>{a}</option>)}
        </select>
        <div style={{ display: 'flex', border: '1px solid var(--line2)', borderRadius: 6, overflow: 'hidden' }}>
          {ROOMS_LIST.map(r => (
            <button key={r} onClick={() => { setFilterRooms(r); setChartArea('') }}
              style={{ padding: '5px 12px', fontSize: 12, border: 'none', cursor: 'pointer',
                background: filterRooms === r ? 'var(--surf2)' : 'transparent',
                fontWeight: filterRooms === r ? 500 : 400 }}>{r}</button>
          ))}
        </div>
        <button onClick={() => load()} style={{ ...fltSt, cursor: 'pointer' }}>{tx.refresh}</button>
      </div>
      {error && <div style={{ margin: '1rem 1.5rem', padding: '.75rem 1rem', background: '#FCEBEB', border: '1px solid #D85A30', borderRadius: 6, fontSize: 13, color: '#A32D2D' }}>{error}</div>}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--ink3)' }}>{tx.loading}</div>
      ) : (
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <section style={{ background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 10, padding: '1.25rem' }}>
            <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 300, fontSize: '1rem', marginBottom: '1rem' }}>
              {filterRooms} PSF - 12 months{chartArea ? ': ' + chartArea : ''}
            </h2>
            {chartReady && trends.length > 0 ? (
              <TrendChart trends={trends} area={chartArea} rooms={filterRooms} />
            ) : (
              <div style={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink3)', fontSize: 13 }}>
                {isJa ? 'グラフを読み込み中...' : 'Loading chart...'}
              </div>
            )}
          </section>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 1, background: 'var(--line)' }}>
            {displayed.map(t => (
              <div key={t.area + ':' + t.rooms} style={{ background: 'var(--surf)', padding: '1rem 1.1rem', cursor: 'pointer' }}
                onClick={() => setChartArea(t.area)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontFamily: 'var(--serif)', fontWeight: 300, fontSize: '.9rem' }}>{t.area}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink3)' }}>{t.rooms}</div>
                  </div>
                  <ChangeChip pct={t.change} />
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 500, marginBottom: 4 }}>{t.current.toLocaleString()} psf</div>
                <div style={{ fontSize: 11, color: 'var(--ink3)' }}>{tx.txns}: {t.txnCount}</div>
              </div>
            ))}
            {displayed.length === 0 && (
              <div style={{ gridColumn: '1/-1', padding: '3rem', textAlign: 'center', color: 'var(--ink3)' }}>{tx.noResults}</div>
            )}
          </div>
        </div>
      )}
      <footer style={{ padding: '1rem', textAlign: 'center', fontSize: 11, color: 'var(--ink3)' }}>
        <p>{tx.dldNote}</p>
        <p style={{ marginTop: 4 }}>{tx.disclaimer}</p>
      </footer>
    </>
  )
}
