import React from 'react'
import Icon from './Icons.jsx'

const COLORS = ['#1a1a1a','#2a3f6b','#7a3a2a','#5e2a4a','#1f5040','#a86a2c','#c0392b']

export function Toolbar({ ui, setUi, onUndo, onRedo, canUndo, canRedo, onAddImage }) {
  const [open, setOpen] = React.useState(null)
  const u = (k, v) => setUi(prev => ({ ...prev, [k]: v }))

  const tools = [
    { id: 'ball',         icon: <Icon.Pen />,       group: 'pen' },
    { id: 'fountain',     icon: <Icon.Fountain />,  group: 'pen' },
    { id: 'marker',       icon: <Icon.Marker />,    group: 'pen' },
    { id: 'eraser-pixel', icon: <Icon.EraserPx />,  group: 'erase' },
    { id: 'eraser-obj',   icon: <Icon.EraserObj />, group: 'erase' },
    { id: 'text',         icon: <Icon.Text />,      group: 'obj' },
    { id: 'image',        icon: <Icon.Image />,     group: 'obj' },
  ]

  const onToolClick = (t) => {
    if (t.id === 'image') { onAddImage(); return }
    u('tool', t.id)
    if (t.group === 'pen') setOpen(open === 'pen' ? null : 'pen')
    else setOpen(null)
  }

  return (
    <div className={'toolbar-wrap ' + (ui.toolbarPos || 'bottom')}>
      <div className="toolbar">
        {tools.slice(0, 3).map(t => (
          <button key={t.id} className={'tool ' + (ui.tool === t.id ? 'active' : '')}
            onClick={() => onToolClick(t)}>{t.icon}</button>
        ))}
        <div className="tool-divider" />
        {tools.slice(3, 5).map(t => (
          <button key={t.id} className={'tool ' + (ui.tool === t.id ? 'active' : '')}
            onClick={() => onToolClick(t)}>{t.icon}</button>
        ))}
        <div className="tool-divider" />
        {tools.slice(5).map(t => (
          <button key={t.id} className={'tool ' + (ui.tool === t.id ? 'active' : '')}
            onClick={() => onToolClick(t)}>{t.icon}</button>
        ))}
        <div className="tool-divider" />
        <button className="tool" disabled={!canUndo} onClick={onUndo} style={{ opacity: canUndo ? 1 : 0.35 }}><Icon.Undo /></button>
        <button className="tool" disabled={!canRedo} onClick={onRedo} style={{ opacity: canRedo ? 1 : 0.35 }}><Icon.Redo /></button>

        {open === 'pen' && (
          <div className="flyout" onClick={e => e.stopPropagation()}>
            <div className="lbl">Pen</div>
            <div className="pen-types">
              {[['ball','ball'],['fountain','fountain'],['marker','marker']].map(([id, label]) => (
                <button key={id} className={ui.tool === id ? 'on' : ''} onClick={() => u('tool', id)}>{label}</button>
              ))}
            </div>
            <div className="lbl">Color</div>
            <div className="swatches">
              {COLORS.map(c => (
                <div key={c} className={'swatch ' + (ui.color === c ? 'on' : '')}
                  style={{ background: c }} onClick={() => u('color', c)} />
              ))}
            </div>
            <div className="lbl">Size <span style={{ float: 'right' }}>{ui.size}px</span></div>
            <div className="size-row">
              <div className="size-track">
                <input type="range" min="1" max="40" value={ui.size}
                  onChange={e => u('size', +e.target.value)} />
              </div>
              <div className="size-preview" style={{ color: ui.color }}>
                <div className="size-dot"
                  style={{ width: Math.min(20, ui.size), height: Math.min(20, ui.size), opacity: ui.tool === 'marker' ? 0.5 : 1 }} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
