import { describe, expect, it } from 'vitest'
import {
  WeeklyScheduleStorageServiceImpl,
  type WeeklyScheduleStorageService
} from '../../domain/schedules/storage'
import { flushPromises, mount, VueWrapper } from '@vue/test-utils'

import WeeklySchedulesEditor from '../WeeklySchedulesEditor.vue'
import { Weekday, WeeklySchedule } from '../../domain/schedules'
import { Time } from '../../domain/schedules/time'

describe('WeeklySchedulesEditor', () => {
  it('should render weekly schedules', async () => {
    const weeklyScheduleStorageService = WeeklyScheduleStorageServiceImpl.createFake()
    weeklyScheduleStorageService.saveAll([
      new WeeklySchedule({
        weekdaySet: new Set([Weekday.Mon, Weekday.Tue]),
        startTime: new Time(7, 0),
        endTime: new Time(9, 1)
      }),
      new WeeklySchedule({
        weekdaySet: new Set([Weekday.Wed]),
        startTime: new Time(6, 2),
        endTime: new Time(8, 4)
      })
    ])

    const { wrapper } = mountWeeklySchedulesEditor({
      weeklyScheduleStorageService
    })
    await flushPromises()

    const weeklySchedules = wrapper.findAll("[data-test='weekly-schedule']")
    expect(weeklySchedules).toHaveLength(2)

    expect(weeklySchedules[0].text()).toContain('Mon')
    expect(weeklySchedules[0].text()).toContain('Tue')
    expect(weeklySchedules[0].text()).toContain('07:00')
    expect(weeklySchedules[0].text()).toContain('09:01')

    expect(weeklySchedules[1].text()).toContain('Wed')
    expect(weeklySchedules[1].text()).toContain('06:02')
    expect(weeklySchedules[1].text()).toContain('08:04')
  })

  it('should able to add new weekly schedule', async () => {
    const { wrapper, weeklyScheduleStorageService } = mountWeeklySchedulesEditor()
    const weeklySchedule = new WeeklySchedule({
      weekdaySet: new Set([Weekday.Thu, Weekday.Fri]),
      startTime: new Time(10, 0),
      endTime: new Time(12, 0)
    })
    await addWeeklySchedule(wrapper, weeklySchedule)

    const weeklySchedules = wrapper.findAll("[data-test='weekly-schedule']")
    expect(weeklySchedules).toHaveLength(1)

    expect(weeklySchedules[0].text()).toContain('Thu')
    expect(weeklySchedules[0].text()).toContain('Fri')
    expect(weeklySchedules[0].text()).toContain('10:00')
    expect(weeklySchedules[0].text()).toContain('12:00')

    expect(await weeklyScheduleStorageService.getAll()).toEqual([weeklySchedule])
  })

  it('should prevent add weekly schedule when weekdaySet is not selected', async () => {
    const { wrapper, weeklyScheduleStorageService } = mountWeeklySchedulesEditor()
    await addWeeklySchedule(wrapper, {
      weekdaySet: new Set(),
      startTime: { hour: 10, minute: 0 },
      endTime: { hour: 12, minute: 0 }
    })

    expect(wrapper.findAll("[data-test='weekly-schedule']")).toHaveLength(0)
    expect(await weeklyScheduleStorageService.getAll()).toEqual([])
  })

  it('should able to uncheck weekday', async () => {
    const { wrapper, weeklyScheduleStorageService } = mountWeeklySchedulesEditor()
    const sundayCheckbox = wrapper.find(`[data-test='check-weekday-${Weekday.Sun}']`)
    await sundayCheckbox.setValue(true)
    await sundayCheckbox.setValue(false)

    const weeklySchedule = new WeeklySchedule({
      weekdaySet: new Set([Weekday.Mon]),
      startTime: new Time(10, 0),
      endTime: new Time(12, 0)
    })
    await addWeeklySchedule(wrapper, weeklySchedule)

    expect(await weeklyScheduleStorageService.getAll()).toEqual([weeklySchedule])
  })

  it('should display error message if start time is not before end time', async () => {
    const { wrapper, weeklyScheduleStorageService } = mountWeeklySchedulesEditor()

    await addWeeklySchedule(wrapper, {
      weekdaySet: new Set([Weekday.Mon]),
      startTime: new Time(10, 0),
      endTime: new Time(9, 0)
    })

    expect(await weeklyScheduleStorageService.getAll()).toEqual([])
    expect(wrapper.find("[data-test='error-message']").text()).toContain(
      'Start time must be before end time'
    )
  })
})

function mountWeeklySchedulesEditor({
  weeklyScheduleStorageService = WeeklyScheduleStorageServiceImpl.createFake()
}: {
  weeklyScheduleStorageService?: WeeklyScheduleStorageService
} = {}) {
  const wrapper = mount(WeeklySchedulesEditor, {
    props: { weeklyScheduleStorageService }
  })
  return {
    wrapper,
    weeklyScheduleStorageService
  }
}

async function addWeeklySchedule(
  wrapper: VueWrapper,
  weeklyScheduleInput: {
    weekdaySet: ReadonlySet<Weekday>
    startTime: { hour: number; minute: number }
    endTime: { hour: number; minute: number }
  }
) {
  for (const weekday of weeklyScheduleInput.weekdaySet) {
    const weekdayCheckbox = wrapper.find(`[data-test='check-weekday-${weekday}']`)
    await weekdayCheckbox.setValue(true)
  }

  const startTimeHourInput = wrapper.find("[data-test='start-time-hour-input']")
  await startTimeHourInput.setValue(weeklyScheduleInput.startTime.hour)

  const startTimeMinuteInput = wrapper.find("[data-test='start-time-minute-input']")
  await startTimeMinuteInput.setValue(weeklyScheduleInput.startTime.minute)

  const endTimeHourInput = wrapper.find("[data-test='end-time-hour-input']")
  await endTimeHourInput.setValue(weeklyScheduleInput.endTime.hour)

  const endTimeMinuteInput = wrapper.find("[data-test='end-time-minute-input']")
  await endTimeMinuteInput.setValue(weeklyScheduleInput.endTime.minute)

  const addButton = wrapper.find("[data-test='add-button']")
  await addButton.trigger('click')
  await flushPromises()
}
