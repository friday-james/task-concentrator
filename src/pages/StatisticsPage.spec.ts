import { describe, expect, it } from 'vitest'
import { DailyCutoffTimeStorageService } from '../domain/daily_cutoff_time/storage'
import { flushPromises, mount, VueWrapper } from '@vue/test-utils'
import StatisticsPage from './StatisticsPage.vue'
import { Time } from '../domain/time'
import { FakeActionService } from '../infra/action'
import { PomodoroRecordStorageService } from '../domain/pomodoro/record/storage'

describe('StatisticsPage', () => {
  it('should render saved daily cutoff time', async () => {
    const dailyCutoffTimeStorageService = DailyCutoffTimeStorageService.createFake()
    dailyCutoffTimeStorageService.save(new Time(10, 30))

    const { wrapper } = mountStatisticsPage({
      dailyCutoffTimeStorageService
    })
    await flushPromises()

    const timerInput = wrapper.find("[data-test='time-input']").element as HTMLInputElement
    expect(timerInput.value).toBe('10:30')
  })

  it('should render 00:00 if it has not been saved before', async () => {
    const { wrapper } = mountStatisticsPage({
      dailyCutoffTimeStorageService: DailyCutoffTimeStorageService.createFake() // No saved time before
    })
    await flushPromises()

    const timerInput = wrapper.find("[data-test='time-input']").element as HTMLInputElement
    expect(timerInput.value).toBe('00:00')
  })

  it('should able to save daily cutoff time', async () => {
    const { wrapper, dailyCutoffTimeStorageService } = mountStatisticsPage()

    await saveTime(wrapper, '09:05')

    expect(await dailyCutoffTimeStorageService.get()).toEqual(new Time(9, 5))
  })

  it('should reload page after clicked save', async () => {
    const { wrapper, reloadService } = mountStatisticsPage()

    expect(reloadService.getTriggerCount()).toBe(0)

    await saveTime(wrapper, '15:05')

    expect(reloadService.getTriggerCount()).toBe(1)
  })

  it('should render stats table with rows represent last 7 days', async () => {
    const { wrapper } = mountStatisticsPage()

    const rows = wrapper.find('tbody').findAll('tr')
    expect(rows).toHaveLength(7)

    expect(rows[0].find('[data-test="day-field"]').text()).toBe('Today')
    expect(rows[1].find('[data-test="day-field"]').text()).toBe('Yesterday')
    expect(rows[2].find('[data-test="day-field"]').text()).toBe('2 days ago')
    expect(rows[3].find('[data-test="day-field"]').text()).toBe('3 days ago')
    expect(rows[4].find('[data-test="day-field"]').text()).toBe('4 days ago')
    expect(rows[5].find('[data-test="day-field"]').text()).toBe('5 days ago')
    expect(rows[6].find('[data-test="day-field"]').text()).toBe('6 days ago')
  })

  it('should render stat of last 7 day', async () => {
    const dailyCutoffTimeStorageService = DailyCutoffTimeStorageService.createFake()
    dailyCutoffTimeStorageService.save(new Time(10, 30))

    const pomodoroRecordStorageService = PomodoroRecordStorageService.createFake()
    await pomodoroRecordStorageService.add({ completedAt: new Date(2025, 3, 4, 10, 29) })

    await pomodoroRecordStorageService.add({ completedAt: new Date(2025, 3, 4, 10, 30) })
    await pomodoroRecordStorageService.add({ completedAt: new Date(2025, 3, 4, 10, 31) })

    await pomodoroRecordStorageService.add({ completedAt: new Date(2025, 3, 6, 11, 0) })
    await pomodoroRecordStorageService.add({ completedAt: new Date(2025, 3, 7, 10, 29) })

    await pomodoroRecordStorageService.add({ completedAt: new Date(2025, 3, 11, 8, 24) })

    // When current time hasn't reached the daily cutoff time that day.
    const { wrapper } = mountStatisticsPage({
      dailyCutoffTimeStorageService,
      currentDate: new Date(2025, 3, 11, 9, 0),
      pomodoroRecordStorageService
    })
    await flushPromises()

    const rows = wrapper.find('tbody').findAll('tr')
    expect(rows[0].find('[data-test="completed-pomodori-field"]').text()).toBe('1') // 2025-04-10 10:30 - now
    expect(rows[1].find('[data-test="completed-pomodori-field"]').text()).toBe('0') // 2025-04-09 10:30 - 2025-04-10 10:29
    expect(rows[2].find('[data-test="completed-pomodori-field"]').text()).toBe('0') // 2025-04-08 10:30 - 2025-04-09 10:29
    expect(rows[3].find('[data-test="completed-pomodori-field"]').text()).toBe('0') // 2025-04-07 10:30 - 2025-04-08 10:29
    expect(rows[4].find('[data-test="completed-pomodori-field"]').text()).toBe('2') // 2025-04-06 10:30 - 2025-04-07 10:29
    expect(rows[5].find('[data-test="completed-pomodori-field"]').text()).toBe('0') // 2025-04-05 10:30 - 2025-04-06 10:29
    expect(rows[6].find('[data-test="completed-pomodori-field"]').text()).toBe('2') // 2025-04-04 10:30 - 2025-04-05 10:29

    // When current time has reached the daily cutoff time that day.
    const { wrapper: newWrapper } = mountStatisticsPage({
      dailyCutoffTimeStorageService,
      currentDate: new Date(2025, 3, 11, 10, 30),
      pomodoroRecordStorageService
    })
    await flushPromises()

    const newRows = newWrapper.find('tbody').findAll('tr')
    expect(newRows[0].find('[data-test="completed-pomodori-field"]').text()).toBe('0') // 2025-04-11 10:30 - now
    expect(newRows[1].find('[data-test="completed-pomodori-field"]').text()).toBe('1') // 2025-04-10 10:30 - 2025-04-11 10:29
    expect(newRows[2].find('[data-test="completed-pomodori-field"]').text()).toBe('0') // 2025-04-09 10:30 - 2025-04-10 10:29
    expect(newRows[3].find('[data-test="completed-pomodori-field"]').text()).toBe('0') // 2025-04-08 10:30 - 2025-04-09 10:29
    expect(newRows[4].find('[data-test="completed-pomodori-field"]').text()).toBe('0') // 2025-04-07 10:30 - 2025-04-08 10:29
    expect(newRows[5].find('[data-test="completed-pomodori-field"]').text()).toBe('2') // 2025-04-06 10:30 - 2025-04-07 10:29
    expect(newRows[6].find('[data-test="completed-pomodori-field"]').text()).toBe('0') // 2025-04-05 10:30 - 2025-04-06 10:29
  })
})

function mountStatisticsPage({
  dailyCutoffTimeStorageService = DailyCutoffTimeStorageService.createFake(),
  currentDate = new Date(),
  pomodoroRecordStorageService = PomodoroRecordStorageService.createFake()
} = {}) {
  const reloadService = new FakeActionService()
  const wrapper = mount(StatisticsPage, {
    props: {
      dailyCutoffTimeStorageService,
      reloadService,
      currentDate,
      pomodoroRecordStorageService
    }
  })
  return { wrapper, dailyCutoffTimeStorageService, reloadService }
}

async function saveTime(wrapper: VueWrapper, newTime: string) {
  const timerInput = wrapper.find("[data-test='time-input']")
  timerInput.setValue(newTime)

  const saveButton = wrapper.find("[data-test='save-button']")
  saveButton.trigger('click')
  await flushPromises()
}
