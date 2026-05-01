import React from 'react'

export function smoothPath(points) {
  if (points.length < 2) return null
  const p = points
  const path = new Path2D()
  path.moveTo(p[0].x, p[0].y)
  if (p.length === 2) { path.lineTo(p[1].x, p[1].y); return path }
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i-1] || p[i], p1 = p[i], p2 = p[i+1], p3 = p[i+2] || p2
    const cp1x = p1.x + (p2.x - p0.x) / 6, cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6, cp2y = p2.y - (p3.y - p1.y) / 6
    path.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y)
  }
  return path
}

export function drawStroke(ctx, s) {
  if (!s.points || s.points.length === 0) return
  ctx.save()
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  ctx.globalAlpha = s.opacity ?? 1
  if (s.tool === 'fountain') {
    ctx.strokeStyle = s.color
    const pts = s.points
    if (pts.length === 1) {
      ctx.fillStyle = s.color; ctx.beginPath()
      ctx.arc(pts[0].x, pts[0].y, (pts[0].w || s.width) / 2, 0, Math.PI * 2); ctx.fill()
    } else {
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i-1], b = pts[i]
        ctx.lineWidth = (a.w + b.w) / 2
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
      }
    }
  } else if (s.tool === 'marker') {
    ctx.globalAlpha = s.opacity ?? 0.45
    ctx.strokeStyle = s.color; ctx.lineWidth = s.width
    ctx.lineCap = 'square'
    const path = smoothPath(s.points); if (path) ctx.stroke(path)
  } else {
    ctx.strokeStyle = s.color; ctx.lineWidth = s.width
    const path = smoothPath(s.points)
    if (path) ctx.stroke(path)
    else if (s.points.length === 1) {
      ctx.fillStyle = s.color; ctx.beginPath()
      ctx.arc(s.points[0].x, s.points[0].y, s.width / 2, 0, Math.PI * 2); ctx.fill()
    }
  }
  ctx.restore()
}

function hitStroke(strokes, x, y, tol = 10) {
  for (let i = strokes.length - 1; i >= 0; i--) {
    const s = strokes[i]; const r = (s.width || 4) / 2 + tol
    for (const p of s.points) if ((p.x-x)**2 + (p.y-y)**2 < r*r) return i
    for (let j = 1; j < s.points.length; j++) {
      const a = s.points[j-1], b = s.points[j]
      const dx = b.x-a.x, dy = b.y-a.y, len2 = dx*dx+dy*dy
      if (len2 === 0) continue
      const t = Math.max(0, Math.min(1, ((x-a.x)*dx+(y-a.y)*dy)/len2))
      if (Math.hypot(x-(a.x+t*dx), y-(a.y+t*dy)) < r) return i
    }
  }
  return -1
}

export function DrawCanvas({ width, height, strokes, tool, color, size, onCommitStroke, onEraseStroke, enabled }) {
  const cvRef = React.useRef(null)
  const liveRef = React.useRef(null)
  const stateRef = React.useRef({ drawing: false, points: [] })

  React.useEffect(() => {
    const cv = cvRef.current; if (!cv) return
    const dpr = window.devicePixelRatio || 1
    cv.width = width * dpr; cv.height = height * dpr
    cv.style.width = width + 'px'; cv.style.height = height + 'px'
    const ctx = cv.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)
    for (const s of strokes) drawStroke(ctx, s)
  }, [strokes, width, height])

  React.useEffect(() => {
    const lv = liveRef.current; if (!lv) return
    const dpr = window.devicePixelRatio || 1
    lv.width = width * dpr; lv.height = height * dpr
    lv.style.width = width + 'px'; lv.style.height = height + 'px'
    lv.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0)
  }, [width, height])

  const getXY = (e) => {
    const rect = cvRef.current.getBoundingClientRect()
    const t = e.touches ? e.touches[0] : e
    return { x: (t.clientX - rect.left) * (width / rect.width), y: (t.clientY - rect.top) * (height / rect.height) }
  }

  const onDown = (e) => {
    if (!enabled) return; e.preventDefault()
    const xy = getXY(e)
    if (tool === 'eraser-obj') {
      const idx = hitStroke(strokes, xy.x, xy.y, 8)
      if (idx >= 0) onEraseStroke(idx)
      return
    }
    stateRef.current = { drawing: true, points: [{ ...xy, t: performance.now(), w: size }] }
  }

  const onMove = (e) => {
    if (!enabled || !stateRef.current.drawing) return; e.preventDefault()
    const xy = getXY(e)
    const now = performance.now()
    const last = stateRef.current.points[stateRef.current.points.length - 1]
    const dist = Math.hypot(xy.x - last.x, xy.y - last.y)
    if (dist < 0.8) return
    let w = size
    if (tool === 'fountain') {
      const speed = dist / Math.max(1, now - last.t)
      const target = Math.max(size * 0.25, size * (1.6 - Math.min(speed, 3) * 0.45))
      w = (last.w || size) * 0.6 + target * 0.4
    }
    stateRef.current.points.push({ ...xy, t: now, w })
    const lv = liveRef.current; if (!lv) return
    const ctx = lv.getContext('2d')
    if (tool === 'eraser-pixel') {
      ctx.clearRect(0, 0, width, height)
      ctx.save(); ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1
      ctx.beginPath(); ctx.arc(xy.x, xy.y, size, 0, Math.PI * 2); ctx.stroke(); ctx.restore()
      return
    }
    ctx.clearRect(0, 0, width, height)
    drawStroke(ctx, { tool, color, width: size, opacity: tool === 'marker' ? 0.45 : 1, points: stateRef.current.points })
  }

  const onUp = (e) => {
    if (!enabled || !stateRef.current.drawing) return; e.preventDefault()
    const pts = stateRef.current.points
    stateRef.current.drawing = false
    const lv = liveRef.current
    if (lv) lv.getContext('2d').clearRect(0, 0, width, height)
    if (tool === 'eraser-pixel') {
      const radius = size * 1.2
      const kept = strokes.filter(s => !s.points.some(p => pts.some(q => Math.hypot(p.x-q.x, p.y-q.y) < radius)))
      if (kept.length !== strokes.length) onEraseStroke(null, kept)
      return
    }
    if (pts.length < 1) return
    onCommitStroke({ id: Math.random().toString(36).slice(2, 10), tool, color, width: size, opacity: tool === 'marker' ? 0.45 : 1, points: pts })
  }

  return (
    <div className={'draw-layer ' + (tool === 'eraser-obj' ? 'obj-erase' : '')}
      style={{ pointerEvents: enabled ? 'auto' : 'none' }}>
      <canvas ref={cvRef} />
      <canvas ref={liveRef} onPointerDown={onDown} onPointerMove={onMove}
        onPointerUp={onUp} onPointerCancel={onUp} onPointerLeave={onUp} />
    </div>
  )
}
