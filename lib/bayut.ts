// lib/bayut.ts
// bayut14 API (happyendpoint) via RapidAPI
// Response: { success: true, data: { properties: [...] } }

export interface BayutListing {
  id: string; title: string; url: string; area: string; rooms: string; beds: number
  sizeSqft: number; askPrice: number; yieldPct: number; domDays: number; view: string
  source: 'Bayut'; imageUrl: string; agentName: string; permitNumber: string
}

const HOST = 'bayut14.p.rapidapi.com'
const BASE = 'https://' + HOST

function parseRooms(beds: number): string {
  return beds === 0 ? 'Studio' : beds + 'BR'
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

  const url = BASE + '/search-property?' + params.toString()
  const res = await fetch(url, {
    headers: { 'x-rapidapi-key': rapidApiKey, 'x-rapidapi-host': HOST },
    signal: AbortSignal.timeout(12000),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error('Bayut14 ' + res.status + ': ' + text.slice(0, 200))
  }
  const json = await res.json()
  if (!json.success) throw new Error('Bayut14 API error: ' + JSON.stringify(json.error ?? json).slice(0, 100))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hits: any[] = json?.data?.properties ?? json?.data?.hits ?? json?.data ?? []
  if (hits.length === 0) throw new Error('No properties returned')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return hits.map((h: any) => {
    const beds = Number(h.rooms ?? h.bedrooms ?? 0)
    const sizeSqm = Number(h.area ?? 0)
    const sizeSqft = Math.round(sizeSqm * 10.764)
    const price = Number(h.price ?? 0)

    // Location: array ordered by level, level 3 = district, level 4 = subdistrict
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const loc = (h.location as any[]) ?? []
    const district = loc.find(l => l.level === 2) ?? loc.find(l => l.level === 3) ?? loc[loc.length - 1]
    const areaName = district?.name ?? 'Dubai'

    // Cover photo: just the externalID, real URL needs separate call — use empty for now
    const imageUrl = ''

    const rawSlug = h.slug?.en ?? h.slug ?? ''
    const slug = rawSlug.replace('details_', 'details-') || ('details-' + String(h.externalID ?? h.id ?? ''))
    const listingUrl = 'https://www.bayut.com/property/' + slug + '.html'

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const agent = h.contactName ?? (h.agent as any)?.name ?? ''

    return {
      id: String(h.externalID ?? h.id ?? Math.random()),
      title: h.title?.en ?? String(h.title ?? ''),
      url: listingUrl,
      area: areaName,
      rooms: parseRooms(beds),
      beds,
      sizeSqft,
      askPrice: price,
      yieldPct: 0,
      domDays: 0,
      view: '',
      source: 'Bayut' as const,
      imageUrl,
      agentName: String(agent),
      permitNumber: String(h.permitNumber ?? ''),
    }
  }).filter((l: BayutListing) => l.askPrice > 100000 && l.sizeSqft > 50 && l.title.length > 0)
}
