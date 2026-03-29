// lib/bayut.ts
// Bayut14 API via RapidAPI (happyendpoint/bayut14)
// Host: bayut14.p.rapidapi.com
// Endpoint: /search-property

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

async function searchProperties(params: Record<string, string>, key: string): Promise<BayutListing[]> {
  const url = new URL(BASE + '/search-property')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString(), {
    headers: {
      'x-rapidapi-key': key,
      'x-rapidapi-host': HOST,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(12000),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error('Bayut14 ' + res.status + ': ' + text.slice(0, 100))
  }
  const json = await res.json()
  // Handle different response shapes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hits: any[] = json?.data ?? json?.results ?? json?.properties ?? json?.hits ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return hits.map((h: any) => {
    const beds = Number(h.rooms ?? h.beds ?? h.bedrooms ?? 0)
    const sizeSqm = Number(h.area ?? h.size ?? h.areaSize ?? 0)
    const sizeSqft = sizeSqm > 500 ? sizeSqm : Math.round(sizeSqm * 10.764) // if already sqft, keep
    const price = Number(h.price ?? h.priceAED ?? h.askingPrice ?? 0)
    // Get image
    const cover = h.coverPhoto ?? h.mainImage ?? h.photo ?? h.images?.[0]
    const imageUrl = typeof cover === 'string' ? cover : (cover?.url ?? cover?.thumbnail ?? '')
    // Get area name
    const areaName = h.location?.name ?? h.area?.name ?? h.district ?? h.neighborhood ?? 'Dubai'
    // Get URL
    const slug = h.slug ?? h.externalID ?? h.id ?? ''
    const listingUrl = h.url ?? h.link ?? ('https://www.bayut.com/property/details-' + slug + '.html')
    return {
      id: String(h.externalID ?? h.id ?? h._id ?? Math.random()),
      title: String(h.title ?? h.name ?? ''),
      url: listingUrl,
      area: areaName,
      rooms: parseRooms(beds),
      beds,
      sizeSqft,
      askPrice: price,
      yieldPct: 0,
      domDays: Number(h.daysListed ?? h.daysOnMarket ?? 0),
      view: String(h.view ?? ''),
      source: 'Bayut' as const,
      imageUrl,
      agentName: String(h.agent?.name ?? h.contactName ?? ''),
      permitNumber: String(h.permitNumber ?? h.permit ?? ''),
    }
  }).filter((l: BayutListing) => l.askPrice > 100000 && l.title.length > 0)
}

export async function fetchBayutListings(opts: { rapidApiKey: string; pageSize?: number }): Promise<BayutListing[]> {
  const { rapidApiKey, pageSize = 100 } = opts

  // Search for-sale properties in Dubai
  const params: Record<string, string> = {
    purpose: 'for-sale',
    locationExternalIDs: '5002,5001,11764,6020,5006', // Downtown, Marina, JVC, Business Bay, DIFC
    lang: 'en',
    hitsPerPage: String(Math.min(pageSize, 50)),
    page: '1',
    sort: 'date_desc',
    categoryExternalID: '4', // apartments
  }

  const listings = await searchProperties(params, rapidApiKey)
  if (listings.length === 0) throw new Error('No listings returned from Bayut14 API')
  return listings.slice(0, pageSize)
}
