import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { once } from 'node:events'
import configRouter from './config.js'

test('public API config reports whether Groq is configured', async () => {
  const originalKey = process.env.GROQ_API_KEY
  const app = express()
  app.use('/api/config', configRouter)
  const server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')

  try {
    delete process.env.GROQ_API_KEY
    let response = await fetch(`http://127.0.0.1:${server.address().port}/api/config`)
    assert.deepEqual(await response.json(), { ai: false })
    process.env.GROQ_API_KEY = 'test-key'
    response = await fetch(`http://127.0.0.1:${server.address().port}/api/config`)
    assert.deepEqual(await response.json(), { ai: true })
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
    if (originalKey === undefined) delete process.env.GROQ_API_KEY
    else process.env.GROQ_API_KEY = originalKey
  }
})
