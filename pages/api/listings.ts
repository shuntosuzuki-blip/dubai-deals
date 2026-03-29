// pages/api/listings.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { scoreListings } from '../../lib/score'
import type { AreaMarket } from '../../lib/dld'

// Expanded seed market data covering all Bayut area names
const SEED_MARKET: AreaMarket[] = [
  // JVC variants
  { area:'Jumeirah Village Circle', rooms:'Studio', medianPsf:1000, avgPsf:1050, txnCount:80, samples:[] },
  { area:'Jumeirah Village Circle', rooms:'1BR', medianPsf:1100, avgPsf:1150, txnCount:120, samples:[] },
  { area:'Jumeirah Village Circle', rooms:'2BR', medianPsf:1050, avgPsf:1100, txnCount:90, samples:[] },
  // Business Bay
  { area:'Business Bay', rooms:'Studio', medianPsf:1600, avgPsf:1650, txnCount:70, samples:[] },
  { area:'Business Bay', rooms:'1BR', medianPsf:1750, avgPsf:1800, txnCount:95, samples:[] },
  { area:'Business Bay', rooms:'2BR', medianPsf:1800, avgPsf:1850, txnCount:90, samples:[] },
  // Dubai Marina
  { area:'Dubai Marina', rooms:'Studio', medianPsf:2000, avgPsf:2100, txnCount:100, samples:[] },
  { area:'Dubai Marina', rooms:'1BR', medianPsf:1900, avgPsf:1950, txnCount:110, samples:[] },
  { area:'Dubai Marina', rooms:'2BR', medianPsf:1850, avgPsf:1900, txnCount:85, samples:[] },
  // Downtown Dubai
  { area:'Downtown Dubai', rooms:'Studio', medianPsf:2600, avgPsf:2700, txnCount:60, samples:[] },
  { area:'Downtown Dubai', rooms:'1BR', medianPsf:2800, avgPsf:2900, txnCount:75, samples:[] },
  { area:'Downtown Dubai', rooms:'2BR', medianPsf:2500, avgPsf:2600, txnCount:65, samples:[] },
  // DIFC
  { area:'DIFC', rooms:'Studio', medianPsf:2200, avgPsf:2300, txnCount:60, samples:[] },
  { area:'DIFC', rooms:'1BR', medianPsf:2400, avgPsf:2500, txnCount:55, samples:[] },
  // Dubai Hills
  { area:'Dubai Hills Estate', rooms:'1BR', medianPsf:1400, avgPsf:1450, txnCount:95, samples:[] },
  { area:'Dubai Hills Estate', rooms:'2BR', medianPsf:1350, avgPsf:1400, txnCount:80, samples:[] },
  // Arjan (Binghatti area)
  { area:'Arjan', rooms:'Studio', medianPsf:1200, avgPsf:1250, txnCount:85, samples:[] },
  { area:'Arjan', rooms:'1BR', medianPsf:1150, avgPsf:1200, txnCount:100, samples:[] },
  { area:'Arjan', rooms:'2BR', medianPsf:1100, avgPsf:1150, txnCount:70, samples:[] },
  // Meydan / MBR
  { area:'Meydan', rooms:'1BR', medianPsf:1600, avgPsf:1650, txnCount:55, samples:[] },
  { area:'Meydan City', rooms:'1BR', medianPsf:1600, avgPsf:1650, txnCount:55, samples:[] },
  // Dubai South
  { area:'Dubai South', rooms:'Studio', medianPsf:950, avgPsf:1000, txnCount:60, samples:[] },
  { area:'Dubai South', rooms:'1BR', medianPsf:900, avgPsf:950, txnCount:65, samples:[] },
  // Al Jaddaf
  { area:'Al Jaddaf', rooms:'Studio', medianPsf:1400, avgPsf:1450, txnCount:50, samples:[] },
  { area:'Al Jaddaf', rooms:'1BR', medianPsf:1500, avgPsf:1550, txnCount:55, samples:[] },
  // Palm Jumeirah
  { area:'Palm Jumeirah', rooms:'Studio', medianPsf:2800, avgPsf:2900, txnCount:40, samples:[] },
  { area:'Palm Jumeirah', rooms:'1BR', medianPsf:3000, avgPsf:3100, txnCount:50, samples:[] },
  // Sobha Hartland / Hartland
  { area:'Sobha Hartland', rooms:'1BR', medianPsf:1500, avgPsf:1550, txnCount:60, samples:[] },
  { area:'Mohammed Bin Rashid City', rooms:'1BR', medianPsf:1500, avgPsf:1550, txnCount:60, samples:[] },
  // Creek Harbour
  { area:'Dubai Creek Harbour', rooms:'Studio', medianPsf:1700, avgPsf:1750, txnCount:55, samples:[] },
  { area:'Dubai Creek Harbour', rooms:'1BR', medianPsf:1800, avgPsf:1850, txnCount:60, samples:[] },
  // Emaar South
  { area:'Emaar South', rooms:'1BR', medianPsf:950, avgPsf:1000, txnCount:50, samples:[] },
  { area:'Emaar South', rooms:'2BR', medianPsf:900, avgPsf:950, txnCount:45, samples:[] },
  // Town Square
  { area:'Town Square', rooms:'Studio', medianPsf:850, avgPsf:900, txnCount:55, samples:[] },
  { area:'Town Square', rooms:'1BR', medianPsf:900, avgPsf:950, txnCount:60, samples:[] },
  // Weybridge / Samana areas (commonly seen in Bayut listings)
  { area:'Dubai Production City (IMPZ)', rooms:'Studio', medianPsf:950, avgPsf:1000, txnCount:45, samples:[] },
  { area:'Jumeirah Village Triangle', rooms:'Studio', medianPsf:900, avgPsf:950, txnCount:50, samples:[] },
  { area:'Jumeirah Village Triangle', rooms:'1BR', medianPsf:950, avgPsf:1000, txnCount:55, samples:[] },
  { area:'Dubai Sports City', rooms:'Studio', medianPsf:850, avgPsf:900, txnCount:50, samples:[] },
  { area:'Dubai Sports City', rooms:'1BR', medianPsf:900, avgPsf:950, txnCount:55, samples:[] },
  // Skyscape / Sobha
  { area:'Skyscape', rooms:'1BR', medianPsf:2000, avgPsf:2100, txnCount:40, samples:[] },
  { area:'Weybridge Gardens', rooms:'1BR', medianPsf:1200, avgPsf:1250, txnCount:45, samples:[] },
  { area:'Samana Barari Views 2', rooms:'Studio', medianPsf:1100, avgPsf:1150, txnCount:40, samples:[] },
  { area:'Binghatti Titania', rooms:'Studio', medianPsf:1200, avgPsf:1250, txnCount:45, samples:[] },
  { area:'Binghatti Titania', rooms:'1BR', medianPsf:1200, avgPsf:1250, txnCount:45, samples:[] },
  { area:'Peace Lagoons', rooms:'Studio', medianPsf:950, avgPsf:1000, txnCount:40, samples:[] },
]

