<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '../components/common/PageHeader.vue'
import StatCard from '../components/common/StatCard.vue'
import SearchField from '../components/common/SearchField.vue'
import FilterSelect from '../components/common/FilterSelect.vue'
import EmptyState from '../components/common/EmptyState.vue'
import PaginationBar from '../components/common/PaginationBar.vue'
import { useNotificationsStore } from '../stores/notifications'
import { useToast } from '../composables/useToast'
import {
  filterNotifications,
  formatNotificationTime,
  sortNotifications,
} from '../utils/notifications'

const store = useNotificationsStore()
const router = useRouter()
const { push: toast } = useToast()

const searchTerm = ref('')
const readFilter = ref('all')
const page = ref(1)
const pageSize = ref(10)

const readFilterOptions = [
  { value: 'all', label: 'All notifications' },
  { value: 'unread', label: 'Unread' },
  { value: 'read', label: 'Read' },
]

const filteredNotifications = computed(() =>
  sortNotifications(
    filterNotifications(store.notifications, {
      search: searchTerm.value,
      read: readFilter.value,
    }),
  ),
)

const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredNotifications.value.length / pageSize.value)),
)

const pagedNotifications = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredNotifications.value.slice(start, start + pageSize.value)
})

const hasFilters = computed(() => searchTerm.value.trim() !== '' || readFilter.value !== 'all')

const directorySubtitle = computed(() => {
  if (!store.totalCount) return 'No notifications yet'
  if (hasFilters.value) {
    return `${filteredNotifications.value.length} of ${store.totalCount} notifications match your filters`
  }
  return `${store.totalCount} notifications in this browser`
})

const summaryCards = computed(() => [
  {
    label: 'Total notifications',
    value: store.totalCount.toLocaleString('en-US'),
    icon: 'bi-bell',
    tone: 'indigo',
    note: 'Stored in this browser',
  },
  {
    label: 'Unread',
    value: store.unreadCount.toLocaleString('en-US'),
    icon: 'bi-envelope',
    tone: 'amber',
    note: store.unreadCount === 1 ? 'Needs your attention' : 'Need your attention',
  },
  {
    label: 'Read',
    value: store.readCount.toLocaleString('en-US'),
    icon: 'bi-envelope-open',
    tone: 'green',
    note: 'Already reviewed',
  },
])

const storageAlerts = computed(() => {
  const alerts = []

  if (store.storageState === 'unavailable' || store.persistenceState === 'unavailable') {
    alerts.push({
      variant: 'danger',
      icon: 'bi-hdd-stack',
      text: 'Browser storage is unavailable. Notification changes will last for this session only.',
      retry: false,
    })
  } else if (store.persistenceState === 'failed') {
    alerts.push({
      variant: 'danger',
      icon: 'bi-exclamation-triangle',
      text: 'Browser storage is not accepting notification saves. Recent changes will be lost when you refresh.',
      retry: true,
    })
  }

  const recovery = store.recovery
  if (recovery) {
    if (recovery.kind === 'invalid-json' || recovery.kind === 'invalid-format') {
      alerts.push({
        variant: 'warning',
        icon: 'bi-shield-exclamation',
        text: 'Saved notification data could not be read, so notifications were reset to safe defaults.',
        retry: false,
      })
    } else {
      const changes = []
      if (recovery.discarded > 0) {
        changes.push(
          `${recovery.discarded} invalid ${recovery.discarded === 1 ? 'record was' : 'records were'} removed`,
        )
      }
      if (recovery.corrected > 0) {
        changes.push(
          `${recovery.corrected} ${recovery.corrected === 1 ? 'record was' : 'records were'} repaired`,
        )
      }
      if (changes.length) {
        alerts.push({
          variant: 'warning',
          icon: 'bi-shield-exclamation',
          text: `Some saved notifications needed attention: ${changes.join('; ')}.`,
          retry: false,
        })
      }
    }
  }

  return alerts
})

watch([searchTerm, readFilter], () => {
  page.value = 1
})

watch(totalPages, (value) => {
  if (page.value > value) page.value = value
})

function resetFilters() {
  searchTerm.value = ''
  readFilter.value = 'all'
  page.value = 1
}

