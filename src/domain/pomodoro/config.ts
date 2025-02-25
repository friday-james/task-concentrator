import type { Duration } from './duration'

export type PomodoroTimerConfig = {
  focusDuration: Duration
  shortBreakDuration: Duration
  longBreakDuration: Duration
  numOfFocusPerCycle: number
}
