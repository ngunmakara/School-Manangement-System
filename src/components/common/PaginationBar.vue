<script setup>
import { computed } from 'vue'

const props = defineProps({
  page: {
    type: Number,
    default: 1,
  },
  pageSize: {
    type: Number,
    default: 10,
  },
  total: {
    type: Number,
    default: 0,
  },
  pageSizeOptions: {
    type: Array,
    default: () => [10, 25, 50],
  },
  itemLabel: {
    type: String,
    default: 'records',
  },
})

const emit = defineEmits(['update:page', 'update:pageSize'])

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))
const rangeStart = computed(() => (props.total === 0 ? 0 : (props.page - 1) * props.pageSize + 1))
const rangeEnd = computed(() => Math.min(props.page * props.pageSize, props.total))

const pageNumbers = computed(() => {
  const total = totalPages.value
  const current = props.page

  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1)
  }

  const pages = [1]
  const left = Math.max(2, current - 1)
  const right = Math.min(total - 1, current + 1)

  if (left > 2) pages.push('...')
  for (let page = left; page <= right; page += 1) pages.push(page)
  if (right < total - 1) pages.push('...')
  pages.push(total)

  return pages
})

function goToPage(page) {
  if (page < 1 || page > totalPages.value || page === props.page) return
  emit('update:page', page)
}

function changePageSize(event) {
  emit('update:pageSize', Number(event.target.value))
  emit('update:page', 1)
}
</script>

<template>
  <div class="ch-pagination">
    <p class="pagination-summary">
      Showing <strong>{{ rangeStart }}–{{ rangeEnd }}</strong> of
      <strong>{{ total }}</strong> {{ itemLabel }}
    </p>

    <div class="pagination-controls">
      <label class="page-size-control">
        <span>Rows per page</span>
        <select :value="pageSize" aria-label="Rows per page" @change="changePageSize">
          <option v-for="option in pageSizeOptions" :key="option" :value="option">
            {{ option }}
          </option>
        </select>
      </label>

      <nav class="pagination-pages" aria-label="Pagination">
        <button
          type="button"
          class="page-btn"
          :disabled="page <= 1"
          aria-label="Previous page"
          @click="goToPage(page - 1)"
        >
          <i class="bi bi-chevron-left" aria-hidden="true"></i>
        </button>

        <template v-for="(item, index) in pageNumbers" :key="`${item}-${index}`">
          <span v-if="item === '...'" class="pagination-ellipsis" aria-hidden="true">…</span>
          <button
            v-else
            type="button"
            class="page-btn"
            :class="{ 'is-active': item === page }"
            :aria-current="item === page ? 'page' : undefined"
            :aria-label="`Go to page ${item}`"
            @click="goToPage(item)"
          >
            {{ item }}
          </button>
        </template>

        <button
          type="button"
          class="page-btn"
          :disabled="page >= totalPages"
          aria-label="Next page"
          @click="goToPage(page + 1)"
        >
          <i class="bi bi-chevron-right" aria-hidden="true"></i>
        </button>
      </nav>
    </div>
  </div>
</template>