function handleRetryPersist() {
  const result = store.retryPersist()
  if (result.ok) {
    toast({
      variant: 'success',
      title: 'Notification changes saved',
      message: 'Notification changes are now saved in browser storage.',
    })
  } else {
    toast({
      variant: 'danger',
      title: 'Could not save notification changes',
      message: result.error || 'Browser storage is still unavailable.',
    })
  }
}

function handleMarkAllRead() {
  const result = store.markAllRead()
  if (!result.ok) {
    toast({
      variant: 'danger',
      title: 'Could not update notifications',
      message: result.errors?.form || 'Notifications could not be updated.',
    })
    return
  }

  if (result.changed === 0) return

  toast({
    variant: result.persisted ? 'success' : 'warning',
    title: result.persisted ? 'Notifications updated' : 'Notifications updated for this session',
    message: result.persisted
      ? 'All notifications were marked as read.'
      : 'Browser storage could not save this change. It will be lost when you refresh.',
  })
}

function handleToggleRead(notification) {
  const result = notification.read ? store.markUnread(notification.uid) : store.markRead(notification.uid)
  if (!result.ok) {
    toast({
      variant: 'danger',
      title: 'Could not update notification',
      message: result.errors?.form || 'The notification could not be updated.',
    })
    return
  }

  if (result.persisted === false) {
    toast({
      variant: 'warning',
      title: 'Notification updated for this session',
      message: 'Browser storage could not save this change. It will be lost when you refresh.',
    })
  }
}

async function handleOpenNotification(notification) {
  const result = store.markRead(notification.uid)
  if (!result.ok) {
    toast({
      variant: 'danger',
      title: 'Could not open notification',
      message: result.errors?.form || 'The notification could not be updated.',
    })
    return
  }

  if (result.persisted === false) {
    toast({
      variant: 'warning',
      title: 'Notification updated for this session',
      message: 'Browser storage could not save this change. It will be lost when you refresh.',
    })
  }

  if (notification.route) {
    await router.push(notification.route)
  }
}

onMounted(() => {
  store.loadNotifications()
})
</script>

