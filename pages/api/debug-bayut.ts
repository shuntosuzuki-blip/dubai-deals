// pages/api/debug-bayut.ts
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const ALGOLIA_APP = 'LL8IZ711CS'
  const ALGOLIA_KEY = 'strat_a5e4568c'
  const ALGOLIA_INDEX = 'bayut-production-ads-bi-score-ranking-en'
  const url = 'https://' + ALGOLIA_APP + '-dsn.algolia.net/1/indexes/' + ALGOLIA_INDEX + '/query'
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'X-Algolia-Application-Id': ALGOLIA_APP,
        'X-Algolia-API-Key': ALGOLIA_KEY,
        'Content-Type': 'application/json',
        'Referer': 'https://www.bayut.com/',
        'Origin': 'https://www.bayut.com',
        'User-Agent': 'Mozilla/5.0 (compatible)',
      },
      body: JSON.stringify({ query: '', filters: 'purpose:"for-sale" AND category.externalID:4', hitsPerPage: 2 }),
    })
    const text = await r.text()
    return res.status(200).json({ algoliaStatus: r.status, preview: text.slice(0, 500) })
  } catch(e) {
    return res.status(200).json({ error: String(e) })
  }
}
