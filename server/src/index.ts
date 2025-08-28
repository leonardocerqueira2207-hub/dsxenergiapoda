import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { z } from 'zod'

const app = express()
app.use(express.json())
app.use(cors({ origin: process.env.ORIGIN === '*' ? true : process.env.ORIGIN }))

// In-memory storage (swap to DB later)
type RecordItem = { id: string; date: string; type: 'poda' | 'espacador'; qty: number; notes?: string }
const db: { [company: string]: RecordItem[] } = {}

const recordSchema = z.object({
  id: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.union([z.literal('poda'), z.literal('espacador')]),
  qty: z.number().int().min(0),
  notes: z.string().optional()
})

app.get('/health', (_req, res) => {
  res.json({ ok: true, uptime: process.uptime() })
})

app.get('/records/:company', (req, res) => {
  const company = req.params.company.toUpperCase()
  res.json(db[company] || [])
})

app.post('/records/:company', (req, res) => {
  const company = req.params.company.toUpperCase()
  const parse = recordSchema.safeParse(req.body)
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() })
  const list = db[company] || []
  const idx = list.findIndex(r => r.id === parse.data.id)
  if (idx >= 0) list[idx] = parse.data
  else list.push(parse.data)
  db[company] = list
  res.json({ ok: true })
})

app.delete('/records/:company/:id', (req, res) => {
  const company = req.params.company.toUpperCase()
  const id = req.params.id
  const list = (db[company] || []).filter(r => r.id !== id)
  db[company] = list
  res.json({ ok: true })
})

app.delete('/records/:company', (req, res) => {
  const company = req.params.company.toUpperCase()
  db[company] = []
  res.json({ ok: true })
})

const port = Number(process.env.PORT) || 8787
app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`)
})
