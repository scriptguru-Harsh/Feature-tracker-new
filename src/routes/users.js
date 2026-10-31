import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { pool } from '../db.js'

const router = Router()

router.post('/', async (req, res) => {
  const { email, password, role = 'member' } = req.body || {}
  if (typeof email !== 'string' || !email.trim() || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email and password are required' })
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' })
  }
  if (role !== 'admin' && role !== 'member') {
    return res.status(400).json({ error: 'Role must be admin or member' })
  }

  const normalizedEmail = email.trim().toLowerCase()
  const passwordHash = await bcrypt.hash(password, 10)

  try {
    const { rows } = await pool.query(
      'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role',
      [normalizedEmail, passwordHash, role],
    )
    return res.status(201).json(rows[0])
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' })
    }
    throw error
  }
})

export default router
