// pages/api/listings.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { scoreListings } from '../../lib/score'
import type { AreaMarket } from '../../lib/dld'

// Seed listings - shown when APIs unavailable
const SEED_LISTINGS = [
  { id:'S001', title:'Binghatti Nova - 1BR', url:'https://bayut.com', area:'Jumeirah Village Circle', rooms:'1BR', beds:1, sizeSqft:682, askPrice:710000, yieldPct:9.3, domDays:7, view:'Pool', source:'Bayut' as const, imageUrl:'', agentName:'Demo Agent', permitNumber:'' },
  { id:'S002', title:'Marquise Square - 2BR', url:'https://bayut.com', area:'Business Bay', rooms:'2BR', beds:2, sizeSqft:1108, askPrice:1580000, yieldPct:8.0, domDays:38, view:'Canal', source:'Bayut' as const, imageUrl:'', agentName:'Demo Agent', permitNumber:'' },
  { id:'S003', title:'Ciel Tower - Studio', url:'https://bayut.com', area:'Dubai Marina', rooms:'Studio', beds:0, sizeSqft:445, askPrice:870000, yieldPct:8.1, domDays:9, view:'Sea', source:'Bayut' as const, imageUrl:'', agentName:'Demo Agent', permitNumber:'' },
  { id:'S004', title:'Burj Vista - 2BR', url:'https://bayut.com', area:'Downtown Dubai', rooms:'2BR', beds:2, sizeSqft:1252, askPrice:3050000, yieldPct:6.7, domDays:45, view:'Burj', source:'Bayut' as const, imageUrl:'', agentName:'Demo Agent', permitNumber:'' },
  { id:'S005', title:'Binghatti Crest - 1BR', url:'https://bayut.com', area:'Jumeirah Village Circle', rooms:'1BR', beds:1, sizeSqft:654, askPrice:645000, yieldPct:9.5, domDays:71, view:'Garden', source:'Bayut' as const, imageUrl:'', agentName:'Demo Agent', permitNumber:'' },
  { id:'S006', title:'Ellington House - Studio', url:'https://bayut.com', area:'Business Bay', rooms:'Studio', beds:0, sizeSqft:514, askPrice:820000, yieldPct:7.8, domDays:12, view:'Canal', source:'Bayut' as const, imageUrl:'', agentName:'Demo Agent', permitNumber:'' },
  { id:'S007', title:'Index Tower - Studio', url:'https://bayut.com', area:'DIFC', rooms:'Studio', beds:0, sizeSqft:492, askPrice:1060000, yieldPct:7.5, domDays:55, view:'City', source:'Bayut' as const, imageUrl:'', agentName:'Demo Agent', permitNumber:'' },
  { id:'S008', title:'Damac Heights - 1BR', url:'https://bayut.com', area:'Dubai Marina', rooms:'1BR', beds:1, sizeSqft:724, askPrice:1310000, yieldPct:7.1, domDays:22, view:'Marina', source:'Bayut' as const, imageUrl:'', agentName:'Demo Agent', permitNumber:'' },
  { id:'S009', title:'Sobha Hartland - 1BR', url:'https://bayut.com', area:'Dubai Hills Estate', rooms:'1BR', beds:1, sizeSqft:760, askPrice:1060000, yieldPct:7.6, domDays:8, view:'Park', source:'Bayut' as const, imageUrl:'', agentName:'Demo Agent', permitNumber:'' },
  { id:'S010', title:'Address Residences - 1BR', url:'https://bayut.com', area:'Downtown Dubai', rooms:'1BR', beds:1, sizeSqft:832, askPrice:2180000, yieldPct:6.4, domDays:60, view:'Fountain', source:'Bayut' as const, imageUrl:'', agentName:'Demo Agent', permitNumber:'' },
]

// Seed DLD market data (fallback when DLD API unavailable)
const SEED_MARKET: AreaMarket[] = [
  { area:'Jumeirah Village Circle', rooms:'1BR', medianPsf:1100, avgPsf:1150, txnCount:120, samples:[] },
  { area:'Jumeirah Village Circle', rooms:'Studio', medianPsf:1000, avgPsf:1050, txnCount:80, samples:[] },
  { area:'Business Bay', rooms:'2BR', medianPsf:1800, avgPsf:1850, txnCount:90, samples:[] },
  { area:'Business Bay', rooms:'Studio', medianPsf:1600, avgPsf:1650, txnCount:70, samples:[] },
  { area:'Dubai Marina', rooms:'Studio', medianPsf:2000, avgPsf:2100, txnCount:100, samples:[] },
  { area:'Dubai Marina', rooms:'1BR', medianPsf:1900, avgPsf:1950, txnCount:110, samples:[] },
  { area:'Downtown Dubai', rooms:'2BR', medianPsf:2400, avgPsf:2500, txnCount:85, samples:[] },
  { area:'Downtown Dubai', rooms:'1BR', medianPsf:2600, avgPsf:2700, txnCount:75, samples:[] },
  { area:'DIFC', rooms:'Studio', medianPsf:2200, avgPsf:2300, txnCount:60, samples:[] },
  { area:'Dubai Hills Estate', rooms:'1BR', medianPsf:1400, avgPsf:1450, txnCount:95, samples:[] },
]

let cache: { data: object; ts: number } | null = null
const TTL = 60 * 60 * 1000

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()
  const bust = req.query.bust === '1'
  if (!bust && cache && Date.now() - cache.ts < TTL) {
    res.setHeader('X-Cache', 'HIT')
    return res.status(200).json(cache.data)
  }

  let market = SEED_MARKET
  let rawListings = SEED_LISTINGS
  let usingSeed = true

  // Try to fetch DLD market data
  try {
    const { fetchMarketStats } = await import('../../lib/dld')
    market = await fetchMarketStats(6)
  } catch {
    console.log('[listings] DLD unavailable, using seed market data')
  }

  // Try Bayut if API key available
  const rapidApiKey = process.env.RAPIDAPI_KEY
  if (rapidApiKey) {
    try {
      const { fetchBayutListings } = await import('../../lib/bayut')
      rawListings = await fetchBayutListings({ rapidApiKey, pageSize: 100 })
      usingSeed = false
    } catch {
      console.log('[listings] Bayut unavailable, using seed listings')
    }
  }

  const listings = scoreListings(rawListings, market)
    .filter(l => l.gapPct >= 0)
    .sort((a, b) => b.gapPct - a.gapPct)

  const payload = { listings, marketAreas: market.length, usingSeed, fetchedAt: new Date().toISOString() }
  cache = { data: payload, ts: Date.now() }
  res.setHeader('Cache-Control', 's-maxage=3600,stale-while-revalidate=300')
  return res.status(200).json(payload)
}
