import type { PomodoroTimerConfig } from './domain/pomodoro/config'
import { Duration } from './domain/pomodoro/duration'
import type { BadgeColor } from './infra/badge'

const getBlockedTemplateUrl = () => {
  return chrome.runtime.getURL('blocked.html')
}

const getReminderPageUrl = () => {
  return chrome.runtime.getURL('reminder.html')
}

const getPomodoroTimerConfig = (): PomodoroTimerConfig => {
  return {
    focusDuration: new Duration({ minutes: 25 }),
    shortBreakDuration: new Duration({ minutes: 5 }),
    longBreakDuration: new Duration({ minutes: 15 }),
    numOfPomodoriPerCycle: 4,
    pomodoroRecordHouseKeepDays: 30
  }
}

const getBadgeColorConfig = (): {
  focusBadgeColor: BadgeColor
  breakBadgeColor: BadgeColor
} => {
  return {
    focusBadgeColor: {
      textColor: '#ffffff',
      backgroundColor: '#ff0000'
    },
    breakBadgeColor: {
      textColor: '#ffffff',
      backgroundColor: '#6495ed'
    }
  }
}

export default {
  getPomodoroTimerConfig,
  getBlockedTemplateUrl,
  getBadgeColorConfig,
  getReminderPageUrl
}
