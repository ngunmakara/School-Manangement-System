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
  labels: {
    type: Array,
    default: () => [],
  },
  values: {
    type: Array,
    default: () => [],
  },
  datasetLabel: {
    type: String,
    default: 'Count',
  },
})

const PALETTE = ['#4f5bd5', '#128a6b', '#d19a2c', '#3d8fd1', '#b45a8f', '#6c5ce7']

const chartData = computed(() => ({
  labels: props.labels,
  datasets: [
    {
      label: props.datasetLabel,
      data: props.values,
      backgroundColor: props.labels.map((_, index) => PALETTE[index % PALETTE.length]),
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
    legend: { display: false },
    tooltip: {
      backgroundColor: '#0d1730',
      titleFont: { family: 'Inter', size: 11, weight: '600' },
      bodyFont: { family: 'Inter', size: 11 },
      padding: 10,
      cornerRadius: 8,
      displayColors: false,
    },
  },
  scales: {
    x: {
      beginAtZero: true,
      ticks: { precision: 0, color: '#5c6780' },
      grid: { color: 'rgba(15, 23, 42, 0.06)' },
    },
    y: {
      ticks: { color: '#5c6780' },
      grid: { display: false },
    },
  },
}
</script>

<template>
  <div class="chart-wrap">
    <Bar :data="chartData" :options="chartOptions" />
  </div>
</template>
