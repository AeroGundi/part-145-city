import { describe, expect, it } from 'vitest'
import { DISTRICTS } from '../content/city'
import { DOORS, FEET, makePath, poseAt, walkRoute } from './layout'
import { flightPose, FLIGHT_PERIOD } from './aircraft'

describe('movement layout', () => {
  it('rounds corners and resamples evenly', () => {
    const p = makePath([[0, 0], [10, 0], [10, 10]], { radius: 2, step: 0.5 })
    expect(p.len).toBeGreaterThan(18)
    expect(p.len).toBeLessThan(20)
    const a = poseAt(p, 0, { x: 0, z: 0, h: 0 }), b = poseAt(p, p.len, { x: 0, z: 0, h: 0 })
    expect([a.x, a.z]).toEqual([0, 0])
    expect(b.x).toBeCloseTo(10); expect(b.z).toBeCloseTo(10)
  })
  it('connects every pair of districts on foot, via the roads', () => {
    for (const a of DISTRICTS) for (const b of DISTRICTS) {
      if (a.id === b.id) continue
      const path = walkRoute(a.id, b.id)
      const direct = Math.hypot(DOORS[a.id][0] - DOORS[b.id][0], DOORS[a.id][1] - DOORS[b.id][1])
      expect(path.len, `${a.id} → ${b.id}`).toBeGreaterThanOrEqual(direct - 6)
      expect(path.len, `${a.id} → ${b.id}`).toBeLessThan(direct * 2.2 + 60)
    }
    expect(Object.keys(FEET).length).toBe(DISTRICTS.length)
  })
  it('flies a continuous, deterministic circuit', () => {
    const p = { x: 0, y: 0, z: 0, h: 0, pitch: 0, phase: 'air' as const, t: 0 }
    let px = NaN, pz = NaN
    for (let t = 0.5; t < FLIGHT_PERIOD - 0.5; t += 0.25) {
      const q = flightPose(t, p)
      expect(q.y).toBeGreaterThanOrEqual(0)
      if (!Number.isNaN(px)) expect(Math.hypot(q.x - px, q.z - pz), `t=${t}`).toBeLessThan(9)
      px = q.x; pz = q.z
    }
    expect(flightPose(80, p).phase).toBe('parked')
    expect(flightPose(80 + FLIGHT_PERIOD, p).x).toBe(flightPose(80, { ...p }).x)
  })
})
