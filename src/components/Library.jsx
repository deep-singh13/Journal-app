import React from 'react'

export const COVER_PRESETS = [
  { cover:'linear-gradient(135deg, oklch(0.86 0.06 30) 0%, oklch(0.78 0.07 25) 100%)',    ink:'#5a2a18', title:'Field Notes',    subtitle:'Vol. III · spring',    monogram:'ƒ', mono:'MMXXVI' },
  { cover:'linear-gradient(135deg, oklch(0.88 0.05 240) 0%, oklch(0.80 0.06 250) 100%)',  ink:'#26365e', title:'Night Pages',    subtitle:'a quiet log',          monogram:'n', mono:'NO. 07' },
  { cover:'linear-gradient(135deg, oklch(0.88 0.05 140) 0%, oklch(0.80 0.06 130) 100%)',  ink:'#2a4528', title:'Garden\nNotes', subtitle:'almanac',              monogram:'✿', mono:'' },
  { cover:'linear-gradient(135deg, oklch(0.90 0.07 70) 0%, oklch(0.83 0.08 55) 100%)',    ink:'#5a3210', title:'Travelogue',    subtitle:'Lisbon · porto',        monogram:'▲', mono:'2025—2026' },
  { cover:'linear-gradient(135deg, oklch(0.86 0.05 290) 0%, oklch(0.78 0.06 280) 100%)',  ink:'#3a2858', title:'Dreams',        subtitle:'unsorted',             monogram:'☾', mono:'' },
  { cover:'linear-gradient(135deg, oklch(0.92 0.06 95) 0%, oklch(0.85 0.07 80) 100%)',    ink:'#5a4010', title:'Studio\nLog',  subtitle:'sketches & studies',   monogram:'s', mono:'BOOK 04' },
  { cover:'linear-gradient(135deg, oklch(0.90 0.05 350) 0%, oklch(0.83 0.06 340) 100%)',  ink:'#5a2840', title:'Letters\nNot Sent', subtitle:'',               monogram:'✉', mono:'' },
  { cover:'linear-gradient(135deg, oklch(0.88 0.04 200) 0%, oklch(0.80 0.05 200) 100%)',  ink:'#1a3e4a', title:'Sea Diary',    subtitle:'tidepool studies',      monogram:'~', mono:'V. II' },
]

function BigBook({ data }) {
  const titleParts = (data.title || '').split('\n')
  return (
    <div className="bigbook" style={{ '--cover': data.cover, '--ink-title': data.ink }}>
      <div className="bigbook-cover">
        <div className="bigbook-spine" />
        <div className="bigbook-band" />
        <div className="bigbook-title">
          {titleParts.map((t, i) => <div key={i}>{t}</div>)}
          {data.subtitle && <em>{data.subtitle}</em>}
        </div>
        {data.mono && <div className="bigbook-mono">{data.mono}</div>}
        {data.monogram && <div className="bigbook-emblem">{data.monogram}</div>}
      </div>
      <div className="bigbook-pages" />
    </div>
  )
}

