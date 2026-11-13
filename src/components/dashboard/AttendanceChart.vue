<script setup>
import { computed } from 'vue'
import { Doughnut } from 'vue-chartjs'
import { ArcElement, Chart as ChartJS, Legend, Tooltip } from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend)

const props = defineProps({
  summary: {
    type: Object,
    default: () => ({ present: 0, late: 0, absent: 0, excused: 0 }),
  },
})

const total = computed(
  () => props.summary.present + props.summary.late + props.summary.absent + props.summary.excused,
)

function toPercent(value) {
  return total.value ? Math.round((value / total.value) * 100) : 0
}

const presentRate = computed(() => toPercent(props.summary.present))

const legendItems = computed(() => [
  {
    label: 'Present',
    count: props.summary.present,
    percent: toPercent(props.summary.present),
    color: '#128a6b',
  },
  {
    label: 'Late',
    count: props.summary.late,
    percent: toPercent(props.summary.late),
    color: '#d19a2c',
  },
  {
    label: 'Absent',
    count: props.summary.absent,
    percent: toPercent(props.summary.absent),
    color: '#c0394b',
  },
  {
    label: 'Excused',
    count: props.summary.excused,
    percent: toPercent(props.summary.excused),
    color: '#3d8fd1',
  },
])

const chartData = computed(() => ({
  labels: legendItems.value.map((item) => item.label),
  datasets: [
    {
      data: legendItems.value.map((item) => item.count),
      backgroundColor: legendItems.value.map((item) => item.color),
      borderColor: '#ffffff',
      borderWidth: 3,
      hoverOffset: 4,
    },
  ],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '74%',
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      backgroundColor: '#0d1730',
      titleFont: { family: 'Inter', size: 11, weight: '600' },
      bodyFont: { family: 'Inter', size: 11 },
      padding: 10,
      cornerRadius: 8,
      callbacks: {
        label: (context) => {
          const item = legendItems.value[context.dataIndex]
          return ` ${item.label}: ${item.count} (${item.percent}%)`
        },
      },
    },
  },
}
</script>

<template>
  <div>
    <div class="chart-wrap is-compact">
      <Doughnut :data="chartData" :options="chartOptions" />
      <div class="attendance-center">
        <strong>{{ presentRate }}%</strong>
        <span>Present rate</span>
      </div>
    </div>
    <div class="attendance-legend">
      <div v-for="item in legendItems" :key="item.label" class="attendance-legend-item">
        <span class="chart-legend-dot" :style="{ background: item.color }"></span>
        <div>
          <strong>{{ item.percent }}%</strong>
          <span>{{ item.label }} · {{ item.count }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
