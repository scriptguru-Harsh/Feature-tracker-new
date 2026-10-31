import { Router } from 'express'
import rateLimit from 'express-rate-limit'

const router = Router()
const fields = {
  name: { max: 300 },
  dev: { values: ['Not Started', 'In Progress', 'In Review', 'Done', 'Blocked'] },
  test: { values: ['Not Started', 'In Testing', 'Failed', 'Passed'] },
  dep: { values: ['Not Deployed', 'Staging', 'Production'] },
  by: { max: 2000 },
  clinic: { max: 2000 },
  cred: { values: ['Not Set', 'Yes', 'Pending', 'No'] },
  lead: { max: 2000 },
  inf: { values: ['Not Informed', 'Informed', 'Not Required'] },
  notes: { max: 2000 },
  deadline: { date: true },
  priority: { values: ['Normal', 'High'] },
}

const limiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  keyGenerator: (req) => req.user.sub,
  standardHeaders: false,
  legacyHeaders: false,
  handler: (req, res) => res.status(503).json({ error: 'ai_unavailable' }),
})

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
}

function sanitizeDraft(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const draft = {}
  for (const [field, candidate] of Object.entries(value)) {
    const definition = fields[field]
    if (!definition || candidate === null) {
      if (definition) draft[field] = null
      continue
    }
    if (definition.values) {
      if (typeof candidate === 'string' && definition.values.includes(candidate)) draft[field] = candidate
    } else if (definition.date) {
      if (validDate(candidate)) draft[field] = candidate
    } else if (typeof candidate === 'string' && candidate.length <= definition.max) {
      draft[field] = candidate
    }
  }
  return draft
}

router.post('/ai', limiter, async (req, res) => {
  if (!process.env.GROQ_API_KEY) return res.status(503).json({ error: 'ai_unavailable' })
  const { text, today } = req.body || {}
  if (typeof text !== 'string' || !text.trim() || text.length > 8000) {
    return res.status(400).json({ error: 'Invalid quick-add text' })
  }
  if (today !== undefined && !validDate(today)) {
    return res.status(400).json({ error: 'today must be a YYYY-MM-DD date' })
  }

  const allowedFields = Object.keys(fields).join(', ')
  const systemPrompt = [
    'Extract feature-entry fields from the user text as JSON.',
    `Use ONLY these keys: ${allowedFields}.`,
    'Allowed values: dev = Not Started | In Progress | In Review | Done | Blocked;',
    'test = Not Started | In Testing | Failed | Passed;',
    'dep = Not Deployed | Staging | Production;',
    'inf = Not Informed | Informed | Not Required;',
    'cred = Not Set | Yes | Pending | No; priority = Normal | High.',
    'deadline must be YYYY-MM-DD resolved against the given today.',
    'Return null for anything not stated. Never guess.',
    'Return exactly {"drafts":[{"name":null,"dev":null,"test":null,"dep":null,"by":null,"clinic":null,"cred":null,"lead":null,"inf":null,"notes":null,"deadline":null,"priority":null}]}',
  ].join(' ')

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `today: ${today || new Date().toISOString().slice(0, 10)}\ntext:\n${text}` },
        ],
      }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) return res.status(503).json({ error: 'ai_unavailable' })
    const result = await response.json()
    const content = result.choices?.[0]?.message?.content
    const parsed = JSON.parse(content)
    if (!Array.isArray(parsed.drafts)) throw new Error('Invalid AI response')
    return res.json({ drafts: parsed.drafts.map(sanitizeDraft) })
  } catch {
    return res.status(503).json({ error: 'ai_unavailable' })
  }
})

export default router
