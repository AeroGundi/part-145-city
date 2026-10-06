/**
 * Renders official text blocks verbatim. This component never alters wording,
 * numbering or order; it only applies layout (indent, markers, tables, links).
 */
import { memo, useEffect, useRef } from 'react'
import type { Block, Inline, RegItem } from '../data/schema'
import { AMENDMENTS, ITEMS, itemUrl, rootPoint } from '../data/dataset'
import { go } from '../nav'

function Runs({ runs }: { runs: Inline[] }) {
  return (
    <>
      {runs.map((r, i) => {
        let el: React.ReactNode = r.t
        if (r.b) el = <strong>{el}</strong>
        if (r.i) el = <em>{el}</em>
        if (r.u) el = <u>{el}</u>
        if (r.sup) el = <sup>{el}</sup>
        if (r.sub) el = <sub>{el}</sub>
        if (r.ref && ITEMS[r.ref]) {
          const href = itemUrl(r.ref)
          return <a key={i} className="rt-ref" href={href} title={`${ITEMS[r.ref].reference} — ${ITEMS[r.ref].title}`} onClick={(e) => { e.preventDefault(); go(href) }}>{el}</a>
        }
        if (r.ext) return <span key={i} className="rt-ext" title={`External reference — ${r.ext}`}>{el}</span>
        return <span key={i}>{el}</span>
      })}
    </>
  )
}

function Blocks({ blocks, owner, active }: { blocks: Block[]; owner?: RegItem; active?: string }) {
  return (
    <>
      {blocks.map((b, i) => {
        if (b.k === 'table') {
          return (
            <div className={`rt-table-wrap${b.amd ? ' rt-amd-table' : ''}`} key={i} tabIndex={0} role="region" aria-label="Table">
              <table className="rt-table">
                <tbody>
                  {b.rows.map((row, ri) => (
                    <tr key={ri}>
                      {row.map((c, ci) => {
                        if (c.vmerge === 'cont') return null
                        let rowSpan = 1
                        if (c.vmerge === 'start') {
                          // count continuation cells directly below, matching by grid column
                          const col = row.slice(0, ci).reduce((n, x) => n + (x.span ?? 1), 0)
                          for (let r2 = ri + 1; r2 < b.rows.length; r2++) {
                            let acc = 0
                            const below = b.rows[r2].find((x) => { const hit = acc === col; acc += x.span ?? 1; return hit })
                            if (below?.vmerge === 'cont') rowSpan++
                            else break
                          }
                        }
                        return <td key={ci} colSpan={c.span} rowSpan={rowSpan > 1 ? rowSpan : undefined} className={c.shade ? 'shaded' : undefined}><Blocks blocks={c.blocks} /></td>
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
        const cls = `rt-p rt-${b.style} rt-l${Math.min(b.level, 4)}${b.path && active && (b.path === active || b.path.startsWith(active)) ? ' rt-active' : ''}${b.amd ? ' rt-amd' : ''}`
        const href = b.path && owner ? itemUrl(rootPoint(owner.id).id, b.path) : undefined
        return (
          <div className={cls} key={i} data-path={b.path} title={b.amd && AMENDMENTS[b.amd] ? `As amended by ${AMENDMENTS[b.amd].short}` : undefined}>
            {b.label && (href
              ? <a className="rt-label" href={href} title={`Link to ${rootPoint(owner!.id).reference}${b.path}`} onClick={(e) => { e.preventDefault(); go(href) }}>{b.label}</a>
              : <span className="rt-label">{b.label}</span>)}
            {b.style === 'bullet' && !b.label && <span className="rt-label" aria-hidden>—</span>}
            <span className="rt-body"><Runs runs={b.runs} /></span>
          </div>
        )
      })}
    </>
  )
}

export const RegText = memo(function RegText({ item, active }: { item: RegItem; active?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!active) return
    const el = ref.current?.querySelector<HTMLElement>(`[data-path="${CSS.escape(active)}"]`)
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [active, item.id])
  if (!item.blocks.length) return null
  return <div className="rt" ref={ref} lang="en"><Blocks blocks={item.blocks} owner={item.type === 'IR' ? item : undefined} active={active} /></div>
})

export const PlainBlocks = ({ blocks }: { blocks: Block[] }) => <div className="rt"><Blocks blocks={blocks} /></div>
