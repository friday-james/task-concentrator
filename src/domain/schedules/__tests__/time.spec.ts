import { describe, expect, it } from 'vitest'
import { Time } from '../time'

describe('Time', () => {
  it('should reject invalid time', () => {
    expect(() => new Time(-1, 0)).toThrow('Invalid hour')
    expect(() => new Time(0, -1)).toThrow('Invalid minute')
    expect(() => new Time(24, 0)).toThrow('Invalid hour')
    expect(() => new Time(0, 60)).toThrow('Invalid minute')
  })

  it('should accept valid time', () => {
    new Time(0, 0)
    new Time(23, 59)
  })

  it('should get hour and minute', () => {
    const time = new Time(12, 34)
    expect(time.hour).toBe(12)
    expect(time.minute).toBe(34)
  })
})
