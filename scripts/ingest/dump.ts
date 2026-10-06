// Debug helper: print items as plain text.  tsx scripts/ingest/dump.ts <id-regex> [maxChars]
import { readFileSync } from 'node:fs'
import type { Block, Dataset } from '../../src/data/schema'
const ds: Dataset = JSON.parse(readFileSync(new URL('../../src/data/generated/part145.json', import.meta.url), 'utf8'))
const re = new RegExp(process.argv[2] ?? '.'); const max = +(process.argv[3] ?? 1e9)
const txt = (bs: Block[], ind = ''): string => bs.map((b) => b.k === 'p'
  ? `${ind}${'  '.repeat(b.level)}${b.style === 'heading' ? '## ' : b.style === 'bullet' ? '• ' : ''}${b.label ? b.label + ' ' : ''}${b.runs.map((r) => r.ref ? `[${r.t}→${r.ref}]` : r.ext ? `[${r.t}⇢ext]` : r.t).join('')}${b.path ? `   «${b.path}»` : ''}`
  : b.rows.map((r) => ind + '| ' + r.map((c) => (c.vmerge === 'cont' ? '^' : '') + (c.span ? `<${c.span}>` : '') + txt(c.blocks).replace(/\n/g, ' / ')).join(' | ')).join('\n')).join('\n')
for (const id of ds.order) if (re.test(id)) {
  const it = ds.items[id]
  console.log(`\n=== ${id} :: ${it.reference} — ${it.title} [${it.type}] ${it.source.document} appl ${it.applicabilityDate} parent=${it.parent ?? ''} amc=${it.amc.length} gm=${it.gm.length}`)
  console.log(txt(it.blocks).slice(0, max))
  if (it.references.length) console.log('refs:', it.references.map((r) => r.target ?? `${r.external}:${r.label}`).join(', ').slice(0, 400))
}
