import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { once } from 'node:events'

process.env.DATABASE_URL ||= 'postgres://test:test@127.0.0.1:5432/feature_tracker_test'
const { default: featuresRouter } = await import('./features.js')
const { pool } = await import('../db.js')

test('feature API returns deadline as a date-only value for calendar inputs', async () => {
  const originalQuery = pool.query
  let selectedSql = ''
  pool.query = async (sql) => {
    selectedSql = sql
    return { rows: [{ id: 'feature-1', deadline: '2026-11-02' }] }
  }
  const app = express()
  app.use('/api/features', featuresRouter)
  const server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')

  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/features`)
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), [{ id: 'feature-1', deadline: '2026-11-02' }])
    assert.match(selectedSql, /deadline::text AS deadline/)
  } finally {
    pool.query = originalQuery
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  }
})

test('feature API rejects invalid deadlines and priorities with 400', async () => {
  const app = express()
  app.use(express.json())
  app.use('/api/features', featuresRouter)
  const server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')

  try {
    const invalidBodies = [
      { deadline: '2026-02-31' },
      { deadline: '31/02/2026' },
      { priority: 'Urgent' },
    ]
    for (const body of invalidBodies) {
      const response = await fetch(`http://127.0.0.1:${server.address().port}/api/features`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      assert.equal(response.status, 400)
    }
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  }
})
