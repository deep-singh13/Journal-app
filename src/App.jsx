import React from 'react'
import { Library, COVER_PRESETS } from './components/Library.jsx'
import { Reader, blankPage } from './components/Reader.jsx'
import { TweaksPanel, TweakSection, TweakRadio, TweakSelect, TweakSlider, useTweaks } from './components/TweaksPanel.jsx'
import {
  getStoredKey, setStoredKey, clearStoredKey,
  getJournals, createJournal, getPages, addPage,
} from './api.js'

// ── Paper variants ───────────────────────────────────────────────
const PAPER_VARIANTS = {
  cream:    { bg: 'oklch(0.92 0.025 75)' },
  ivory:    { bg: 'oklch(0.95 0.018 90)' },
  sand:     { bg: 'oklch(0.88 0.030 70)' },
  bone:     { bg: 'oklch(0.96 0.010 80)' },
  graphite: { bg: 'oklch(0.30 0.012 250)' },
}

const TWEAK_DEFAULTS = {
  toolbarPos:   'bottom',
  paperVariant: 'bone',
  ruleStyle:    'blank',
  flipSpeed:    1,
}

// ── Helpers ──────────────────────────────────────────────────────
function newJournalData(preset, idx, count) {
  const pageCount = [12, 24, 8, 16, 32, 20, 6, 18][idx % 8]
  const pages = Array.from({ length: pageCount }, (_, i) => blankPage(i + 1))
  return {
    id: 'j-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    title:    preset.title,
    subtitle: preset.subtitle,
    cover:    preset.cover,
    ink:      preset.ink,
    monogram: preset.monogram,
    mono:     preset.mono,
    pages:    pageCount,
    pagesData: pages,
    lastOpened: 'today',
  }
}

// ── Password screen ───────────────────────────────────────────────
function LoginScreen({ onLogin, error }) {
  const [pw, setPw] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const submit = async (e) => {
    e.preventDefault()
    if (!pw.trim()) return
    setBusy(true)
    setStoredKey(pw.trim())
    onLogin()
    setBusy(false)
  }
  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#0a0b0d',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
      gap: 24, fontFamily: '"Newsreader", Georgia, serif',
    }}>
      <div style={{ fontSize: 48, fontStyle: 'italic', color: 'oklch(0.94 0.025 75)', letterSpacing: '-0.02em' }}>
        Journal
      </div>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 260 }}>
        <input
          type="password"
          placeholder="Password"
          value={pw}
          onChange={e => setPw(e.target.value)}
          autoFocus
          style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)',
            borderRadius: 10, padding: '12px 16px', color: 'oklch(0.94 0.025 75)',
            fontSize: 16, fontFamily: 'inherit', outline: 'none',
          }}
        />
        {error && <div style={{ fontSize: 12, color: 'oklch(0.65 0.18 25)', textAlign: 'center' }}>{error}</div>}
        <button type="submit" disabled={busy} style={{
          background: 'rgba(255,235,200,0.10)', border: '1px solid rgba(255,235,200,0.30)',
          borderRadius: 10, padding: '12px 16px',
          color: 'oklch(0.74 0.14 65)', fontFamily: 'inherit', fontStyle: 'italic', fontSize: 16,
          cursor: 'pointer', transition: 'background .2s',
        }}>
          {busy ? 'Opening…' : 'Open my journal →'}
        </button>
      </form>
    </div>
  )
}

