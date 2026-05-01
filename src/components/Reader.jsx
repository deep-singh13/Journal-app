import React from 'react'
import { DrawCanvas, drawStroke } from './Drawing.jsx'
import { Toolbar } from './Toolbar.jsx'
import Icon from './Icons.jsx'
import { savePage as savePageApi, addPage as addPageApi, compressImage } from '../api.js'

export const PAGE_W = 590
export const PAGE_H = 780

export function blankPage(num) {
  return {
    id: Math.random().toString(36).slice(2, 9),
    num,
    date: null,
    content: { strokes: [], texts: [], images: [] },
  }
}

function PageRules({ style }) {
  if (!style || style === 'blank') return null
  if (style === 'ruled') {
    return (
      <div className="page-rules">
        {Array.from({ length: 18 }, (_, i) => (
          <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: (i + 1) * 38, height: 1, background: 'rgba(0,0,0,0.08)' }} />
        ))}
      </div>
    )
  }
  if (style === 'dotted') {
    return <div className="page-rules" style={{ backgroundImage: 'radial-gradient(rgba(0,0,0,0.18) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
  }
  if (style === 'grid') {
    return (
      <div className="page-rules" style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,0.06) 1px,transparent 1px)`,
        backgroundSize: '22px 22px',
      }} />
    )
  }
  return null
}

function TextBox({ t, selected, onSelect, onEdit, onMove, interactive }) {
  const [editing, setEditing] = React.useState(false)
  const ref = React.useRef(null)
  const dragRef = React.useRef(null)

  const onPointerDown = (e) => {
    if (!interactive) return
    e.stopPropagation()
    if (editing) return
    onSelect()
    dragRef.current = { x: e.clientX, y: e.clientY }
    e.target.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e) => {
    if (!dragRef.current) return
    const r = ref.current.parentElement.getBoundingClientRect()
    const sx = PAGE_W / r.width
    onMove((e.clientX - dragRef.current.x) * sx, (e.clientY - dragRef.current.y) * sx)
    dragRef.current = { x: e.clientX, y: e.clientY }
  }
  const onPointerUp = () => { dragRef.current = null }

  return (
    <div ref={ref}
      className={'txtbox ' + (editing ? 'editing' : '') + (selected && !editing ? ' selected' : '')}
      style={{ left: t.x, top: t.y, fontSize: t.fontSize || 20, color: t.color || '#1a1a1a',
        fontFamily: t.font === 'serif' ? 'var(--serif)' : 'var(--hand)',
        zIndex: 5, pointerEvents: interactive ? 'auto' : 'none' }}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
      onDoubleClick={e => { e.stopPropagation(); setEditing(true) }}
      onBlur={() => setEditing(false)}
      contentEditable={editing} suppressContentEditableWarning
      onInput={e => onEdit(e.currentTarget.textContent)}>
      {!editing ? (t.text || '') : null}
      {editing && t.text === '' && <span style={{ opacity: 0.4 }}>type…</span>}
    </div>
  )
}

function ImageBox({ img, interactive, onMove, onResize }) {
  const dragRef = React.useRef(null)
  const resizeRef = React.useRef(null)
  const ref = React.useRef(null)

  const dragStart = (e) => {
    if (!interactive) return
    e.stopPropagation()
    dragRef.current = { x: e.clientX, y: e.clientY }
    e.target.setPointerCapture(e.pointerId)
  }
  const dragMove = (e) => {
    if (!dragRef.current && !resizeRef.current) return
    const r = ref.current.parentElement.getBoundingClientRect()
    const sx = PAGE_W / r.width
    if (dragRef.current) {
      onMove((e.clientX - dragRef.current.x) * sx, (e.clientY - dragRef.current.y) * sx)
      dragRef.current = { x: e.clientX, y: e.clientY }
    } else if (resizeRef.current) {
      onResize((e.clientX - resizeRef.current.x) * sx, (e.clientY - resizeRef.current.y) * sx)
      resizeRef.current = { x: e.clientX, y: e.clientY }
    }
  }
  const dragEnd = () => { dragRef.current = null; resizeRef.current = null }
  const resizeStart = (e) => {
    e.stopPropagation()
    resizeRef.current = { x: e.clientX, y: e.clientY }
    e.target.setPointerCapture(e.pointerId)
  }

  return (
    <div ref={ref} className="imgbox"
      style={{ left: img.x, top: img.y, width: img.w, height: img.h,
        transform: `rotate(${img.rot || 0}deg)`, zIndex: 4,
        pointerEvents: interactive ? 'auto' : 'none' }}
      onPointerDown={dragStart} onPointerMove={dragMove} onPointerUp={dragEnd}>
      <div className="tape" />
      <img src={img.src} alt="" draggable={false} />
      {interactive && <div className="handle br" onPointerDown={resizeStart} onPointerMove={dragMove} onPointerUp={dragEnd} />}
    </div>
  )
}

function PageContent({ page, side, pageNumber, dateStr, paperStyle, activeTool,
  color, size, drawEnabled, onCommitStroke, onEraseStroke,
  selectedTextId, setSelectedTextId, onTextEdit, onTextMove,
  onImageMove, onImageResize, onObjectAdd }) {
  const { strokes = [], texts = [], images = [] } = page.content
  const wrapRef = React.useRef(null)

  const handleClick = (e) => {
    if (activeTool !== 'text') return
    if (e.target.closest('.txtbox') || e.target.closest('.imgbox')) return
    const r = wrapRef.current.getBoundingClientRect()
    onObjectAdd({ x: (e.clientX - r.left) * (PAGE_W / r.width), y: (e.clientY - r.top) * (PAGE_H / r.height) })
  }

  return (
    <div ref={wrapRef} className={'page ' + side}
      style={{ '--paper-cream': paperStyle.bg, backgroundColor: paperStyle.bg }}
      onClick={handleClick}>
      <PageRules style={paperStyle.rules} />
      <div className="page-date">{dateStr}</div>
      <div className="page-num">{pageNumber}</div>
      <DrawCanvas width={PAGE_W} height={PAGE_H} strokes={strokes}
        tool={activeTool} color={color} size={size}
        enabled={drawEnabled && ['ball', 'fountain', 'marker', 'eraser-pixel', 'eraser-obj'].includes(activeTool)}
        onCommitStroke={s => onCommitStroke(side, s)}
        onEraseStroke={(idx, rep) => onEraseStroke(side, idx, rep)} />
      {images.map(img => (
        <ImageBox key={img.id} img={img}
          interactive={activeTool === 'image' || activeTool === 'select'}
          onMove={(dx, dy) => onImageMove(side, img.id, dx, dy)}
          onResize={(dw, dh) => onImageResize(side, img.id, dw, dh)} />
      ))}
      {texts.map(t => (
        <TextBox key={t.id} t={t} selected={selectedTextId === t.id}
          onSelect={() => setSelectedTextId(t.id)}
          onEdit={text => onTextEdit(side, t.id, text)}
          onMove={(dx, dy) => onTextMove(side, t.id, dx, dy)}
          interactive={activeTool === 'text' || activeTool === 'select'} />
      ))}
    </div>
  )
}

function ThumbPreview({ page }) {
  const ref = React.useRef(null)
  React.useEffect(() => {
    const cv = ref.current; if (!cv) return
    cv.width = 120; cv.height = 160
    const ctx = cv.getContext('2d')
    ctx.scale(120 / PAGE_W, 160 / PAGE_H)
    for (const s of page.content.strokes) drawStroke(ctx, s)
  }, [page])
  return <canvas ref={ref} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
}

function PageStrip({ pages, pageIdx, setPageIdx, addPage }) {
  return (
    <div className="page-strip">
      {pages.map((p, i) => (
        <div key={p.id} className={'thumb ' + (i === pageIdx || i === pageIdx + 1 ? 'on' : '')}
          onClick={() => setPageIdx(i)}>
          <ThumbPreview page={p} />
          <div className="n">{i + 1}</div>
        </div>
      ))}
      <div className="add" onClick={addPage}>+</div>
    </div>
  )
}

// ── Reader ──────────────────────────────────────────────────────────
export function Reader({ journal, onClose, ui, setUi }) {
  const [pageIdx, setPageIdx] = React.useState(0)
  const [flip, setFlip] = React.useState(null)
  const [history, setHistory] = React.useState([])
  const [redoStack, setRedoStack] = React.useState([])
  const [selectedTextId, setSelectedTextId] = React.useState(null)
  const [j, setJ] = React.useState(journal)
  const fileRef = React.useRef(null)
  const imageTargetRef = React.useRef('left')

  // Auto-save: debounced 2s after last change
  const dirtyRef = React.useRef(new Map())  // pageId → content
  const saveTimerRef = React.useRef(null)

  const flushSave = React.useCallback(async () => {
    const dirty = new Map(dirtyRef.current)
    if (dirty.size === 0) return
    dirtyRef.current.clear()
    await Promise.all(
      [...dirty.entries()].map(([pageId, content]) => savePageApi(pageId, content, journal.id))
    )
  }, [journal.id])

  // Flush on unmount (going back to library)
  React.useEffect(() => () => {
    clearTimeout(saveTimerRef.current)
    flushSave()
  }, [flushSave])

  const scheduleSave = (pageId, content) => {
    dirtyRef.current.set(pageId, content)
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(flushSave, 2000)
  }

  const pages = j.pagesData
  const leftPage = pages[pageIdx]
  const rightPage = pages[pageIdx + 1]
  const totalPages = pages.length
  const dateStr = new Date(2026, 4, 1)
    .toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    .toUpperCase()

  const pushHistory = (prev) => { setHistory(h => [...h.slice(-30), prev]); setRedoStack([]) }
  const undo = () => {
    if (!history.length) return
    setRedoStack(r => [...r, j])
    setJ(history[history.length - 1])
    setHistory(h => h.slice(0, -1))
  }
  const redo = () => {
    if (!redoStack.length) return
    setHistory(h => [...h, j])
    setJ(redoStack[redoStack.length - 1])
    setRedoStack(r => r.slice(0, -1))
  }

  const updatePage = (side, fn) => {
    pushHistory(j)
    setJ(prev => {
      const idx = side === 'left' ? pageIdx : pageIdx + 1
      const np = prev.pagesData.map((p, i) => {
        if (i !== idx) return p
        const updated = fn(p)
        scheduleSave(updated.id, updated.content)
        return updated
      })
      return { ...prev, pagesData: np }
    })
  }

  const onCommitStroke = (side, s) =>
    updatePage(side, p => ({ ...p, content: { ...p.content, strokes: [...p.content.strokes, s] } }))

  const onEraseStroke = (side, idx, rep) =>
    updatePage(side, p => ({
      ...p, content: { ...p.content, strokes: rep ? rep : p.content.strokes.filter((_, i) => i !== idx) }
    }))

  const onObjectAdd = ({ x, y }) => {
    const id = Math.random().toString(36).slice(2, 9)
    updatePage('left', p => ({
      ...p, content: { ...p.content, texts: [...p.content.texts, { id, x, y, text: '', fontSize: 22, color: '#1a1a1a', font: 'hand' }] }
    }))
    setSelectedTextId(id)
  }

  const onTextEdit = (side, id, text) =>
    updatePage(side, p => ({ ...p, content: { ...p.content, texts: p.content.texts.map(t => t.id === id ? { ...t, text } : t) } }))

  const onTextMove = (side, id, dx, dy) =>
    updatePage(side, p => ({ ...p, content: { ...p.content, texts: p.content.texts.map(t => t.id === id ? { ...t, x: t.x + dx, y: t.y + dy } : t) } }))

  const onImageMove = (side, id, dx, dy) =>
    updatePage(side, p => ({ ...p, content: { ...p.content, images: p.content.images.map(im => im.id === id ? { ...im, x: im.x + dx, y: im.y + dy } : im) } }))

  const onImageResize = (side, id, dw, dh) =>
    updatePage(side, p => ({ ...p, content: { ...p.content, images: p.content.images.map(im => im.id === id ? { ...im, w: Math.max(60, im.w + dw), h: Math.max(60, im.h + dh) } : im) } }))

  const onFileChange = async (e) => {
    const file = e.target.files?.[0]; if (!file) return
    const src = await compressImage(file)
    const id = Math.random().toString(36).slice(2, 9)
    const side = imageTargetRef.current
    updatePage(side, p => ({
      ...p, content: { ...p.content, images: [...p.content.images, { id, x: 80, y: 160, w: 240, h: 180, rot: -2, src }] }
    }))
    e.target.value = ''
  }

  const animateFlip = (dir, done) => {
    const dur = 700 / (ui.flipSpeed || 1)
    const start = performance.now()
    const tick = (now) => {
      const t = Math.min(1, (now - start) / dur)
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
      setFlip({ dir, progress: eased })
      if (t < 1) requestAnimationFrame(tick)
      else { setFlip(null); done() }
    }
    requestAnimationFrame(tick)
  }

  const goNext = () => {
    if (pageIdx + 2 >= totalPages || flip) return
    setFlip({ dir: 'fwd', progress: 0 })
    animateFlip('fwd', () => setPageIdx(i => i + 2))
  }
  const goPrev = () => {
    if (pageIdx === 0 || flip) return
    setFlip({ dir: 'bwd', progress: 0 })
    animateFlip('bwd', () => setPageIdx(i => Math.max(0, i - 2)))
  }

  const addPage = async () => {
    const np = blankPage(j.pagesData.length + 1)
    pushHistory(j)
    setJ(prev => ({ ...prev, pagesData: [...prev.pagesData, np] }))
    try { await addPageApi(journal.id, { id: np.id, page_num: np.num, date: np.date, content: np.content }) }
    catch (e) { console.error('addPage failed', e) }
  }

  const flipFront = flip?.dir === 'fwd' ? pages[pageIdx + 1] : pages[pageIdx]
  const flipBack  = flip?.dir === 'fwd' ? pages[pageIdx + 2] : pages[pageIdx - 1]
  const flipAngle = flip ? (flip.dir === 'fwd' ? -180 * flip.progress : 180 * flip.progress) : 0

  const renderPage = (page, side) => {
    if (!page) return <div className={'page ' + side} style={{ background: ui.paper.bg }} />
    const num = pages.indexOf(page) + 1
    return (
      <PageContent key={page.id} page={page} side={side} pageNumber={num}
        dateStr={page.date || dateStr} paperStyle={ui.paper}
        activeTool={ui.tool} color={ui.color} size={ui.size}
        drawEnabled={!flip}
        onCommitStroke={onCommitStroke} onEraseStroke={onEraseStroke}
        selectedTextId={selectedTextId} setSelectedTextId={setSelectedTextId}
        onTextEdit={onTextEdit} onTextMove={onTextMove}
        onImageMove={onImageMove} onImageResize={onImageResize}
        onObjectAdd={onObjectAdd} />
    )
  }

  return (
    <div className="reader">
      <div className="reader-top">
        <button className="back" onClick={() => { clearTimeout(saveTimerRef.current); flushSave(); onClose() }}>
          <Icon.Back />
        </button>
        <div className="jname">{(j.title || '').replace('\n', ' ')}</div>
        <div className="jdot" />
        <div className="pgcount">Page {pageIdx + 1}–{Math.min(pageIdx + 2, totalPages)} of {totalPages}</div>
        <div className="right">
          <div className="chip">{j.subtitle || 'journal'}</div>
        </div>
      </div>

      <div className="book-stage">
        {pageIdx > 0 && <button className="nav-arrow left" onClick={goPrev}>‹</button>}
        {pageIdx + 2 < totalPages && <button className="nav-arrow right" onClick={goNext}>›</button>}

        <div className="spread">
          {renderPage(leftPage, 'left')}
          {renderPage(rightPage, 'right')}
          {!flip && pageIdx + 2 < totalPages && <div className="peel next" onClick={goNext} />}
          {!flip && pageIdx > 0 && <div className="peel prev" onClick={goPrev} />}
          {flip && flipFront && (
            <div className={'flipping ' + flip.dir} style={{ transform: `rotateY(${flipAngle}deg)` }}>
              <div className="face">
                {renderPage(flipFront, flip.dir === 'fwd' ? 'right' : 'left')}
                <div style={{
                  position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: 'inherit',
                  background: flip.dir === 'fwd'
                    ? `linear-gradient(90deg,rgba(0,0,0,${0.05 + 0.4 * flip.progress}) 0%,transparent ${30 + 50 * flip.progress}%)`
                    : `linear-gradient(-90deg,rgba(0,0,0,${0.05 + 0.4 * flip.progress}) 0%,transparent ${30 + 50 * flip.progress}%)`,
                }} />
              </div>
              <div className="back">
                {flipBack && <div style={{ transform: 'scaleX(-1)', width: '100%', height: '100%' }}>
                  {renderPage(flipBack, flip.dir === 'fwd' ? 'left' : 'right')}
                </div>}
              </div>
            </div>
          )}
        </div>
      </div>

      <PageStrip pages={pages} pageIdx={pageIdx}
        setPageIdx={i => { if (flip) return; setPageIdx(i % 2 === 0 ? i : i - 1) }}
        addPage={addPage} />

      <Toolbar ui={ui} setUi={setUi} onUndo={undo} onRedo={redo}
        canUndo={history.length > 0} canRedo={redoStack.length > 0}
        onAddImage={() => { imageTargetRef.current = 'left'; fileRef.current.click() }} />

      <input type="file" accept="image/*" ref={fileRef} onChange={onFileChange} style={{ display: 'none' }} />
    </div>
  )
}
