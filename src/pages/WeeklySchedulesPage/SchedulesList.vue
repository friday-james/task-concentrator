<script setup lang="ts">
import { Time } from '../../domain/time'
import { Weekday, WeeklySchedule } from '../../domain/schedules'
import { capitalized } from '../../util'

const props = defineProps<{
  weeklySchedules: WeeklySchedule[]
}>()

const emit = defineEmits<{
  remove: [indexToRemove: number]
}>()

const formatTime = (time: Time) => {
  return time.toHhMmString()
}
</script>

<template>
  <ul class="list-group">
    <li
      v-for="(schedule, index) in props.weeklySchedules"
      :key="index"
      class="list-group-item d-flex justify-content-between align-items-center"
      data-test="weekly-schedule"
    >
      <div>
        {{
          Array.from(schedule.weekdaySet)
            .map((day) => capitalized(Weekday[day]))
            .join(', ')
        }}
        <br />
        {{ formatTime(schedule.startTime) }} - {{ formatTime(schedule.endTime) }}
      </div>
      <BButton
        class="bg-transparent text-danger border-0"
        :data-test="`remove-schedule-with-index-${index}`"
        @click="emit('remove', index)"
      >
        X
      </BButton>
    </li>
  </ul>
</template>
