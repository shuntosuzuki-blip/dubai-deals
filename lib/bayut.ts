// lib/bayut.ts
// RapidAPI Unofficial Bayut API
// Sign up: https://rapidapi.com/DataHeist/api/bayut  (free 750 calls/mo)
// Set RAPIDAPI_KEY in .env.local

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

const RAPIDAPI_HOST = 'bayut.p.rapidapi.com'
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

function normaliseArea(raw: string): string {
  return AREA_MAP[raw.toLowerCase()] ?? raw
}

function normaliseRooms(beds: number): string {
  return beds === 0 ? 'Studio' : `${beds}BR`
}

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
}

async function rapidGet(path: string, params: Record<string, string>, key: string) {
  const url = new URL(`${BASE}${path}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString(), {
    headers: {
      'x-rapidapi-key': key,
      'x-rapidapi-host': RAPIDAPI_HOST,
    },
  })
  if (!res.ok) throw new Error(`Bayut API ${res.status}: ${await res.text()}`)
  return res.json()
}

export async function fetchBayutListings(opts: {
  rapidApiKey: string
  locationIds?: number[]
  minBeds?: number
  maxBeds?: number
  maxPrice?: number
  pageSize?: number
}): Promise<BayutListing[]> {
  const { rapidApiKey, locationIds, minBeds = 0, maxBeds = 4, maxPrice, pageSize = 50 } = opts
  const params: Record<string, string> = {
    purpose: 'for-sale',
    categoryExternalID: '4',
    hitsPerPage: String(pageSize),
    page: '0',
    lang: 'en',
    sort: 'city-level-score',
  }
  if (minBeds > 0) params.roomsMin = String(minBeds)
  if (maxBeds < 4) params.roomsMax = String(maxBeds)
  if (maxPrice) params.priceMax = String(maxPrice)
  if (locationIds?.length) params.locationExternalIDs = locationIds.join(',')
  const data = await rapidGet('/properties/list', params, rapidApiKey)
  const hits: Record<string, unknown>[] = data?.hits ?? []
  return hits
    .filter(h => Number(h.price) > 0 && Number(h.area) > 0)
    .map(h => {
      const loc = (h.location as Record<string,unknown>[] | undefined)?.[2]
      const rawArea = String((loc as Record<string,unknown>)?.name ?? '')
      const beds = Number((h as Record<string,unknown>).rooms ?? 0)
      const meta = (h.meta ?? {}) as Record<string, unknown>
      const createdAt = String(meta.createdAt ?? meta.created_at ?? '')
      const images = (h.coverPhoto ?? h.photos) as Record<string, unknown> | undefined
      const imageUrl = String(
        (images as Record<string, unknown>)?.url ??
        ((h.photos as Record<string, unknown>[])?.[0] as Record<string, unknown>)?.url ?? ''
      )
      const agent = (h.contactName ?? '') as string
      const legal = (h.legal ?? {}) as Record<string, unknown>
      return {
        id: String(h.externalID ?? h.id ?? ''),
        title: String(h.title ?? ''),
        url: `https://www.bayut.com/property/details-${h.externalID}.html`,
        area: normaliseArea(rawArea),
        rooms: normaliseRooms(beds),
        beds,
        sizeSqft: Math.round(Number(h.area)),
        askPrice: Math.round(Number(h.price)),
        yieldPct: 0,
        domDays: createdAt ? daysSince(createdAt) : 0,
        view: '',
        source: 'Bayut' as const,
        imageUrl,
        agentName: String(agent),
        permitNumber: String(legal.permit_number ?? ''),
      }
    })
    .filter(l => l.sizeSqft > 100 && l.askPrice > 100_000)
}
