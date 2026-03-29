// lib/bayut.ts
// Uses Bayut's native search API (the same one their website uses)
// No RapidAPI key needed - but RAPIDAPI_KEY env var presence still triggers live mode

export interface BayutListing {
  id: string; title: string; url: string; area: string; rooms: string; beds: number
  sizeSqft: number; askPrice: number; yieldPct: number; domDays: number; view: string
  source: 'Bayut'; imageUrl: string; agentName: string; permitNumber: string
}

// Dubai area location IDs on bayut.com
const LOCATION_IDS: Record<string, number> = {
  'Dubai Marina': 5001,
  'Downtown Dubai': 5002,
  'Jumeirah Village Circle': 11764,
  'Business Bay': 6020,
  'Palm Jumeirah': 5019,
  'DIFC': 5006,
  'Dubai Hills Estate': 56024,
}

function parseRoom(beds: number): string {
  if (beds === 0) return 'Studio'
  return beds + 'BR'
}

async function fetchLocation(locationId: number, purpose = 'for-sale'): Promise<BayutListing[]> {
  const params = new URLSearchParams({
    purpose, categoryExternalID: '4', locationExternalIDs: String(locationId),
    hitsPerPage: '25', page: '0', lang: 'en', sort: 'date_desc',
  })
  const url = 'https://www.bayut.com/api/properties/list/?' + params.toString()
  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; DubaiDeals/1.0)',
      'Referer': 'https://www.bayut.com/',
    },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error('Bayut API ' + res.status)
  const json = await res.json()
  const hits = json?.hits ?? json?.results ?? []
  const areaName = Object.entries(LOCATION_IDS).find(([, id]) => id === locationId)?.[0] ?? 'Dubai'
  return hits.map((h: Record<string, unknown>) => {
    const beds = Number(h.rooms ?? h.beds ?? 0)
    const size = Number(h.area ?? h.size ?? 0)
    const price = Number(h.price ?? h.priceAED ?? 0)
    const photos = (h.coverPhoto ?? (h.photos as Record<string,unknown>[])?.[0]) as Record<string,unknown>
    const imageUrl = String(photos?.url ?? photos?.thumbnail ?? '')
    const id = String(h.externalID ?? h.id ?? Math.random())
    const slug = String(h.slug ?? h.externalID ?? id)
    return {
      id, title: String(h.title ?? h.name ?? ''),
      url: 'https://www.bayut.com/property/details-' + slug + '.html',
      area: areaName, rooms: parseRoom(beds), beds,
      sizeSqft: Math.round(size * 10.764), // m2 to sqft
      askPrice: price,
      yieldPct: 0, // calculated later
      domDays: 0,
      view: '',
      source: 'Bayut' as const,
      imageUrl,
      agentName: String((h.agency as Record<string,unknown>)?.name ?? ''),
      permitNumber: String(h.permitNumber ?? ''),
    }
  }).filter((l: BayutListing) => l.askPrice > 0 && l.sizeSqft > 0)
}

export async function fetchBayutListings(opts: { rapidApiKey: string; pageSize?: number }): Promise<BayutListing[]> {
  // Fetch from top areas in parallel
  const locationIds = Object.values(LOCATION_IDS).slice(0, 5)
  const results = await Promise.allSettled(locationIds.map(id => fetchLocation(id)))
  const all: BayutListing[] = []
  for (const r of results) {
    if (r.status === 'fulfilled') all.push(...r.value)
  }
  if (all.length === 0) throw new Error('No listings from Bayut')
  return all.slice(0, opts.pageSize ?? 100)
}
