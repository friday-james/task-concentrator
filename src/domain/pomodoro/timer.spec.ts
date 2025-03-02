import { describe, expect, it } from 'vitest'
import { PomodoroTimer, type PomodoroTimerUpdate } from './timer'
import { Duration } from './duration'
import { PomodoroStage } from './stage'
import { FakePeriodicTaskScheduler } from '../../infra/scheduler'
import { flushPromises } from '@vue/test-utils'

describe('PomodoroTimer', () => {
  it('should initial state is set correctly', () => {
    const { timer, scheduler } = createTimer({
      focusDuration: new Duration({ minutes: 10 })
    })
    scheduler.advanceTime(5000) // if the timer is not started, the time should not change

    expect(timer.getState()).toEqual({
      remaining: new Duration({ minutes: 10 }),
      isRunning: false,
      stage: PomodoroStage.FOCUS
    })
  })

  it('should round up to seconds of duration in the config', () => {
    // Since some timer publishing logic is assume that the smallest unit is second, duration in config is enforced in second precision to keep that correct

    const { timer } = createTimer({
      focusDuration: new Duration({ seconds: 10, milliseconds: 1 }),
      shortBreakDuration: new Duration({ seconds: 3, milliseconds: 1 }),
      longBreakDuration: new Duration({ seconds: 2, milliseconds: 1 }),
      numOfFocusPerCycle: 5
    })

    expect(timer.getConfig()).toEqual({
      focusDuration: new Duration({ seconds: 11 }),
      shortBreakDuration: new Duration({ seconds: 4 }),
      longBreakDuration: new Duration({ seconds: 3 }),
      numOfFocusPerCycle: 5
    })
  })

  it('should able to start focus', () => {
    const { timer, scheduler } = createTimer({
      focusDuration: new Duration({ minutes: 10 })
    })
    timer.start()
    scheduler.advanceTime(5001)

    expect(timer.getState()).toEqual({
      remaining: new Duration({ minutes: 9, seconds: 55 }),
      isRunning: true,
      stage: PomodoroStage.FOCUS
    })
  })

  it("should extra call of start won't affect the timer", () => {
    const { timer, scheduler } = createTimer({
      focusDuration: new Duration({ minutes: 10 })
    })

    timer.start()
    scheduler.advanceTime(5950)
    timer.start()
    scheduler.advanceTime(5050)

    expect(timer.getState().remaining).toEqual(new Duration({ minutes: 9, seconds: 49 }))
  })

  it('should able to pause', () => {
    const { timer, scheduler } = createTimer({
      focusDuration: new Duration({ minutes: 10 })
    })
    timer.start()
    scheduler.advanceTime(5000)
    timer.pause()
    scheduler.advanceTime(5000)

    expect(timer.getState()).toEqual({
      remaining: new Duration({ minutes: 9, seconds: 55 }),
      isRunning: false,
      stage: PomodoroStage.FOCUS
    })
  })

  it('should pause and start remain accuracy to 100ms', () => {
    const { timer, scheduler } = createTimer({
      focusDuration: new Duration({ minutes: 10 })
    })
    timer.start()
    scheduler.advanceTime(5200)
    timer.pause()
    timer.start()
    scheduler.advanceTime(5800)

    expect(timer.getState().remaining).toEqual(new Duration({ minutes: 9, seconds: 49 }))
  })

  it('should able to subscribe updates', () => {
    const { timer, scheduler } = createTimer({
      focusDuration: new Duration({ seconds: 3 }),
      shortBreakDuration: new Duration({ seconds: 5 }),
      numOfFocusPerCycle: 4
    })
    const updates: PomodoroTimerUpdate[] = []
    timer.subscribeTimerUpdate((update) => {
      updates.push(update)
    })

    timer.start()
    scheduler.advanceTime(2000)

    expect(updates).toEqual([
      {
        remainingSeconds: new Duration({ seconds: 3 }).remainingSeconds(),
        isRunning: false,
        stage: PomodoroStage.FOCUS
      },
      {
        remainingSeconds: new Duration({ seconds: 3 }).remainingSeconds(),
        isRunning: true,
        stage: PomodoroStage.FOCUS
      },
      {
        remainingSeconds: new Duration({ seconds: 2 }).remainingSeconds(),
        isRunning: true,
        stage: PomodoroStage.FOCUS
      },
      {
        remainingSeconds: new Duration({ seconds: 1 }).remainingSeconds(),
        isRunning: true,
        stage: PomodoroStage.FOCUS
      }
    ])

    scheduler.advanceTime(2000)

    expect(updates.length).toBe(5)
    expect(updates[4]).toEqual({
      remainingSeconds: new Duration({ seconds: 5 }).remainingSeconds(),
      isRunning: false,
      stage: PomodoroStage.SHORT_BREAK
    })
  })

  it('should after pause and restart again, subscription can receive updates properly', () => {
    const { timer, scheduler } = createTimer({
      focusDuration: new Duration({ minutes: 10 })
    })
    const updates: PomodoroTimerUpdate[] = []
    timer.subscribeTimerUpdate((update) => {
      updates.push(update)
    })

    timer.start()
    scheduler.advanceTime(1400)

    timer.pause()

    const lastUpdatesLength = updates.length

    timer.start()
    scheduler.advanceTime(600)

    expect(updates[lastUpdatesLength].remainingSeconds).toBe(
      new Duration({ minutes: 9, seconds: 59 }).remainingSeconds() // Whenever timer is started, it will publish the current state
    )
    expect(updates[lastUpdatesLength + 1].remainingSeconds).toBe(
      new Duration({ minutes: 9, seconds: 58 }).remainingSeconds() // After 600ms since restart, the remaining time should be 9:58 and it should be published
    )
  })

  it('should receive immediate update whenever subscribe', () => {
    const { timer, scheduler } = createTimer({
      focusDuration: new Duration({ minutes: 10 })
    })
    const updates: PomodoroTimerUpdate[] = []
    timer.start()
    scheduler.advanceTime(1005)

    timer.subscribeTimerUpdate((update) => {
      updates.push(update)
    })

    // although the update will be published every 1000ms, should receive immediate response when subscribe
    expect(updates.length).toBe(1)
    expect(updates[0]).toEqual({
      remainingSeconds: new Duration({ minutes: 9, seconds: 59 }).remainingSeconds(),
      isRunning: true,
      stage: PomodoroStage.FOCUS
    })
  })

  it('should able to unsubscribe updates', () => {
    const { timer, scheduler } = createTimer({
      focusDuration: new Duration({ minutes: 10 })
    })
    const updates1: PomodoroTimerUpdate[] = []
    const updates2: PomodoroTimerUpdate[] = []
    timer.subscribeTimerUpdate((update) => {
      updates1.push(update)
    })
    const subscriptionId2 = timer.subscribeTimerUpdate((update) => {
      updates2.push(update)
    })

    timer.unsubscribeTimerUpdate(subscriptionId2)

    timer.start()
    scheduler.advanceTime(250)

    expect(updates2.length).toBeLessThan(updates1.length)
  })

  it('should getSubscriptionCount is reflecting number of subscription', () => {
    const { timer } = createTimer({})
    expect(timer.getSubscriptionCount()).toBe(0)

    const subscriptionId = timer.subscribeTimerUpdate(() => {})
    timer.subscribeTimerUpdate(() => {})

    expect(timer.getSubscriptionCount()).toBe(2)

    timer.unsubscribeTimerUpdate(subscriptionId)

    expect(timer.getSubscriptionCount()).toBe(1)
  })

  it('should able to trigger callback when stage transit', async () => {
    const { timer, scheduler } = createTimer({
      focusDuration: new Duration({ minutes: 1 }),
      shortBreakDuration: new Duration({ seconds: 30 })
    })
    let triggeredCount = 0
    timer.setOnStageComplete(() => {
      triggeredCount++
    })

    timer.start()
    scheduler.advanceTime(60000)
    await flushPromises()

    expect(triggeredCount).toBe(1)

    timer.start()
    scheduler.advanceTime(30000)
    await flushPromises()

    expect(triggeredCount).toBe(2)
  })

  it('should switch to break after focus duration is passed', () => {
    const { timer, scheduler } = createTimer({
      focusDuration: new Duration({ minutes: 1 }),
      shortBreakDuration: new Duration({ seconds: 30 })
    })
    timer.start()
    scheduler.advanceTime(61000)

    expect(timer.getState()).toEqual({
      remaining: new Duration({ seconds: 30 }),
      isRunning: false,
      stage: PomodoroStage.SHORT_BREAK
    })
  })

  it('should switch back to focus after break duration is passed', () => {
    const { timer, scheduler } = createTimer({
      focusDuration: new Duration({ minutes: 1 }),
      shortBreakDuration: new Duration({ seconds: 30 })
    })
    timer.start()
    scheduler.advanceTime(61000)
    timer.start()
    scheduler.advanceTime(31000)

    expect(timer.getState()).toEqual({
      remaining: new Duration({ minutes: 1 }),
      isRunning: false,
      stage: PomodoroStage.FOCUS
    })
  })

  it('should start long break after number of focus per cycle is passed', () => {
    const { timer, scheduler } = createTimer({
      focusDuration: new Duration({ minutes: 1 }),
      shortBreakDuration: new Duration({ seconds: 15 }),
      longBreakDuration: new Duration({ seconds: 30 }),
      numOfFocusPerCycle: 2
    })

    // 1st Focus
    timer.start()
    scheduler.advanceTime(60000)

    // Short Break
    timer.start()
    scheduler.advanceTime(15000)

    // 2nd Focus
    timer.start()
    scheduler.advanceTime(60000)

    // Long Break
    expect(timer.getState()).toEqual({
      remaining: new Duration({ seconds: 30 }),
      isRunning: false,
      stage: PomodoroStage.LONG_BREAK
    })
    timer.start()
    scheduler.advanceTime(30000)
  })

  it('should reset the cycle after long break', () => {
    const { timer, scheduler } = createTimer({
      focusDuration: new Duration({ minutes: 1 }),
      shortBreakDuration: new Duration({ seconds: 15 }),
      longBreakDuration: new Duration({ seconds: 30 }),
      numOfFocusPerCycle: 2
    })

    // 1st Focus
    timer.start()
    scheduler.advanceTime(60000)

    // Short Break
    timer.start()
    scheduler.advanceTime(15000)

    // 2nd Focus
    timer.start()
    scheduler.advanceTime(60000)

    // Long Break
    timer.start()
    scheduler.advanceTime(30000)

    // After Long Break, it should reset to Focus
    expect(timer.getState()).toEqual({
      remaining: new Duration({ minutes: 1 }),
      isRunning: false,
      stage: PomodoroStage.FOCUS
    })

    timer.start()
    scheduler.advanceTime(60000)

    // Short Break
    timer.start()
    scheduler.advanceTime(15000)

    // 3rd Focus
    timer.start()
    scheduler.advanceTime(60000)

    // Long Break again
    expect(timer.getState()).toEqual({
      remaining: new Duration({ seconds: 30 }),
      isRunning: false,
      stage: PomodoroStage.LONG_BREAK
    })
  })
})

function createTimer({
  focusDuration = new Duration({ minutes: 25 }),
  shortBreakDuration = new Duration({ minutes: 5 }),
  longBreakDuration = new Duration({ minutes: 15 }),
  numOfFocusPerCycle = 4
} = {}) {
  const scheduler = new FakePeriodicTaskScheduler()
  const timer = PomodoroTimer.createFake({
    focusDuration,
    shortBreakDuration,
    longBreakDuration,
    numOfFocusPerCycle,
    scheduler
  })
  return {
    scheduler,
    timer
  }
}
