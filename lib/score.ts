// lib/score.ts
import type { BayutListing } from './bayut'
import type { AreaMarket } from './dld'

export type Grade = 'A' | 'B' | 'C' | 'D'

export interface ScoredListing extends BayutListing {
  askPsf: number
  marketPsf: number
  txnCount: number
  gapPct: number
  grade: Grade
  recentSamples: { date: string; psf: number }[]
  hasMarketData: boolean
}

export function scoreListings(listings: BayutListing[], market: AreaMarket[]): ScoredListing[] {
  return listings.map(l => {
    const askPsf = l.askPrice / l.sizeSqft
    const stat = market.find(m => m.area.toLowerCase() === l.area.toLowerCase() && m.rooms.toLowerCase() === l.rooms.toLowerCase())
    if (!stat) return { ...l, askPsf: Math.round(askPsf), marketPsf: 0, txnCount: 0, gapPct: 0, grade: 'D', recentSamples: [], hasMarketData: false }
    const gapPct = Math.round(((stat.medianPsf - askPsf) / stat.medianPsf) * 1000) / 10
    const grade = gapPct >= 18 ? 'A' : gapPct >= 10 ? 'B' : gapPct >= 4 ? 'C' : 'D'
    return { ...l, askPsf: Math.round(askPsf), marketPsf: stat.medianPsf, txnCount: stat.txnCount, gapPct, grade, recentSamples: stat.samples, hasMarketData: true }
  })
}
export const GRADE_COLOR = { A: '#0F6E56', B: '#3B6D11', C: '#854F0B', D: '#A32D2D' }
export const GRADE_BG = { A: '#E1F5EE', B: '#EAF3DE', C: '#FAEEDA', D: '#FCEBEB' }
export function fmtAed(n) { return n >= 1e6 ? (n/1e6).toFixed(2)+'M' : Math.round(n/1000)+'K' }
