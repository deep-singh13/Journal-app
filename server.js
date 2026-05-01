import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { sql, initDb } from './db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '15mb' })) // accommodate compressed base64 images

// ── Auth middleware ──────────────────────────────────────────────
const AUTH_PASSWORD = process.env.AUTH_PASSWORD
app.use('/api', (req, res, next) => {
  if (!AUTH_PASSWORD) return next() // no auth in dev if env not set
  const key = req.headers['x-api-key']
  if (key !== AUTH_PASSWORD) return res.status(401).json({ error: 'Unauthorized' })
  next()
})

// ── Journals ─────────────────────────────────────────────────────
app.get('/api/journals', async (req, res) => {
  try {
    const rows = await sql`
      SELECT j.*,
        COALESCE((SELECT COUNT(*) FROM pages WHERE journal_id = j.id), 0)::int AS pages
      FROM journals j
      ORDER BY j.updated_at DESC
    `
    res.json(rows.map(r => ({
      id: r.id,
      title: r.title,
      subtitle: r.subtitle,
      cover: r.cover,
      ink: r.ink,
      monogram: r.monogram,
      mono: r.mono,
      lastOpened: r.last_opened,
      pages: r.pages,
    })))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/journals', async (req, res) => {
  const { id, title, subtitle, cover, ink, monogram, mono } = req.body
  try {
    await sql`
      INSERT INTO journals (id, title, subtitle, cover, ink, monogram, mono)
      VALUES (${id}, ${title}, ${subtitle||''}, ${cover||''}, ${ink||''}, ${monogram||''}, ${mono||''})
    `
    res.json({ ok: true, id })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

app.delete('/api/journals/:id', async (req, res) => {
  try {
    await sql`DELETE FROM journals WHERE id = ${req.params.id}`
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── Pages ─────────────────────────────────────────────────────────
app.get('/api/journals/:id/pages', async (req, res) => {
  try {
    const rows = await sql`
      SELECT * FROM pages WHERE journal_id = ${req.params.id} ORDER BY page_num
    `
    res.json(rows.map(r => ({
      id: r.id,
      num: r.page_num,
      date: r.date,
      content: r.content,
    })))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/journals/:id/pages', async (req, res) => {
  const journalId = req.params.id
  const { id, page_num, date, content } = req.body
  try {
    await sql`
      INSERT INTO pages (id, journal_id, page_num, date, content)
      VALUES (${id}, ${journalId}, ${page_num}, ${date||null}, ${JSON.stringify(content || { strokes:[], texts:[], images:[] })})
    `
    await sql`UPDATE journals SET updated_at = NOW(), last_opened = 'today' WHERE id = ${journalId}`
    res.json({ ok: true, id })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

app.put('/api/pages/:id', async (req, res) => {
  const { content, journal_id } = req.body
  try {
    await sql`
      UPDATE pages SET content = ${JSON.stringify(content)}, updated_at = NOW()
      WHERE id = ${req.params.id}
    `
    if (journal_id) {
      await sql`UPDATE journals SET updated_at = NOW(), last_opened = 'today' WHERE id = ${journal_id}`
    }
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── Serve Vite build in production ───────────────────────────────
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, 'dist')))
  app.get('*', (_req, res) => res.sendFile(join(__dirname, 'dist', 'index.html')))
}

// ── Start ─────────────────────────────────────────────────────────
initDb()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on :${PORT}`))
  })
  .catch(e => {
    console.error('DB init failed:', e)
    process.exit(1)
  })
