import jwt from 'jsonwebtoken'

const jwtSecret = process.env.JWT_SECRET

if (!jwtSecret) {
  throw new Error('JWT_SECRET is required')
}

export function createToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    jwtSecret,
    { expiresIn: '12h' },
  )
}

export function requireAuth(req, res, next) {
  const authorization = req.get('authorization') || ''
  const match = authorization.match(/^Bearer\s+(.+)$/i)
  if (!match) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  try {
    req.user = jwt.verify(match[1], jwtSecret)
    return next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }
  return next()
}
