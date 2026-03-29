// pages/api/analyze.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import type { ScoredListing } from '../../lib/score'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const { question, listings, locale = 'en' } = req.body as {
    question: string; listings: ScoredListing[]; locale: string
  }
  if (!question?.trim()) return res.status(400).json({ error: 'question required' })
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return res.status(200).json({
    answer: locale === 'ja'
      ? 'AI分析を有効にするには ANTHROPIC_API_KEY を Vercel 環境変数に設定してください。'
      : 'Set ANTHROPIC_API_KEY in Vercel environment variables to enable AI analysis.',
  })
  const ctx = listings.slice(0, 20).map(p =>
    '[' + p.id + '] ' + p.title + ' / ' + p.area + ' / ' + p.rooms + ' / AED' + p.askPrice.toLocaleString() +
    ' / ask ' + p.askPsf + 'psf / market ' + p.marketPsf + 'psf / gap ' + p.gapPct + '% / grade:' + p.grade
  ).join('\n')
  const system = locale === 'ja'
    ? 'Dubai real estate expert (Japanese). Positive gap = below DLD median. Grade A>=18%,B>=10%,C>=4%.\nListings:\n' + ctx
    : 'Dubai real estate investment expert. Positive gap = asking below DLD transaction median. Grade A>=18%,B>=10%,C>=4%. Answer concisely with data.\nListings:\n' + ctx
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 800, system, messages: [{ role: 'user', content: question }] }),
    })
    const d = await r.json()
    return res.status(200).json({ answer: d.content?.map((c: {text?: string}) => c.text ?? '').join('') ?? '' })
  } catch (e: unknown) {
    return res.status(502).json({ error: e instanceof Error ? e.message : String(e) })
  }
}
