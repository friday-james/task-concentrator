import { ChromeCommunicationManager } from '../chrome/communication'
import { type WorkRequest, WorkRequestName } from './request'
import {
  FakeCommunicationManager,
  type CommunicationManager,
  type Port
} from '../infra/communication'
import { BrowsingControlTogglingService } from '../domain/browsing_control_toggling'
import { type PomodoroTimerResponse } from './response'
import { PomodoroTimer } from '../domain/pomodoro/timer'
import { FakeActionService, type ActionService } from '../infra/action'
import { ChromeNewTabReminderService } from '../chrome/new_tab'
import { FakeBadgeDisplayService, type BadgeColor, type BadgeDisplayService } from '../infra/badge'
import { ChromeBadgeDisplayService } from '../chrome/badge'
import { PomodoroStage } from '../domain/pomodoro/stage'
import config from '../config'
import { MultipleActionService } from '../infra/multiple_actions'
import { ChromeNotificationService } from '../chrome/notification'
import { TimerUpdateStorageService } from '../domain/pomodoro/storage'
import { Duration } from '../domain/pomodoro/duration'

export class BackgroundListener {
  private redirectTogglingService: BrowsingControlTogglingService
  private communicationManager: CommunicationManager
  private timer: PomodoroTimer
  private reminderService: ActionService
  private badgeDisplayService: BadgeDisplayService
  private timerUpdateStorageService: TimerUpdateStorageService

  static create() {
    const reminderService = new MultipleActionService([
      new ChromeNewTabReminderService(),
      new ChromeNotificationService()
    ])

    return new BackgroundListener({
      communicationManager: new ChromeCommunicationManager(),
      timer: PomodoroTimer.create(),
      redirectTogglingService: BrowsingControlTogglingService.create(),
      reminderService,
      badgeDisplayService: new ChromeBadgeDisplayService(),
      timerUpdateStorageService: TimerUpdateStorageService.create()
    })
  }

  static createFake({
    timer = PomodoroTimer.createFake(),
    communicationManager = new FakeCommunicationManager(),
    redirectTogglingService = BrowsingControlTogglingService.createFake(),
    reminderService = new FakeActionService(),
    badgeDisplayService = new FakeBadgeDisplayService(),
    timerUpdateStorageService = TimerUpdateStorageService.createFake()
  } = {}) {
    return new BackgroundListener({
      communicationManager,
      timer: timer,
      redirectTogglingService,
      reminderService,
      badgeDisplayService,
      timerUpdateStorageService
    })
  }

  private constructor({
    communicationManager,
    timer,
    redirectTogglingService,
    reminderService,
    badgeDisplayService,
    timerUpdateStorageService
  }: {
    communicationManager: CommunicationManager
    timer: PomodoroTimer
    redirectTogglingService: BrowsingControlTogglingService
    reminderService: ActionService
    badgeDisplayService: BadgeDisplayService
    timerUpdateStorageService: TimerUpdateStorageService
  }) {
    this.communicationManager = communicationManager
    this.redirectTogglingService = redirectTogglingService
    this.reminderService = reminderService
    this.badgeDisplayService = badgeDisplayService
    this.timerUpdateStorageService = timerUpdateStorageService

    this.timer = timer
  }

  async start() {
    return this.timerUpdateStorageService
      .get()
      .then((update) => {
        if (update) {
          this.timer.setState({
            remaining: new Duration({ seconds: update.remainingSeconds }),
            isRunning: update.isRunning,
            stage: update.stage,
            numOfPomodoriCompleted: update.numOfPomodoriCompleted
          })
        }
        this.timer.setOnStageComplete(() => {
          this.reminderService.trigger()
          this.badgeDisplayService.clearBadge()
        })
        this.timer.subscribeTimerUpdate((newStatus) => {
          this.timerUpdateStorageService.save(newStatus)

          if (newStatus.isRunning) {
            this.badgeDisplayService.displayBadge({
              text: roundUpToRemainingMinutes(newStatus.remainingSeconds).toString(),
              color: getBadgeColor(newStatus.stage)
            })
          }
        })
      })
      .then(() => {
        this.communicationManager.onNewClientConnect(
          (backgroundPort: Port<PomodoroTimerResponse, WorkRequest>) => {
            const listener = (message: WorkRequest) => {
              switch (message.name) {
                case WorkRequestName.START_TIMER: {
                  this.timer.start()
                  break
                }
                case WorkRequestName.TOGGLE_REDIRECT_RULES: {
                  this.redirectTogglingService.run()
                  break
                }
                case WorkRequestName.LISTEN_TO_TIMER: {
                  const subscriptionId = this.timer.subscribeTimerUpdate((update) => {
                    backgroundPort.send(update)
                  })
                  backgroundPort.onDisconnect(() => {
                    console.debug('Connection closed, unsubscribing timer update.')
                    this.timer.unsubscribeTimerUpdate(subscriptionId)
                  })
                  break
                }
                case WorkRequestName.PAUSE_TIMER: {
                  this.timer.pause()
                  this.badgeDisplayService.clearBadge()
                  break
                }
                case WorkRequestName.RESTART_FOCUS: {
                  this.timer.restartFocus(message.payload?.nth)
                  break
                }
                case WorkRequestName.RESTART_SHORT_BREAK: {
                  this.timer.restartShortBreak(message.payload?.nth)
                  break
                }
                case WorkRequestName.RESTART_LONG_BREAK: {
                  this.timer.restartLongBreak()
                  break
                }
              }
            }
            backgroundPort.onMessage(listener)
          }
        )
      })
  }
}

function roundUpToRemainingMinutes(remainingSeconds: number): number {
  return Math.ceil(remainingSeconds / 60)
}

function getBadgeColor(stage: PomodoroStage): BadgeColor {
  const colorConfig = config.getBadgeColorConfig()
  if (stage === PomodoroStage.FOCUS) {
    return colorConfig.focusBadgeColor
  } else {
    return colorConfig.breakBadgeColor
  }
}