// ── Loading spinner ───────────────────────────────────────────────
function Spinner({ label = 'Loading…' }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#0a0b0d',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
      gap: 16, color: 'oklch(0.74 0.020 75)', fontFamily: '"Newsreader", Georgia, serif',
    }}>
      <div style={{ width: 36, height: 36, border: '2px solid rgba(255,255,255,0.08)',
        borderTopColor: 'oklch(0.74 0.14 65)', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite' }} />
      <div style={{ fontSize: 14, fontStyle: 'italic' }}>{label}</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ── App ───────────────────────────────────────────────────────────
export default function App() {
  const [authState, setAuthState] = React.useState(
    getStoredKey() ? 'loading' : 'login'   // skip login if key already stored
  )
  const [authError, setAuthError] = React.useState('')
  const [journals, setJournals] = React.useState([])
  const [openJournal, setOpenJournal] = React.useState(null) // full journal with pagesData
  const [pageLoading, setPageLoading] = React.useState(false)

  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS)
  const [ui, setUi] = React.useState({
    tool: 'ball', color: '#1a1a1a', size: 3, opacity: 1,
    toolbarPos: TWEAK_DEFAULTS.toolbarPos,
    flipSpeed:  TWEAK_DEFAULTS.flipSpeed,
    paper: { bg: PAPER_VARIANTS[TWEAK_DEFAULTS.paperVariant].bg, rules: TWEAK_DEFAULTS.ruleStyle },
  })

  // Sync tweaks → ui
  React.useEffect(() => {
    setUi(prev => ({
      ...prev,
      toolbarPos: t.toolbarPos,
      flipSpeed:  t.flipSpeed,
      paper: { bg: PAPER_VARIANTS[t.paperVariant].bg, rules: t.ruleStyle },
    }))
  }, [t.toolbarPos, t.paperVariant, t.ruleStyle, t.flipSpeed])

  // ── iPad scaling ────────────────────────────────────────────────
  React.useEffect(() => {
    const fit = () => {
      const sx = (window.innerWidth - 32) / 1366
      const sy = (window.innerHeight - 32) / 1024
      document.documentElement.style.setProperty('--ipad-scale', Math.min(1, sx, sy).toFixed(3))
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  // ── Load journals ────────────────────────────────────────────────
  const loadJournals = React.useCallback(async () => {
    try {
      const data = await getJournals()
      setJournals(data)
      setAuthState('ready')
    } catch (e) {
      if (e.status === 401) {
        clearStoredKey()
        setAuthError('Wrong password.')
        setAuthState('login')
      } else {
        // Server might be cold-starting — retry once after 5s
        setTimeout(async () => {
          try {
            const data = await getJournals()
            setJournals(data)
            setAuthState('ready')
          } catch {
            setAuthError('Could not reach server. Try refreshing.')
            setAuthState('login')
          }
        }, 5000)
      }
    }
  }, [])

  React.useEffect(() => {
    if (authState === 'loading') loadJournals()
  }, [authState, loadJournals])

  // ── Auth flow ────────────────────────────────────────────────────
  const handleLogin = () => {
    setAuthError('')
    setAuthState('loading')
  }

  // ── Open a journal (lazy-load its pages) ─────────────────────────
  const openJournalById = async (id) => {
    const meta = journals.find(j => j.id === id)
    if (!meta) return
    setPageLoading(true)
    try {
      const rawPages = await getPages(id)
      const pagesData = rawPages.map(p => ({
        id: p.id,
        num: p.num,
        date: p.date,
        content: p.content || { strokes: [], texts: [], images: [] },
      }))
      setOpenJournal({ ...meta, pagesData })
    } catch (e) {
      console.error('Failed to load pages', e)
    } finally {
      setPageLoading(false)
    }
  }

  // ── Create journal ───────────────────────────────────────────────
  const handleCreate = async () => {
    const preset = COVER_PRESETS[journals.length % COVER_PRESETS.length]
    const data = newJournalData(preset, journals.length, journals.length)

    // Optimistic update
    setJournals(js => [{ ...data, pages: data.pages }, ...js])

    try {
      await createJournal({
        id: data.id, title: data.title, subtitle: data.subtitle,
        cover: data.cover, ink: data.ink, monogram: data.monogram, mono: data.mono,
      })
      // Persist all initial pages
      await Promise.all(data.pagesData.map(p =>
        addPage(data.id, { id: p.id, page_num: p.num, date: p.date, content: p.content })
      ))
    } catch (e) {
      console.error('Create journal failed', e)
    }

    // Open the newly created journal immediately
    setOpenJournal(data)
  }

  // ── Close reader → refresh journal list ──────────────────────────
  const handleClose = async () => {
    setOpenJournal(null)
    try {
      const data = await getJournals()
      setJournals(data)
    } catch { /* non-critical */ }
  }

  // ── Render ───────────────────────────────────────────────────────
  if (authState === 'login') {
    return <LoginScreen onLogin={handleLogin} error={authError} />
  }
  if (authState === 'loading') {
    return <Spinner label="Waking up…" />
  }
  if (pageLoading) {
    return <Spinner label="Opening journal…" />
  }

  return (
    <div className="stage">
      <div className="ipad">
        <div className="ipad-screen">
          {!openJournal ? (
            <Library journals={journals} onOpen={openJournalById} onCreate={handleCreate} />
          ) : (
            <Reader key={openJournal.id} journal={openJournal} onClose={handleClose} ui={ui} setUi={setUi} />
          )}
        </div>
      </div>

      <TweaksPanel>
        <TweakSection label="Toolbar" />
        <TweakRadio label="Position" value={t.toolbarPos}
          options={['bottom', 'top', 'left']} onChange={v => setTweak('toolbarPos', v)} />
        <TweakSection label="Paper" />
        <TweakSelect label="Color" value={t.paperVariant}
          options={[
            { value: 'cream',    label: 'Cream (warm)' },
            { value: 'ivory',    label: 'Ivory' },
            { value: 'sand',     label: 'Sand' },
            { value: 'bone',     label: 'Bone (cool white)' },
            { value: 'graphite', label: 'Graphite (dark)' },
          ]}
          onChange={v => setTweak('paperVariant', v)} />
        <TweakSelect label="Rules" value={t.ruleStyle}
          options={[
            { value: 'blank',  label: 'Blank' },
            { value: 'ruled',  label: 'Ruled' },
            { value: 'dotted', label: 'Dotted' },
            { value: 'grid',   label: 'Grid' },
          ]}
          onChange={v => setTweak('ruleStyle', v)} />
        <TweakSection label="Animation" />
        <TweakSlider label="Flip speed" value={t.flipSpeed}
          min={0.5} max={2.5} step={0.1} unit="×" onChange={v => setTweak('flipSpeed', v)} />
      </TweaksPanel>
    </div>
  )
}
