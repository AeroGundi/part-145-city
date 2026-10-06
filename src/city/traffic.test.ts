import { describe, expect, it } from 'vitest'
import { ambientCars, ambientWalkers, Traffic, VEHICLE_DIM } from './traffic'
import { groundObstacles } from './aircraft'

/** Runs the ambient world for a while and reports every time two things overlap. */
function run(minutes: number, low: boolean) {
  const T = new Traffic(ambientCars(low), ambientWalkers(low ? 46 : 150))
  const hits = { cars: 0, people: 0, aircraft: 0 }
  const first: string[] = []
  const moved = T.cars.map(() => 0)
  const longestStop = T.cars.map(() => 0)
  const h = 1 / 30
  let t = 30
  for (let i = 0; i < minutes * 60 * 30; i++) {
    t += h
    T.advance(h, () => groundObstacles(t))
    const bodies = T.cars.map((c) => T.bodies(c))
    for (let a = 0; a < bodies.length; a++) {
      moved[a] += T.cars[a].v * h
      longestStop[a] = Math.max(longestStop[a], T.cars[a].stuck)
      for (let b = a + 1; b < bodies.length; b++) for (const p of bodies[a]) for (const q of bodies[b]) {
        if (Math.hypot(p.x - q.x, p.z - q.z) < p.r + q.r - 0.02) { hits.cars++; if (first.length < 6) first.push(`t=${t.toFixed(1)} ${T.cars[a].units[0].kind}#${a} × ${T.cars[b].units[0].kind}#${b} at ${p.x.toFixed(1)},${p.z.toFixed(1)}`) }
      }
      for (const w of T.walkers) {
        if (w.scale < 0.3) continue
        for (const p of bodies[a]) if (Math.hypot(p.x - w.pose.x, p.z - w.pose.z) < p.r + 0.12) { hits.people++; if (first.length < 6) first.push(`t=${t.toFixed(1)} ${T.cars[a].units[0].kind}#${a} × walker at ${p.x.toFixed(1)},${p.z.toFixed(1)} v=${T.cars[a].v.toFixed(2)}`) }
      }
      const ac = groundObstacles(t).slice(0, 15)
      for (const p of bodies[a]) for (const o of ac) if (Math.hypot(p.x - o.x, p.z - o.z) < p.r + o.r - 0.3) { hits.aircraft++; if (first.length < 6) first.push(`t=${t.toFixed(1)} ${T.cars[a].units[0].kind}#${a} × aircraft at ${p.x.toFixed(1)},${p.z.toFixed(1)}`) }
    }
  }
  return { T, hits, first, moved, longestStop, seconds: minutes * 60 }
}

describe('ambient traffic', () => {
  it('knows the size of every vehicle', () => {
    for (const d of Object.values(VEHICLE_DIM)) { expect(d.len).toBeGreaterThan(d.wid); expect(d.wid).toBeGreaterThan(0.5) }
  })
  for (const low of [false, true]) {
    it(`never drives through a vehicle, a person or an aircraft, and keeps moving (${low ? 'low power' : 'full'})`, { timeout: 240000 }, () => {
      const r = run(low ? 4 : 6, low)
      expect(r.first, 'overlaps').toEqual([])
      expect(r.hits).toEqual({ cars: 0, people: 0, aircraft: 0 })
      // and the world keeps moving
      expect(r.moved.filter((m) => m > 60).length).toBeGreaterThan(r.T.cars.length * 0.7)
    })
  }
  it('is deterministic', { timeout: 60000 }, () => {
    const a = run(1, false).T.cars.map((c) => c.s.toFixed(3)), b = run(1, false).T.cars.map((c) => c.s.toFixed(3))
    expect(a).toEqual(b)
  })
})
