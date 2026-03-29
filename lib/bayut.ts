// lib/bayut.ts
// bayut14 API (happyendpoint) via RapidAPI
// Uses correct locationExternalIDs matching DLD area names

export interface BayutListing {
  id: string; title: string; url: string; area: string; rooms: string; beds: number
  sizeSqft: number; askPrice: number; yieldPct: number; domDays: number; view: string
  source: 'Bayut'; imageUrl: string; agentName: string; permitNumber: string
}

const HOST = 'bayut14.p.rapidapi.com'
const BASE = 'https://' + HOST

// Bayut externalIDs matching DLD area names exactly
const DLD_AREAS: Record<string, string> = {
  '5003':  'Dubai Marina',
  '5093':  'Business Bay',
  '5416':  'Jumeirah Village Circle',
  '6901':  'Downtown Dubai',
  '5374':  'DIFC',
  '8288':  'Dubai Hills Estate',
}

function parseRooms(beds: number): string {
  return beds === 0 ? 'Studio' : beds + 'BR'
}

export async function fetchBayutListings(opts: { rapidApiKey: string; pageSize?: number }): Promise<BayutListing[]> {
  const { rapidApiKey, pageSize = 50 } = opts

  const locationIds = Object.keys(DLD_AREAS).join(',')
  const params = new URLSearchParams({
    purpose: 'for-sale',
    locationExternalIDs: locationIds,
    lang: 'en',
    hitsPerPage: '50',
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
  if (!json.success) throw new Error('Bayut14: ' + JSON.stringify(json.error ?? json).slice(0, 100))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hits: any[] = json?.data?.properties ?? []
  if (hits.length === 0) throw new Error('No properties returned from Bayut14')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return hits.map((h: any) => {
    const beds = Number(h.rooms ?? 0)
    const sizeSqm = Number(h.area ?? 0)
    const sizeSqft = Math.round(sizeSqm * 10.764)
    const price = Number(h.price ?? 0)

    // Map location back to DLD area name using externalID
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const loc: any[] = h.location ?? []
    let areaName = 'Dubai'
    for (const l of loc) {
      const mapped = DLD_AREAS[String(l.externalID)]
      if (mapped) { areaName = mapped; break }
    }

    const rawSlug = h.slug?.en ?? ''
    const slug = rawSlug.replace('details_', 'details-') || ('details-' + String(h.externalID ?? h.id ?? ''))
    const listingUrl = 'https://www.bayut.com/property/' + slug + '.html'

    return {
      id: String(h.externalID ?? h.id ?? Math.random()),
      title: h.title?.en ?? String(h.title ?? ''),
      url: listingUrl,
      area: areaName,
      rooms: parseRooms(beds),
      beds,
      sizeSqft,
      askPrice: price,
      yieldPct: 0,   // calculated by score.ts from price/size
      domDays: 0,
      view: '',
      source: 'Bayut' as const,
      imageUrl: '',
      agentName: String(h.contactName ?? ''),
      permitNumber: String(h.permitNumber ?? ''),
    }
  }).filter((l: BayutListing) => l.askPrice > 100000 && l.sizeSqft > 50 && l.title.length > 0)
}
