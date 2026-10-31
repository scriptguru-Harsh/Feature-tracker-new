import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { once } from 'node:events'
import quickAddRouter from './quickAdd.js'

test('AI quick add returns ai_unavailable when Groq is not configured', async () => {
  const originalKey = process.env.GROQ_API_KEY
  delete process.env.GROQ_API_KEY
  const app = express()
  app.use(express.json())
  app.use((req, res, next) => {
    req.user = { sub: 'test-user' }
    next()
  })
  app.use('/api/quick-add', quickAddRouter)
  const server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')

  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/quick-add/ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Dark mode', today: '2026-10-31' }),
    })
    assert.equal(response.status, 503)
    assert.deepEqual(await response.json(), { error: 'ai_unavailable' })
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
    if (originalKey === undefined) delete process.env.GROQ_API_KEY
    else process.env.GROQ_API_KEY = originalKey
  }
})
