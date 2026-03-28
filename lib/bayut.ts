// lib/bayut.ts
export interface BayutListing {
  id: string
  title: string
  url: string
  area: string
  rooms: string
  beds: number
  sizeSqft: number
  askPrice: number
  yieldPct: number
  domDays: number
  view: string
  source: 'Bayut'
  imageUrl: string
  agentName: string
  permitNumber: string
}

const RAPTIDAPI_HOST = 'bayut.p.rapidapi.com'
const BASE = 'https://bayut.p.rapidapi.com'

const AREA_MAP: Record<string, string> = {
  'downtown dubai': 'Downtown Dubai',
  'dubai marina': 'Dubai Marina',
  'jumeirah village circle': 'Jumeirah Village Circle',
  'jvc': 'Jumeirah Village Circle',
  'business bay': 'Business Bay',
  'palm jumeirah': 'Palm Jumeirah',
  'difc': 'DIFC',
  'dubai hills estate': 'Dubai Hills Estate',
  'jumeirah beach residence': 'Jumeirah Beach Residence',
  'jbr': 'Jumeirah Beach Residence',
}

function normArea(raw: string): string {
  return AREA_MAP[raw.toLowerCase()] ?? raw
}
function normRooms(beds: number): string {
  return beds === 0 ? 'Studio' : `${beds}BR`
}
function daysSince(d: string): number {
  return Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000)
}

export async function fetchBayutListings(opts: {
  rapidApiKey: string
  pageSize?: number
}): Promise<BayutListing[]> {
  const { rapidApiKey, pageSize = 50 } = opts
  const url = new URL(`${BASE}/properties/list`)
  url.searchParams.set('purpose', 'for-sale')
  url.searchParams.set('categoryExternalID', '4')
  url.searchParams.set('hitsPerPage', String(pageSize))
  url.searchParams.set('page', '0')
  url.searchParams.set('lang', 'en')
  url.searchParams.set('sort', 'city-level-score')
  const res = await fetch(url.toString(), {
    headers: { 'x-rapidapi-key': rapidApiKey, 'x-rapidapi-host': RAPTDAPI_HOST },
    next: { revalidate: 3600 },
  })
  if (!res.ok) throw new Error(`Bayut ${res.status}`)
  const data = await res.json()
  const hits: Record<string, unknown>[] = data?.hits ?? []
  return hits.filter(h => Number(h.price) > 0 && Number(h.area) > 0).map(h => {
    const loc = (h.location as any[])?.[2]
    const rawArea = String((loc as any).name ?? '')
    const beds = Number((h as any).rooms ?? 0)
    const meta = (h.meta ?? {}) as any
    const createdAt = String(meta.createdAt ?? meta.created_at ?? '')
    const img = (h.coverPhoto ?? (h.photos as any[])?.[0]) as any
    return {
      id: String((h as any).externalID ?? h.id ?? ''),
      title: String(h.title ?? ''),
      url: `https://www.bayut.com/property/details-${(h as any).externalID}.html`,
      area: normArea(rawArea),
      rooms: normRooms(beds),
      beds,
      sizeSqft: Math.round(Number(h.area)),
      askPrice: Math.round(Number(h.price)),
      yieldPct: 0,
      domDays: createdAt ? daysSince(createdAt) : 0,
      view: '',
      source: 'Bayut' as const,
      imageUrl: String(img?.url ?? ''),
      agentName: String((h as any).contactName ?? ''),
      permitNumber: String(((h.legal as any)?.permit_number ?? ''),
    }
  }).filter(l => l.sizeSqft > 100 && l.askPrice > 100_000)
}
