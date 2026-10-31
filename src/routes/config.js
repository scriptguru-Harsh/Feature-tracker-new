import { Router } from 'express'

const router = Router()

router.get('/', (req, res) => {
  res.json({ ai: Boolean(process.env.GROQ_API_KEY) })
})

export default router