// Average rental yield by area (annual gross yield %)
const YIELD_BY_AREA: Record<string, number> = {
  'Arjan': 8.5,
  'Jumeirah Village Circle': 8.0,
  'Jumeirah Village Triangle': 7.5,
  'Business Bay': 7.5,
  'Dubai Marina': 7.0,
  'Downtown Dubai': 6.5,
  'DIFC': 7.0,
  'Dubai Hills Estate': 6.8,
  'Dubai South': 9.0,
  'Town Square': 8.5,
  'Dubai Sports City': 8.0,
  'Meydan': 7.0,
  'Al Jaddaf': 7.5,
  'Emaar South': 8.0,
  'Palm Jumeirah': 5.5,
  'Sobha Hartland': 6.5,
  'Dubai Creek Harbour': 7.0,
}
const DEFAULT_YIELD = 7.0

let cache: { data: object; ts: number } | null = null
const TTL = 60 * 60 * 1000

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()
  const bust = req.query.bust === '1'
  if (!bust && cache && Date.now() - cache.ts < TTL) {
    res.setHeader('X-Cache', 'HIT'); return res.status(200).json(cache.data)
  }

  let market = SEED_MARKET
  let rawListings: ReturnType<typeof Array.prototype.map> = []
  let usingSeed = true

  // Try DLD market data
  try {
    const { fetchMarketStats } = await import('../../lib/dld')
    const live = await fetchMarketStats(6)
    if (live.length > 0) { market = live }
  } catch { /* use seed market */ }

  // Try Bayut
  const rapidApiKey = process.env.RAPIDAPI_KEY
  if (rapidApiKey) {
    try {
      const { fetchBayutListings } = await import('../../lib/bayut')
      rawListings = await fetchBayutListings({ rapidApiKey, pageSize: 100 })
      usingSeed = false
    } catch(e) {
      console.log('[listings] Bayut error:', String(e))
    }
  }

  // If no live listings, use seed
  if (rawListings.length === 0) {
    const { default: seedData } = await import('../../lib/bayut').catch(() => ({ default: null }))
    usingSeed = true
    // Use hardcoded seed
    rawListings = [
      { id:'S001', title:'Binghatti Nova 1BR', url:'https://www.bayut.com', area:'Jumeirah Village Circle', rooms:'1BR', beds:1, sizeSqft:682, askPrice:710000, yieldPct:9.3, domDays:7, view:'Pool', source:'Bayut' as const, imageUrl:'', agentName:'', permitNumber:'' },
      { id:'S002', title:'Marquise Square 2BR', url:'https://www.bayut.com', area:'Business Bay', rooms:'2BR', beds:2, sizeSqft:1108, askPrice:1580000, yieldPct:8.0, domDays:38, view:'Canal', source:'Bayut' as const, imageUrl:'', agentName:'', permitNumber:'' },
      { id:'S003', title:'Ciel Tower Studio', url:'https://www.bayut.com', area:'Dubai Marina', rooms:'Studio', beds:0, sizeSqft:445, askPrice:870000, yieldPct:8.1, domDays:9, view:'Sea', source:'Bayut' as const, imageUrl:'', agentName:'', permitNumber:'' },
    ]
  }

  // Inject yield estimates for live listings where yieldPct = 0
  const listingsWithYield = rawListings.map((l: {area: string; yieldPct: number}) => ({
    ...l,
    yieldPct: l.yieldPct > 0 ? l.yieldPct : (YIELD_BY_AREA[l.area] ?? DEFAULT_YIELD),
  }))

  const scored = scoreListings(listingsWithYield as Parameters<typeof scoreListings>[0], market as Parameters<typeof scoreListings>[1])
    .filter(l => l.gapPct >= 0)
    .sort((a, b) => b.gapPct - a.gapPct)

  const payload = { listings: scored, marketAreas: market.length, usingSeed, fetchedAt: new Date().toISOString() }
  cache = { data: payload, ts: Date.now() }
  res.setHeader('Cache-Control', 's-maxage=3600,stale-while-revalidate=300')
  return res.status(200).json(payload)
}
