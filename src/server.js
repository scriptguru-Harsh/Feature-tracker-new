import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import bcrypt from 'bcryptjs'
import { createToken, requireAdmin, requireAuth } from './auth.js'
import { initializeDatabase, pool, seedAdminIfEmpty } from './db.js'
import featuresRouter from './routes/features.js'
import usersRouter from './routes/users.js'

const app = express()
const port = Number(process.env.PORT) || 3000
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

app.set('trust proxy', 1)
app.use(helmet())
app.use(cors({
  origin(origin, callback) {
    callback(null, !origin || allowedOrigins.includes(origin))
  },
}))
app.use(express.json({ limit: '100kb' }))

app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ error: 'Too many login attempts. Try again later.' }),
})

app.post('/api/auth/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body || {}
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  const { rows } = await pool.query(
    'SELECT id, email, password_hash, role FROM users WHERE email = $1',
    [email.trim().toLowerCase()],
  )
  const user = rows[0]
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }

  const publicUser = { id: user.id, email: user.email, role: user.role }
  res.json({ token: createToken(publicUser), user: publicUser })
})

app.use('/api', requireAuth)

app.get('/api/auth/me', (req, res) => {
  res.json({ id: req.user.sub, email: req.user.email, role: req.user.role })
})

app.use('/api/features', featuresRouter)
app.use('/api/users', requireAdmin, usersRouter)

app.use((req, res) => res.status(404).json({ error: 'Not found' }))

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error)

  const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 600
    ? error.status
    : 500
  const message = status === 400 ? 'Invalid JSON body' : status >= 500 ? 'Internal server error' : error.message
  if (status >= 500) console.error(error.message)
  res.status(status).json({ error: message })
})

let server
let shuttingDown = false
let heartbeat

async function shutdown(signal) {
  if (shuttingDown) return
  shuttingDown = true
  console.log(`${signal} received; shutting down`)

  if (heartbeat) clearInterval(heartbeat)
  if (server) {
    await new Promise((resolve) => server.close(resolve))
  }
  await pool.end()
}

async function start() {
  await initializeDatabase()
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    const adminHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10)
    await seedAdminIfEmpty(process.env.ADMIN_EMAIL, adminHash)
  }

  server = app.listen(port, '0.0.0.0', () => {
    console.log(`Feature Tracker API listening on 0.0.0.0:${port}`)
  })

  if (process.env.RENDER_EXTERNAL_URL && process.env.KEEP_ALIVE !== 'false') {
    heartbeat = setInterval(async () => {
      try {
        const url = `${process.env.RENDER_EXTERNAL_URL.replace(/\/+$/, '')}/health`
        const response = await fetch(url, { signal: AbortSignal.timeout(10_000) })
        console.log(`Keep-alive ${url}: ${response.status}`)
      } catch (error) {
        console.error(`Keep-alive failed: ${error.message}`)
      }
    }, 10 * 60 * 1000)
  }
}

process.on('SIGTERM', () => {
  shutdown('SIGTERM').catch((error) => {
    console.error(`Shutdown failed: ${error.message}`)
    process.exitCode = 1
  })
})

start().catch(async (error) => {
  console.error(`Startup failed: ${error.message}`)
  process.exitCode = 1
  await pool.end().catch((poolError) => console.error(`Pool shutdown failed: ${poolError.message}`))
})
