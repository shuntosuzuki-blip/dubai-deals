// lib/dld.ts - Dubai Land Department Open Data (no auth required)

export interface AreaMarket {
  area: string
  rooms: string
  medianPsf: number
  avgPsf: number
  txnCount: number
  samples: { date: string; psf: number }[]
}

export function normaliseRooms(raw: string): string {
  const s = (raw ?? '').toLowerCase()
  if (s.includes('studio')) return 'Studio'
  const m = s.match(/(\d+)/)
  if (m) return `${m[1]}BR`
  return raw
}

export async function fetchMarketStats(monthsBack = 6): Promise<AreaMarket[]> {
  const from = new Date()
  from.setMonth(from.getMonth() - monthsBack)
  const fromStr = from.toISOString().split('T')[0]
  const toStr   = new Date().toISOString().split('T')[0]

  const url = new URL('https://gateway.dubailand.gov.ae/open-data/transactions')
  url.searchParams.set('start_date', fromStr)
  url.searchParams.set('end_date', toStr)
  url.searchParams.set('transaction_type', 'Sales')
  url.searchParams.set('is_offplan', 'false')
  url.searchParams.set('per_page', '2000')
  url.searchParams.set('page', '1')

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    next: { revalidate: 3600 },
  })
  if (!res.ok) throw new Error('DLD ' + res.status)

  const json = await res.json()
  const rows: Record<string, unknown>[] =
    json?.data?.transactions ?? json?.transactions ?? json?.data ?? []

  const groups = new Map<string, number[]>()
  const sampleMap = new Map<string, { date: string; psf: number }[]>()

  for (const r of rows) {
    const area  = Number(r.procedure_area)
    const worth = Number(r.actual_worth)
    if (!area || !worth) continue
    const psf  = worth / area
    const key  = `${r.area_name_en}::${normaliseRooms(String(r.rooms_en ?? ''))}`
    const arr  = groups.get(key) ?? []; arr.push(psf); groups.set(key, arr)
    const sArr = sampleMap.get(key) ?? []
    sArr.push({ date: String(r.transaction_date ?? '').slice(0, 7), psf: Math.round(psf) })
    sampleMap.set(key, sArr)
  }

  const stats: AreaMarket[] = []
  for (const [key, psfs] of groups) {
    if (psfs.length < 3) continue
    const [area, rooms] = key.split('::')
    const sorted = [...psfs].sort((a, b) => a - b)
    const mid    = Math.floor(sorted.length / 2)
    const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
    const avg    = sorted.reduce((s, v) => s + v, 0) / sorted.length
    const samples = (sampleMap.get(key) ?? [])
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 6)
    stats.push({ area, rooms, medianPsf: Math.round(median), avgPsf: Math.round(avg),
      txnCount: psfs.length, samples })
  }
  return stats
}
