import { Router } from 'express'
import { pool } from '../db.js'

const router = Router()
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const fields = {
  name: { column: 'name', max: 300 },
  dev: { column: 'dev', values: ['Not Started', 'In Progress', 'In Review', 'Done', 'Blocked'] },
  test: { column: 'test', values: ['Not Started', 'In Testing', 'Failed', 'Passed'] },
  dep: { column: 'dep', values: ['Not Deployed', 'Staging', 'Production'] },
  by: { column: 'requested_by', max: 2000 },
  clinic: { column: 'clinic', max: 2000 },
  cred: { column: 'cred', values: ['Not Set', 'Yes', 'Pending', 'No'] },
  lead: { column: 'lead', max: 2000 },
  inf: { column: 'inf', values: ['Not Informed', 'Informed', 'Not Required'] },
  notes: { column: 'notes', max: 2000 },
  deadline: { column: 'deadline', date: true },
  priority: { column: 'priority', values: ['Normal', 'High'] },
}

const selectFields = `
  id, name, dev, test, dep, requested_by AS "by", clinic, cred, lead, inf,
  notes, deadline::text AS deadline, priority, created
`

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
}

function validateFeatureBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'Request body must be a JSON object'
  }

  for (const [field, value] of Object.entries(body)) {
    const definition = fields[field]
    if (!definition) return `Unknown feature field: ${field}`

    if (definition.values) {
      if (typeof value !== 'string' || !definition.values.includes(value)) {
        return `Invalid value for ${field}`
      }
    } else if (definition.date) {
      if (value !== null && !validDate(value)) return 'deadline must be a valid YYYY-MM-DD date or null'
    } else if (typeof value !== 'string' || value.length > definition.max) {
      return `${field} must be a string no longer than ${definition.max} characters`
    }
  }

  return null
}

router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT ${selectFields} FROM features ORDER BY created, id`,
  )
  res.json(rows)
})

router.post('/', async (req, res) => {
  const validationError = validateFeatureBody(req.body)
  if (validationError) return res.status(400).json({ error: validationError })

  const entries = Object.entries(req.body)
  const columns = entries.map(([field]) => fields[field].column)
  const values = entries.map(([, value]) => value)
  const placeholders = values.map((_, index) => `$${index + 1}`)

  const query = entries.length
    ? `INSERT INTO features (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING ${selectFields}`
    : `INSERT INTO features DEFAULT VALUES RETURNING ${selectFields}`

  const { rows } = await pool.query(query, values)
  res.status(201).json(rows[0])
})

router.patch('/:id', async (req, res) => {
  if (!uuidPattern.test(req.params.id)) {
    return res.status(400).json({ error: 'Invalid feature id' })
  }

  const validationError = validateFeatureBody(req.body)
  if (validationError) return res.status(400).json({ error: validationError })

  const entries = Object.entries(req.body)
  const setClauses = entries.map(([field], index) => `${fields[field].column} = $${index + 1}`)
  setClauses.push('updated_at = now()')

  const { rows } = await pool.query(
    `UPDATE features SET ${setClauses.join(', ')} WHERE id = $${entries.length + 1} RETURNING ${selectFields}`,
    [...entries.map(([, value]) => value), req.params.id],
  )
  if (!rows.length) return res.status(404).json({ error: 'Feature not found' })

  res.json(rows[0])
})

router.delete('/:id', async (req, res) => {
  if (!uuidPattern.test(req.params.id)) {
    return res.status(400).json({ error: 'Invalid feature id' })
  }

  const { rowCount } = await pool.query('DELETE FROM features WHERE id = $1', [req.params.id])
  if (!rowCount) return res.status(404).json({ error: 'Feature not found' })
  res.status(204).end()
})

export default router
