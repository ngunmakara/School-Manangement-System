<script setup>
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
})

const PALETTE = [
  '#4f5bd5',
  '#128a6b',
  '#d19a2c',
  '#3d8fd1',
  '#b45a8f',
  '#7b8499',
  '#c0394b',
  '#6c5ce7',
]

const chartData = computed(() => ({
  labels: props.items.map((item) => item.department),
  datasets: [
    {
      label: 'Students',
      data: props.items.map((item) => item.count),
      backgroundColor: props.items.map((_, index) => PALETTE[index % PALETTE.length]),
      borderRadius: 6,
      borderSkipped: false,
      barThickness: 14,
    },
  ],
}))

const chartOptions = {
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
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
        label: (context) => ` ${context.parsed.x} students`,
      },
    },
  },
  scales: {
    x: {
      beginAtZero: true,
      grid: {
        color: '#eef0f6',
        drawTicks: false,
      },
      border: {
        display: false,
      },
      ticks: {
        color: '#7b8499',
        font: { family: 'Inter', size: 10.5 },
      },
    },
    y: {
      grid: {
        display: false,
      },
      border: {
        display: false,
      },
      ticks: {
        color: '#4a5568',
        font: { family: 'Inter', size: 11, weight: '500' },
        padding: 6,
      },
    },
  },
}
</script>

<template>
  <div class="chart-wrap">
    <Bar :data="chartData" :options="chartOptions" />
  </div>
</template>
