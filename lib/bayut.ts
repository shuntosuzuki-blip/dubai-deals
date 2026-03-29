// lib/bayut.ts - bayut14 API (happyendpoint via RapidAPI)
export interface BayutListing {
  id: string; title: string; url: string; area: string; rooms: string; beds: number
  sizeSqft: number; askPrice: number; yieldPct: number; domDays: number; view: string
  source: 'Bayut'; imageUrl: string; agentName: string; permitNumber: string
}

const HOST = 'bayut14.p.rapidapi.com'
const BASE = 'https://' + HOST

function parseRooms(beds: number): string { return beds === 0 ? 'Studio' : beds + 'BR' }

function extractArea(location: Array<{level: number; name: string}> | undefined): string {
  if (!location || location.length === 0) return 'Dubai'
  // Level 2 = district (e.g. "Jumeirah Village Circle (JVC)", "Arjan", "Business Bay")
  const lvl2 = location.find(l => l.level === 2)
  const best = lvl2 ?? location.find(l => l.level === 1) ?? location[location.length - 1]
  // Remove parenthetical abbreviations: "Jumeirah Village Circle (JVC)" -> "Jumeirah Village Circle"
  return (best?.name ?? 'Dubai').replace(/\s*\([^)]+\)$/g, '').trim()
}

export async function fetchBayutListings(opts: { rapidApiKey: string; pageSize?: number }): Promise<BayutListing[]> {
  const { rapidApiKey, pageSize = 50 } = opts
  const params = new URLSearchParams({
    purpose: 'for-sale',
    locationExternalIDs: '5002,5001,11764,6020,5006,56024',
    lang: 'en',
    hitsPerPage: String(Math.min(pageSize, 50)),
    page: '1',
    categoryExternalID: '4',
    sort: 'price_asc',
  })
  const res = await fetch(BASE + '/search-property?' + params, {
    headers: { 'x-rapidapi-key': rapidApiKey, 'x-rapidapi-host': HOST },
    signal: AbortSignal.timeout(12000),
  })
  if (!res.ok) throw new Error('Bayut14 ' + res.status + ': ' + (await res.text()).slice(0, 100))
  const json = await res.json()
  if (!json.success) throw new Error('Bayut14: ' + JSON.stringify(json.error ?? '').slice(0, 100))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hits: any[] = json?.data?.properties ?? []
  if (hits.length === 0) throw new Error('No properties returned')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return hits.map((h: any) => {
    const beds = Number(h.rooms ?? 0)
    const sizeSqft = Math.round(Number(h.area ?? 0) * 10.764)
    const price = Number(h.price ?? 0)
    const area = extractArea(h.location)
    // Slug: "details_14182453" -> URL: "details-14182453.html"
    const rawSlug: string = h.slug?.en ?? String(h.externalID ?? h.id ?? '')
    const urlId = rawSlug.replace('details_', '')
    const url = 'https://www.bayut.com/property/details-' + urlId + '.html'
    return {
      id: String(h.externalID ?? h.id ?? Math.random()),
      title: h.title?.en ?? String(h.title ?? ''),
      url, area,
      rooms: parseRooms(beds), beds, sizeSqft, askPrice: price,
      yieldPct: 0, domDays: 0, view: '',
      source: 'Bayut' as const,
      imageUrl: '',
      agentName: String(h.agency?.name ?? ''),
      permitNumber: String(h.permitNumber ?? ''),
    }
  }).filter((l: BayutListing) => l.askPrice > 100000 && l.sizeSqft > 50 && l.title.length > 0)
}
