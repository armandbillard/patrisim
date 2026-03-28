import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY non configurée' })

  try {
    const { messages, system, max_tokens } = req.body
    const systemPrompt = system || ''
    const userMessage = messages?.[0]?.content || ''

    const geminiBody = {
      contents: [{
        parts: [{
          text: systemPrompt
            ? `${systemPrompt}\n\n${userMessage}`
            : userMessage
        }]
      }],
      generationConfig: {
        maxOutputTokens: max_tokens || 4000,
        temperature: 0.3,
      }
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiBody),
      }
    )

    const data = await response.json()

    // Log complet pour debug
    console.log('Gemini status:', response.status)
    console.log('Gemini response keys:', Object.keys(data))
    console.log('Gemini candidates:', JSON.stringify(data.candidates?.slice(0,1)))
    console.log('Gemini error:', JSON.stringify(data.error))

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: data.error?.message || 'Erreur Gemini',
        details: data 
      })
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    
    if (!text) {
      return res.status(500).json({ 
        error: 'Texte vide dans la réponse Gemini',
        finishReason: data.candidates?.[0]?.finishReason,
        candidates: data.candidates?.length
      })
    }

    return res.status(200).json({
      content: [{ type: 'text', text }]
    })

  } catch (error) {
    console.error('Proxy error:', error)
    return res.status(500).json({ error: 'Erreur proxy', detail: String(error) })
  }
}