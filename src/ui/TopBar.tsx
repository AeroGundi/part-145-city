import { useState } from 'react'
import { BookA, ClipboardCheck, Crosshair, Database, Info, Moon, PanelLeft, Search, Settings2, ShieldCheck, Sun, SunMoon } from 'lucide-react'
import { useApp, type TimeMode } from '../store/app'
import { go, goHome } from '../nav'
import { DATA, fmtDate } from '../data/dataset'

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

export function Logo() {
  return (
    <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden>
      <path d="M16 4 28 10.5v11L16 28 4 21.5v-11z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M4 10.5 16 17l12-6.5M16 17v11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M10 13.8v-4l6-3.2 6 3.2v4" fill="none" stroke="var(--amber)" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  )
}

export function TopBar() {
  const { mode, set, settings, setSettings, infosec, webgl } = useApp()
  const [menu, setMenu] = useState(false)
  const Time = settings.timeMode === 'day' ? Sun : settings.timeMode === 'night' ? Moon : SunMoon
  return (
    <header className="topbar">
      <button className="icon-btn" aria-label="Toggle table of contents" aria-pressed={settings.tocOpen} title="Table of contents" onClick={() => setSettings({ tocOpen: !settings.tocOpen })}><PanelLeft size={17} /></button>
      <button className="brand" onClick={() => { set({ connections: false, infosec: false }); goHome() }} aria-label="Part-145 City — home">
        <Logo /><span className="brand-name">PART-145 CITY</span><span className="brand-tag">The visual map of EASA Part-145</span>
      </button>
      <div className="seg" role="tablist" aria-label="Mode">
        <button role="tab" aria-selected={mode === 'explore'} onClick={() => set({ mode: 'explore' })} disabled={!webgl && false}>Explore</button>
        <button role="tab" aria-selected={mode === 'reference'} onClick={() => set({ mode: 'reference' })}>Reference</button>
      </div>
      <button className="searchbox" onClick={() => set({ overlay: 'search' })} aria-label="Search Part-145" aria-keyshortcuts="Meta+K Control+K">
        <Search size={15} aria-hidden /><span>Search Part-145…</span><kbd>{isMac ? '⌘' : 'Ctrl'} K</kbd>
      </button>
      <nav className="tools" aria-label="Tools">
        <button className="tool" onClick={() => go('/find')}><Crosshair size={15} /><span>Find</span></button>
        <button className="tool" onClick={() => go('/audit')}><ClipboardCheck size={15} /><span>Audit</span></button>
        <button className="tool" onClick={() => go('/glossary')}><BookA size={15} /><span>Glossary</span></button>
        <button className={`tool tool-layer${infosec ? ' on' : ''}`} aria-pressed={infosec} onClick={() => set({ infosec: !infosec, connections: false, mode: 'explore' })} title="Information security layer — 145.A.200A"><ShieldCheck size={15} /><span>Information security</span></button>
      </nav>
      <div className="menu-wrap">
        <button className="icon-btn" aria-label="Settings" aria-expanded={menu} onClick={() => setMenu(!menu)}><Settings2 size={17} /></button>
        {menu && (
          <div className="menu" role="dialog" aria-label="Settings">
            <h4>World</h4>
            <label className="sw"><input type="checkbox" checked={settings.animation} onChange={(e) => setSettings({ animation: e.target.checked })} /><span>Living world animation<em>People, vehicles, aircraft, clouds</em></span></label>
            <label className="sw"><input type="checkbox" checked={settings.cinematic} onChange={(e) => setSettings({ cinematic: e.target.checked })} /><span>Cinematic camera<em>Off = instant navigation</em></span></label>
            <label className="sw"><input type="checkbox" checked={settings.lowPower} onChange={(e) => setSettings({ lowPower: e.target.checked })} /><span>Reduced performance mode<em>No shadows, fewer figures</em></span></label>
            <h4>Time of day</h4>
            <div className="seg seg-s">{(['day', 'auto', 'night'] as TimeMode[]).map((t) => <button key={t} aria-pressed={settings.timeMode === t} onClick={() => setSettings({ timeMode: t })}>{t === 'auto' ? 'Cycle' : t[0].toUpperCase() + t.slice(1)}</button>)}</div>
            <h4>Dataset</h4>
            <button className="menu-link" onClick={() => { setMenu(false); set({ overlay: 'about' }) }}><Database size={14} />Regulatory dataset & sources</button>
            <p className="menu-note">EASA eRules export of {fmtDate(DATA.meta.publishedAt.slice(0, 10))}</p>
          </div>
        )}
      </div>
      <button className="icon-btn time-btn" aria-label={`Time of day: ${settings.timeMode}`} title="Day / cycle / night" onClick={() => setSettings({ timeMode: settings.timeMode === 'day' ? 'night' : settings.timeMode === 'night' ? 'auto' : 'day' })}><Time size={17} /></button>
      <button className="icon-btn" aria-label="About the dataset" title="Dataset & sources" onClick={() => set({ overlay: 'about' })}><Info size={17} /></button>
    </header>
  )
}
