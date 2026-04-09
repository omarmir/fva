import { describe, expect, it } from 'vitest'
import './compat'

describe('compat polyfills', () => {
  it('provides non-enumerable Map insertion helpers', () => {
    const map = new Map<string, number>()

    expect(map.getOrInsert('cash', 12)).toBe(12)
    expect(map.getOrInsert('cash', 99)).toBe(12)
    expect(map.getOrInsertComputed('liabilities', () => 34)).toBe(34)
    expect(map.getOrInsertComputed('liabilities', () => 88)).toBe(34)
    expect(Object.prototype.propertyIsEnumerable.call(Map.prototype, 'getOrInsert')).toBe(false)
    expect(Object.prototype.propertyIsEnumerable.call(Map.prototype, 'getOrInsertComputed')).toBe(false)
  })

  it('provides Promise.withResolvers', async () => {
    const deferred = Promise.withResolvers<number>()
    deferred.resolve(27)

    await expect(deferred.promise).resolves.toBe(27)
  })
})
