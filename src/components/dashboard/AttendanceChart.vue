<script setup>
import { computed } from 'vue'
import { Doughnut } from 'vue-chartjs'
import { ArcElement, Chart as ChartJS, Legend, Tooltip } from 'chart.js'
import { attendanceOverview } from '../../data/demoData'

ChartJS.register(ArcElement, Tooltip, Legend)

const total = computed(
  () =>
    attendanceOverview.present +
    attendanceOverview.late +
    attendanceOverview.absent +
    attendanceOverview.excused,
)

const presentRate = computed(() => Math.round((attendanceOverview.present / total.value) * 100))

const legendItems = computed(() => [
  { label: 'Present', value: attendanceOverview.present, color: '#128a6b' },
  { label: 'Late', value: attendanceOverview.late, color: '#d19a2c' },
  { label: 'Absent', value: attendanceOverview.absent, color: '#c0394b' },
  { label: 'Excused', value: attendanceOverview.excused, color: '#3d8fd1' },
])

const chartData = computed(() => ({
  labels: legendItems.value.map((item) => item.label),
  datasets: [
    {
      data: legendItems.value.map((item) => item.value),
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
        label: (context) => ` ${context.label}: ${context.parsed}%`,
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
        <span>Present today</span>
      </div>
    </div>
    <div class="attendance-legend">
      <div v-for="item in legendItems" :key="item.label" class="attendance-legend-item">
        <span class="chart-legend-dot" :style="{ background: item.color }"></span>
        <div>
          <strong>{{ item.value }}%</strong>
          <span>{{ item.label }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
