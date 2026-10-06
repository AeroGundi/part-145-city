/** Local-first persistence (IndexedDB via Dexie): settings, recently opened points, bookmarks. */
import Dexie, { type Table } from 'dexie'
import { DEFAULT_SETTINGS, useApp, type Mode, type Settings } from './app'

interface KV { key: string; value: unknown }
export interface Recent { id: string; at: number }
export interface Bookmark { id: string; at: number }

class Db extends Dexie {
  kv!: Table<KV, string>
  recents!: Table<Recent, string>
  bookmarks!: Table<Bookmark, string>
  constructor() {
    super('part-145-city')
    this.version(1).stores({ kv: 'key', recents: 'id, at', bookmarks: 'id, at' })
  }
}
export const db = new Db()
const safe = async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => { try { return await fn() } catch { return fallback } }

export async function hydrate() {
  const settings = await safe(() => db.kv.get('settings'), undefined)
  const mode = await safe(() => db.kv.get('mode'), undefined)
  useApp.setState((s) => ({
    settings: { ...DEFAULT_SETTINGS, ...((settings?.value as Partial<Settings>) ?? {}) },
    mode: (mode?.value as Mode) ?? s.mode,
  }))
  useApp.subscribe((s, prev) => {
    if (s.settings !== prev.settings) void safe(() => db.kv.put({ key: 'settings', value: s.settings }), '')
    if (s.mode !== prev.mode) void safe(() => db.kv.put({ key: 'mode', value: s.mode }), '')
  })
}
export const addRecent = (id: string) => safe(() => db.recents.put({ id, at: Date.now() }), '')
export const getRecents = () => safe(() => db.recents.orderBy('at').reverse().limit(8).toArray(), [] as Recent[])
export const toggleBookmark = async (id: string) => safe(async () => { (await db.bookmarks.get(id)) ? await db.bookmarks.delete(id) : await db.bookmarks.put({ id, at: Date.now() }); return true }, false)
export const getBookmarks = () => safe(() => db.bookmarks.orderBy('at').reverse().toArray(), [] as Bookmark[])
