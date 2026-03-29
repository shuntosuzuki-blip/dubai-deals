// pages/api/debug-bayut.ts
import type { NextApiRequest, NextApiResponse } from 'next'
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const key = process.env.RAPIDAPI_KEY ?? ''
  const host = 'bayut14.p.rapidapi.com'
  const url = 'https://' + host + '/search-property?purpose=for-sale&locationExternalIDs=5002&lang=en&hitsPerPage=3&page=1&categoryExternalID=4'
  try {
    const r = await fetch(url, { headers: { 'x-rapidapi-key': key, 'x-rapidapi-host': host }, signal: AbortSignal.timeout(12000) })
    const text = await r.text()
    return res.status(200).json({ status: r.status, hasKey: !!key, preview: text.slice(0, 800) })
  } catch(e) { return res.status(200).json({ error: String(e) }) }
}