export function Library({ journals, onOpen, onCreate }) {
  const items = [...journals, { id: '__new__', isNew: true }]
  const [idx, setIdx] = React.useState(0)
  const [drag, setDrag] = React.useState(0)
  const dragRef = React.useRef(null)
  const wrapRef = React.useRef(null)
  const today = new Date(2026, 4, 1)
  const focused = items[idx]
  const totalPages = journals.reduce((a, b) => a + (b.pages || 0), 0)

  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') setIdx(i => Math.min(items.length - 1, i + 1))
      if (e.key === 'ArrowLeft') setIdx(i => Math.max(0, i - 1))
      if (e.key === 'Enter' && focused && !focused.isNew) onOpen(focused.id)
      if (e.key === 'Enter' && focused?.isNew) onCreate()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [items.length, focused, onOpen, onCreate])

  const onPointerDown = (e) => {
    dragRef.current = { x: e.clientX }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e) => { if (!dragRef.current) return; setDrag(e.clientX - dragRef.current.x) }
  const onPointerUp = () => {
    if (!dragRef.current) return
    if (drag < -80) setIdx(i => Math.min(items.length - 1, i + 1))
    else if (drag > 80) setIdx(i => Math.max(0, i - 1))
    setDrag(0); dragRef.current = null
  }
  const onWheel = (e) => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      e.preventDefault()
      if (e.deltaX > 30) setIdx(i => Math.min(items.length - 1, i + 1))
      else if (e.deltaX < -30) setIdx(i => Math.max(0, i - 1))
    }
  }

  return (
    <div className="library">
      <div className="lib-head">
        <div>
          <div className="lib-title">Your <em>library</em></div>
          <div className="lib-sub">{journals.length} journals · {totalPages} pages</div>
        </div>
        <div className="lib-date">
          <b>{today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</b>
          {today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric' })}
        </div>
      </div>

      <div className="carousel-stage" ref={wrapRef}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove}
        onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onWheel={onWheel}>
        <div className="carousel-glow" />
        <div className="carousel-floor" />

        <div className="carousel-track" style={{
          transform: `translate(0,-50%) translateX(calc(-230px - ${idx * 460}px + ${drag}px))`,
          transition: dragRef.current ? 'none' : 'transform .55s cubic-bezier(.2,.85,.25,1)',
        }}>
          {items.map((item, i) => {
            const offset = i - idx
            const isFocus = i === idx
            return (
              <div key={item.id}
                className={'carousel-slot ' + (isFocus ? 'focus' : '')}
                style={{
                  transform: `translateZ(${isFocus ? 0 : -120}px) rotateY(${offset * -12}deg) translateY(${Math.abs(offset) * 8}px) scale(${isFocus ? 1 : 0.78})`,
                  filter: isFocus ? 'none' : `brightness(${0.55 - Math.abs(offset) * 0.08}) blur(${Math.abs(offset) * 0.5}px)`,
                  zIndex: 100 - Math.abs(offset),
                }}
                onClick={() => {
                  if (i !== idx) { setIdx(i); return }
                  if (item.isNew) onCreate(); else onOpen(item.id)
                }}>
                {item.isNew ? (
                  <div className="bigbook new">
                    <div className="bigbook-cover">
                      <div className="plus">+</div>
                      <div style={{ fontSize: 13, letterSpacing: '0.16em', textTransform: 'uppercase', marginTop: 10 }}>New journal</div>
                    </div>
                  </div>
                ) : (
                  <BigBook data={item} />
                )}
              </div>
            )
          })}
        </div>

        {idx > 0 && <button className="lib-arrow left" onClick={() => setIdx(i => i - 1)}>‹</button>}
        {idx < items.length - 1 && <button className="lib-arrow right" onClick={() => setIdx(i => i + 1)}>›</button>}
      </div>

      <div className="carousel-info">
        {focused?.isNew ? (
          <>
            <div className="ci-title">Start fresh</div>
            <div className="ci-meta">A new blank journal · 12 pages to begin</div>
            <button className="ci-open" onClick={onCreate}>Create journal →</button>
          </>
        ) : focused ? (
          <>
            <div className="ci-title">{(focused.title || '').replace('\n', ' ')}</div>
            <div className="ci-meta">
              {focused.subtitle ? focused.subtitle + ' · ' : ''}
              {focused.pages} pages · last opened {focused.lastOpened}
            </div>
            <button className="ci-open" onClick={() => onOpen(focused.id)}>Open journal →</button>
          </>
        ) : null}
        <div className="carousel-dots">
          {items.map((it, i) => (
            <button key={it.id}
              className={'dot ' + (i === idx ? 'on' : '') + (it.isNew ? ' add' : '')}
              onClick={() => setIdx(i)} />
          ))}
        </div>
      </div>
    </div>
  )
}