<template>
  <div>
    <PageHeader
      title="Notifications"
      description="Review campus announcements and administrative alerts. Notification state is stored in this browser only."
      eyebrow="Insights"
      eyebrow-icon="bi-bell"
    >
      <template #actions>
        <span class="demo-flag">
          <i class="bi bi-hdd" aria-hidden="true"></i>
          Browser storage
        </span>
        <button
          type="button"
          class="btn-ch btn-ch-soft"
          :disabled="store.unreadCount === 0"
          @click="handleMarkAllRead"
        >
          <i class="bi bi-check2-all" aria-hidden="true"></i>
          Mark all read
        </button>
      </template>
    </PageHeader>

    <div v-if="store.loadState === 'loading'" class="ch-alert is-info" role="status">
      <i class="bi bi-arrow-repeat" aria-hidden="true"></i>
      <span>Loading notifications from browser storage…</span>
    </div>

    <div v-if="store.loadState === 'error'" class="ch-alert is-warning" role="alert">
      <i class="bi bi-exclamation-triangle" aria-hidden="true"></i>
      <span>{{ store.loadError }}</span>
      <button type="button" class="btn-ch btn-ch-soft btn-ch-sm api-retry" @click="store.loadNotifications()">
        <i class="bi bi-arrow-clockwise" aria-hidden="true"></i>
        Retry
      </button>
    </div>

    <div
      v-for="alert in storageAlerts"
      :key="alert.text"
      class="ch-alert"
      :class="`is-${alert.variant}`"
      role="alert"
    >
      <i class="bi" :class="alert.icon" aria-hidden="true"></i>
      <span>{{ alert.text }}</span>
      <button
        v-if="alert.retry"
        type="button"
        class="btn-ch btn-ch-soft btn-ch-sm api-retry"
        @click="handleRetryPersist"
      >
        <i class="bi bi-arrow-clockwise" aria-hidden="true"></i>
        Retry save
      </button>
    </div>

    <section class="row g-3 g-xl-4 mb-1" aria-label="Notification summary statistics">
      <div v-for="card in summaryCards" :key="card.label" class="col-sm-6 col-xl-4">
        <StatCard v-bind="card" />
      </div>
    </section>

    <section class="ch-card mt-3 mt-xl-4">
      <div class="ch-card-header has-border">
        <div>
          <h2 class="ch-card-title">Notification inbox</h2>
          <p class="ch-card-subtitle">{{ directorySubtitle }}</p>
        </div>
        <button
          v-if="hasFilters"
          type="button"
          class="btn-ch btn-ch-ghost btn-ch-sm"
          @click="resetFilters"
        >
          <i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i>
          Reset filters
        </button>
      </div>

      <div class="data-toolbar notifications-toolbar">
        <SearchField
          v-model="searchTerm"
          class="toolbar-search"
          label="Search notifications"
          placeholder="Search by title, message, category, or route…"
        />
        <FilterSelect v-model="readFilter" label="Status" :options="readFilterOptions" />
      </div>

      <div v-if="pagedNotifications.length" class="ch-card-body is-flush">
        <ul class="notification-inbox-list" aria-label="Notifications">
          <li v-for="notification in pagedNotifications" :key="notification.uid">
            <article class="notification-inbox-item" :class="{ 'is-unread': !notification.read }">
              <span class="notification-icon" :class="notification.tone ? `tone-${notification.tone}` : ''" aria-hidden="true">
                <i class="bi" :class="notification.icon"></i>
              </span>
              <div class="notification-inbox-body">
                <div class="notification-inbox-head">
                  <div>
                    <p class="notification-inbox-title">{{ notification.title }}</p>
                    <p class="notification-inbox-message">{{ notification.body }}</p>
                  </div>
                  <span class="notification-state-badge" :class="notification.read ? 'is-read' : 'is-unread'">
                    {{ notification.read ? 'Read' : 'Unread' }}
                  </span>
                </div>
                <div class="notification-inbox-meta">
                  <span v-if="notification.category">
                    <i class="bi bi-tag" aria-hidden="true"></i>
                    {{ notification.category }}
                  </span>
                  <span>
                    <i class="bi bi-clock" aria-hidden="true"></i>
                    {{ formatNotificationTime(notification.createdAt) }}
                  </span>
                  <span v-if="notification.route">
                    <i class="bi bi-arrow-up-right-square" aria-hidden="true"></i>
                    {{ notification.route }}
                  </span>
                </div>
                <div class="notification-inbox-actions">
                  <button
                    type="button"
                    class="btn-ch btn-ch-soft btn-ch-sm"
                    @click="handleToggleRead(notification)"
                  >
                    <i class="bi" :class="notification.read ? 'bi-envelope' : 'bi-envelope-open'" aria-hidden="true"></i>
                    {{ notification.read ? 'Mark unread' : 'Mark read' }}
                  </button>
                  <button
                    v-if="notification.route"
                    type="button"
                    class="btn-ch btn-ch-ghost btn-ch-sm"
                    @click="handleOpenNotification(notification)"
                  >
                    <i class="bi bi-box-arrow-up-right" aria-hidden="true"></i>
                    Open related page
                  </button>
                </div>
              </div>
            </article>
          </li>
        </ul>

        <PaginationBar
          :page="page"
          :page-size="pageSize"
          :total="filteredNotifications.length"
          item-label="notifications"
          @update:page="page = $event"
          @update:page-size="pageSize = $event"
        />
      </div>

      <div v-else class="ch-card-body">
        <EmptyState
          v-if="store.loadState === 'error'"
          icon="bi-exclamation-triangle"
          title="Notifications unavailable"
          message="Browser storage could not be read. Try loading notifications again."
        >
          <button type="button" class="btn-ch btn-ch-primary" @click="store.loadNotifications()">
            <i class="bi bi-arrow-clockwise" aria-hidden="true"></i>
            Retry
          </button>
        </EmptyState>

        <EmptyState
          v-else-if="store.totalCount === 0"
          icon="bi-bell-slash"
          title="No notifications yet"
          message="New campus alerts and administrative updates will appear here when they are available."
        />

        <EmptyState
          v-else
          icon="bi-search"
          title="No notifications match your filters"
          message="Try another search term or change the read status filter."
        >
          <button type="button" class="btn-ch btn-ch-soft" @click="resetFilters">
            <i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i>
            Clear filters
          </button>
        </EmptyState>

        <PaginationBar
          v-if="filteredNotifications.length > 0"
          :page="page"
          :page-size="pageSize"
          :total="filteredNotifications.length"
          item-label="notifications"
          @update:page="page = $event"
          @update:page-size="pageSize = $event"
        />
      </div>
    </section>
  </div>
</template>
