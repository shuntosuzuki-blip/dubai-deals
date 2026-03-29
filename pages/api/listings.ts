// pages/api/listings.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchBayutListings, type BayutListing } from '../../lib/bayut'
import { fetchMarketStats } from '../../lib/dld'
import { scoreListings } from '../../lib/score'

const SEED: BayutListing[] = [
  { id:'S001', title:'Binghatti Nova - 1BR', url:'https://bayut.com', area:'Jumeirah Village Circle', rooms:'1BR', beds:1, sizeSqft:682, askPrice:710000, yieldPct:9.3, domDays:7, view:'Pool', source:'Bayut', imageUrl:'', agentName:'Demo Agent', permitNumber:'' },
  { id:'S002', title:'Marquise Square - 2BR', url:'https://bayut.com', area:'Business Bay', rooms:'2BR', beds:2, sizeSqft:1108, askPrice:1580000, yieldPct:8.0, domDays:38, view:'Canal', source:'Bayut', imageUrl:'', agentName:'Demo Agent', permitNumber:'' },
  { id:'S003', title:'Ciel Tower - Studio', url:'https://bayut.com', area:'Dubai Marina', rooms:'Studio', beds:0, sizeSqft:445, askPrice:870000, yieldPct:8.1, domDays:9, view:'Sea', source:'Bayut', imageUrl:'', agentName:'Demo Agent', permitNumber:'' },
  { id:'S004', title:'Burj Vista - 2BR', url:'https://bayut.com', area:'Downtown Dubai', rooms:'2BR', beds:2, sizeSqft:1252, askPrice:3050000, yieldPct:6.7, domDays:45, view:'Burj', source:'Bayut', imageUrl:'', agentName:'Demo Agent', permitNumber:'' },
  { id:'S005', title:'Binghatti Crest - 1BR', url:'https://bayut.com', area:'Jumeirah Village Circle', rooms:'1BR', beds:1, sizeSqft:654, askPrice:645000, yieldPct:9.5, domDays:71, view:'Garden', source:'Bayut', imageUrl:'', agentName:'Demo Agent', permitNumber:'' },
  { id:'S006', title:'Ellington House - Studio', url:'https://bayut.com', area:'Business Bay', rooms:'Studio', beds:0, sizeSqft:514, askPrice:820000, yieldPct:7.8, domDays:12, view:'Canal', source:'Bayut', imageUrl:'', agentName:'Demo Agent', permitNumber:'' },
  { id:'S007', title:'Index Tower - Studio', url:'https://bayut.com', area:'DIFC', rooms:'Studio', beds:0, sizeSqft:492, askPrice:1060000, yieldPct:7.5, domDays:55, view:'City', source:'Bayut', imageUrl:'', agentName:'Demo Agent', permitNumber:'' },
  { id:'S008', title:'Damac Heights - 1BR', url:'https://bayut.com', area:'Dubai Marina', rooms:'1BR', beds:1, sizeSqft:724, askPrice:1310000, yieldPct:7.1, domDays:22, view:'Marina', source:'Bayut', imageUrl:'', agentName:'Demo Agent', permitNumber:'' },
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
  const rapidApiKey = process.env.RAPIDAPI_KEY
  const usingSeed = !rapidApiKey
  try {
    const [market, rawListings] = await Promise.all([
      fetchMarketStats(6),
      rapidApiKey ? fetchBayutListings({ rapidApiKey, pageSize: 100 }) : Promise.resolve(SEED),
    ])
    const listings = scoreListings(rawListings, market)
      .filter(l => l.gapPct >= 0)
      .sort((a, b) => b.gapPct - a.gapPct)
    const payload = { listings, marketAreas: market.length, usingSeed, fetchedAt: new Date().toISOString() }
    cache = { data: payload, ts: Date.now() }
    res.setHeader('Cache-Control', 's-maxage=3600,stale-while-revalidate=300')
    return res.status(200).json(payload)
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : String(e)
    return res.status(502).json({ error })
  }
}
