// lib/bayut.ts
// Bayut listing data via Algolia search (same backend Bayut.com uses)

export interface BayutListing {
  id: string; title: string; url: string; area: string; rooms: string; beds: number
  sizeSqft: number; askPrice: number; yieldPct: number; domDays: number; view: string
  source: 'Bayut'; imageUrl: string; agentName: string; permitNumber: string
}

const ALGOLIA_APP = 'LL8IZ711CS'
const ALGOLIA_KEY = 'strat_a5e4568c'
const ALGOLIA_INDEX = 'bayut-production-ads-bi-score-ranking-en'
const ALGOLIA_URL = 'https://LL8IZ711CS-dsn.algolia.net/1/indexes/' + ALGOLIA_INDEX + '/query'

// Area filter IDs for Bayut Algolia
const AREA_FILTERS = [
  'location.externalIDs:5002',  // Downtown Dubai
  'location.externalIDs:5001',  // Dubai Marina
  'location.externalIDs:11764', // JVC
  'location.externalIDs:6020',  // Business Bay
  'location.externalIDs:5006',  // DIFC
].join(' OR ')

function parseRooms(beds: number): string {
  return beds === 0 ? 'Studio' : beds + 'BR'
}

async function algoliaSearch(filters: string, page = 0): Promise<BayutListing[]> {
  const body = {
    query: '',
    filters: `purpose:"for-sale" AND category.externalID:4 AND (${filters})`,
    hitsPerPage: 50,
    page,
    attributesToRetrieve: [
      'externalID','title','price','rooms','area','coverPhoto','slug',
      'location','size','agency','permitNumber','baths',
    ],
  }
  const res = await fetch(ALGOLIA_URL, {
    method: 'POST',
    headers: {
      'X-Algolia-Application-Id': ALGOLIA_APP,
      'X-Algolia-API-Key': ALGOLIA_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) throw new Error('Algolia ' + res.status + ': ' + await res.text())
  const json = await res.json()
  if (json.message) throw new Error('Algolia error: ' + json.message)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (json.hits ?? []).map((h: any) => {
    const beds = Number(h.rooms ?? 0)
    const sizeSqm = Number(h.size ?? 0)
    const sizeSqft = Math.round(sizeSqm * 10.764)
    const price = Number(h.price ?? 0)
    const areaName = h.location?.find((l: {level: number; name: string}) => l.level === 3)?.name
      ?? h.location?.[h.location.length - 1]?.name ?? 'Dubai'
    const cover = h.coverPhoto as {url?: string; thumbnail?: string} | undefined
    const imageUrl = cover?.url ?? cover?.thumbnail ?? ''
    const slug = String(h.slug ?? h.externalID ?? '')
    return {
      id: String(h.externalID ?? Math.random()),
      title: String(h.title ?? ''),
      url: 'https://www.bayut.com/property/details-' + slug + '.html',
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
      agentName: String((h.agency as {name?: string})?.name ?? ''),
      permitNumber: String(h.permitNumber ?? ''),
    }
  }).filter((l: BayutListing) => l.askPrice > 100000 && l.sizeSqft > 100)
}

export async function fetchBayutListings(opts: { rapidApiKey: string; pageSize?: number }): Promise<BayutListing[]> {
  const listings = await algoliaSearch(AREA_FILTERS, 0)
  if (listings.length === 0) throw new Error('No listings from Algolia')
  return listings.slice(0, opts.pageSize ?? 100)
}
