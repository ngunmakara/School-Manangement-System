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
import { departmentDistribution } from '../../data/demoData'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const chartData = computed(() => ({
  labels: departmentDistribution.map((item) => item.name),
  datasets: [
    {
      label: 'Students',
      data: departmentDistribution.map((item) => item.count),
      backgroundColor: departmentDistribution.map((item) => item.color),
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
