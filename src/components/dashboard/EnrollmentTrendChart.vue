<script setup>
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

const props = defineProps({
  labels: {
    type: Array,
    default: () => [],
  },
  current: {
    type: Array,
    default: () => [],
  },
  previous: {
    type: Array,
    default: () => [],
  },
  currentLabel: {
    type: String,
    default: 'Current academic year',
  },
  previousLabel: {
    type: String,
    default: 'Previous academic year',
  },
})

const chartData = computed(() => ({
  labels: props.labels,
  datasets: [
    {
      label: props.currentLabel,
      data: props.current,
      borderColor: '#4f5bd5',
      backgroundColor: (context) => {
        const { ctx, chartArea } = context.chart
        if (!chartArea) return 'rgba(79, 91, 213, 0.12)'
        const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
        gradient.addColorStop(0, 'rgba(79, 91, 213, 0.22)')
        gradient.addColorStop(1, 'rgba(79, 91, 213, 0)')
        return gradient
      },
      fill: true,
      tension: 0.4,
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 4,
      pointBackgroundColor: '#4f5bd5',
      pointBorderColor: '#ffffff',
      pointBorderWidth: 2,
    },
    {
      label: props.previousLabel,
      data: props.previous,
      borderColor: '#bcc3d4',
      borderDash: [5, 5],
      fill: false,
      tension: 0.4,
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 4,
      pointBackgroundColor: '#bcc3d4',
      pointBorderColor: '#ffffff',
      pointBorderWidth: 2,
    },
  ],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index',
    intersect: false,
  },
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
      displayColors: true,
      boxWidth: 7,
      boxHeight: 7,
      boxPadding: 4,
      callbacks: {
        label: (context) =>
          ` ${context.dataset.label}: ${context.parsed.y.toLocaleString('en-US')} students`,
      },
    },
  },
  scales: {
    x: {
      grid: {
        display: false,
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
      beginAtZero: true,
      grid: {
        color: '#eef0f6',
        drawTicks: false,
      },
      border: {
        display: false,
        dash: [4, 4],
      },
      ticks: {
        color: '#7b8499',
        font: { family: 'Inter', size: 10.5 },
        padding: 8,
        precision: 0,
        callback: (value) => value.toLocaleString('en-US'),
      },
    },
  },
}
</script>

<template>
  <div>
    <div class="chart-wrap">
      <Line :data="chartData" :options="chartOptions" />
    </div>
    <div class="chart-legend">
      <span class="chart-legend-item">
        <span class="chart-legend-dot" style="background: #4f5bd5"></span>
        {{ currentLabel }}
      </span>
      <span class="chart-legend-item">
        <span class="chart-legend-dot" style="background: #bcc3d4"></span>
        {{ previousLabel }}
      </span>
      <span class="chart-legend-item ms-auto">
        <i class="bi bi-cloud-check" aria-hidden="true"></i>
        Live from enrollment records
      </span>
    </div>
  </div>
</template>
