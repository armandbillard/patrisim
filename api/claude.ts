import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY non configurée' })

  try {
    const { model, max_tokens, system, messages } = req.body

    const cleanBody = {
      model: model || 'claude-haiku-4-5',
      max_tokens: max_tokens || 4000,
      system,
      messages,
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(cleanBody),
    })

    const data = await response.json()
    console.log('Anthropic error:', JSON.stringify(data))
    return res.status(response.status).json(data)

  } catch (error) {
    return res.status(500).json({ error: 'Erreur proxy', detail: String(error) })
  }
}