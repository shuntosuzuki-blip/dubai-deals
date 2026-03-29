// pages/api/market.ts
import type { NextApiRequest, NextApiResponse } from 'next'

export interface MonthlyPoint { month: string; medianPsf: number; txnCount: number }
export interface AreaTrend {
  area: string; rooms: string; current: number; prev: number;
  change: number; txnCount: number; trend: MonthlyPoint[]
}

// Seed market trends (fallback when DLD API unavailable)
const SEED_TRENDS: AreaTrend[] = [
  { area:'Downtown Dubai', rooms:'1BR', current:3100, prev:3000, change:3.3, txnCount:85, trend:[{month:'2024-04',medianPsf:2800,txnCount:12},{month:'2024-05',medianPsf:2900,txnCount:14},{month:'2024-06',medianPsf:2950,txnCount:11},{month:'2024-07',medianPsf:3000,txnCount:13},{month:'2024-08',medianPsf:3050,txnCount:15},{month:'2024-09',medianPsf:3100,txnCount:10}] },
  { area:'Dubai Marina', rooms:'1BR', current:1950, prev:1900, change:2.6, txnCount:110, trend:[{month:'2024-04',medianPsf:1750,txnCount:18},{month:'2024-05',medianPsf:1800,txnCount:20},{month:'2024-06',medianPsf:1820,txnCount:17},{month:'2024-07',medianPsf:1850,txnCount:19},{month:'2024-08',medianPsf:1900,txnCount:22},{month:'2024-09',medianPsf:1950,txnCount:14}] },
  { area:'Jumeirah Village Circle', rooms:'1BR', current:1100, prev:1080, change:1.9, txnCount:120, trend:[{month:'2024-04',medianPsf:1000,txnCount:22},{month:'2024-05',medianPsf:1020,txnCount:24},{month:'2024-06',medianPsf:1040,txnCount:20},{month:'2024-07',medianPsf:1060,txnCount:21},{month:'2024-08',medianPsf:1080,txnCount:19},{month:'2024-09',medianPsf:1100,txnCount:14}] },
  { area:'Business Bay', rooms:'2BR', current:1850, prev:1820, change:1.6, txnCount:90, trend:[{month:'2024-04',medianPsf:1700,txnCount:15},{month:'2024-05',medianPsf:1730,txnCount:17},{month:'2024-06',medianPsf:1760,txnCount:14},{month:'2024-07',medianPsf:1790,txnCount:16},{month:'2024-08',medianPsf:1820,txnCount:18},{month:'2024-09',medianPsf:1850,txnCount:10}] },
  { area:'DIFC', rooms:'Studio', current:2250, prev:2200, change:2.3, txnCount:60, trend:[{month:'2024-04',medianPsf:2050,txnCount:10},{month:'2024-05',medianPsf:2100,txnCount:11},{month:'2024-06',medianPsf:2130,txnCount:9},{month:'2024-07',medianPsf:2160,txnCount:10},{month:'2024-08',medianPsf:2200,txnCount:12},{month:'2024-09',medianPsf:2250,txnCount:8}] },
  { area:'Dubai Hills Estate', rooms:'1BR', current:1420, prev:1390, change:2.2, txnCount:95, trend:[{month:'2024-04',medianPsf:1280,txnCount:16},{month:'2024-05',medianPsf:1310,txnCount:18},{month:'2024-06',medianPsf:1330,txnCount:15},{month:'2024-07',medianPsf:1360,txnCount:17},{month:'2024-08',medianPsf:1390,txnCount:16},{month:'2024-09',medianPsf:1420,txnCount:13}] },
]

let cache: { data: object; ts: number } | null = null
const TTL = 3600 * 1000

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()
  const bust = req.query.bust === '1'
  if (!bust && cache && Date.now() - cache.ts < TTL) {
    res.setHeader('X-Cache', 'HIT'); return res.status(200).json(cache.data)
  }

  let trends = SEED_TRENDS

  // Try live DLD data
  try {
    const from = new Date(); from.setMonth(from.getMonth() - 12)
    const fromStr = from.toISOString().split('T')[0]
    const toStr = new Date().toISOString().split('T')[0]
    const url = new URL('https://gateway.dubailand.gov.ae/open-data/transactions')
    url.searchParams.set('start_date', fromStr); url.searchParams.set('end_date', toStr)
    url.searchParams.set('transaction_type', 'Sales'); url.searchParams.set('is_offplan', 'false')
    url.searchParams.set('per_page', '3000'); url.searchParams.set('page', '1')
    const r = await fetch(url.toString(), { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) })
    if (r.ok) {
      const json = await r.json()
      const rows: Record<string, unknown>[] = json?.data?.transactions ?? json?.transactions ?? json?.data ?? []
      if (rows.length > 0) {
        // Process DLD data into trends
        const groups = new Map<string, { month: string; psf: number }[]>()
        for (const row of rows) {
          const area = Number(row.procedure_area), worth = Number(row.actual_worth)
          if (!area || !worth) continue
          const psf = worth / area
          const month = String(row.transaction_date || '').slice(0, 7)
          if (!month.match(/^\d{4}-\d{2}$/)) continue
          const rooms = String(row.rooms_en || '').toLowerCase().includes('studio') ? 'Studio'
            : (() => { const m = String(row.rooms_en || '').match(/(\d+)/); return m ? m[1]+'BR' : String(row.rooms_en || '') })()
          const key = String(row.area_name_en || '') + '::' + rooms
          const arr = groups.get(key) || []; arr.push({ month, psf }); groups.set(key, arr)
        }
        const liveTrends: AreaTrend[] = []
        for (const [key, points] of groups) {
          if (points.length < 5) continue
          const [area, rooms] = key.split('::')
          const byMonth = new Map<string, number[]>()
          for (const p of points) { const a = byMonth.get(p.month)||[]; a.push(p.psf); byMonth.set(p.month, a) }
          const months = [...byMonth.keys()].sort()
          const trend = months.map(m => {
            const psfs = (byMonth.get(m)||[]).sort((a,b)=>a-b)
            const mid = Math.floor(psfs.length/2)
            return { month: m, medianPsf: Math.round(psfs.length%2===0?(psfs[mid-1]+psfs[mid])/2:psfs[mid]), txnCount: psfs.length }
          })
          if (trend.length < 2) continue
          const current = trend[trend.length-1].medianPsf, prev = trend[trend.length-2].medianPsf
          liveTrends.push({ area, rooms, current, prev, change: Math.round((current-prev)/prev*1000)/10, txnCount: points.length, trend })
        }
        if (liveTrends.length > 0) trends = liveTrends.sort((a,b)=>b.txnCount-a.txnCount)
      }
    }
  } catch {
    console.log('[market] DLD unavailable, using seed trends')
  }

  const payload = { trends, fetchedAt: new Date().toISOString() }
  cache = { data: payload, ts: Date.now() }
  res.setHeader('Cache-Control', 's-maxage=3600,stale-while-revalidate=300')
  return res.status(200).json(payload)
}
