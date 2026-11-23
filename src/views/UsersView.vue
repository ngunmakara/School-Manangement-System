<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '../components/common/PageHeader.vue'
import StatCard from '../components/common/StatCard.vue'
import SearchField from '../components/common/SearchField.vue'
import FilterSelect from '../components/common/FilterSelect.vue'
import EmptyState from '../components/common/EmptyState.vue'
import PaginationBar from '../components/common/PaginationBar.vue'
import ConfirmDialog from '../components/common/ConfirmDialog.vue'
import UserTable from '../components/users/UserTable.vue'
import UserFormModal from '../components/users/UserFormModal.vue'
import UserDetailsModal from '../components/users/UserDetailsModal.vue'
import { useUsersStore } from '../stores/users'
import { useToast } from '../composables/useToast'
import { USER_ROLES, USER_STATUSES, filterUsers, sortUsers } from '../utils/users'

const store = useUsersStore()
const { push: toast } = useToast()
const route = useRoute()
const router = useRouter()

const searchTerm = ref('')
const roleFilter = ref('all')
const statusFilter = ref('all')
const sortKey = ref('fullName')
const sortDir = ref('asc')
const page = ref(1)
const pageSize = ref(10)

const formOpen = ref(false)
const detailsOpen = ref(false)
const editingUser = ref(null)
const viewingUser = ref(null)
const statusTarget = ref(null)
const isStatusBusy = ref(false)

const roleOptions = [
  { value: 'all', label: 'All roles' },
  ...USER_ROLES.map((role) => ({ value: role, label: role })),
]

const statusOptions = [
  { value: 'all', label: 'All statuses' },
  ...USER_STATUSES.map((status) => ({ value: status, label: status })),
]

const hasFilters = computed(
  () => searchTerm.value.trim() !== '' || roleFilter.value !== 'all' || statusFilter.value !== 'all',
)

const filteredUsers = computed(() =>
  sortUsers(
    filterUsers(store.users, {
      search: searchTerm.value,
      role: roleFilter.value,
      status: statusFilter.value,
    }),
    sortKey.value,
    sortDir.value,
  ),
)

const totalPages = computed(() => Math.max(1, Math.ceil(filteredUsers.value.length / pageSize.value)))
const pagedUsers = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredUsers.value.slice(start, start + pageSize.value)
})

const directorySubtitle = computed(() => {
  if (!store.totalUsers) return 'No user records yet'
  if (hasFilters.value) {
    return `${filteredUsers.value.length} of ${store.totalUsers} users match the current filters`
  }
  return `${store.totalUsers} demo users in this browser`
})

const summaryCards = computed(() => [
  { label: 'Total users', value: store.totalUsers.toLocaleString('en-US'), icon: 'bi-people', tone: 'indigo', note: 'Demo directory records' },
  { label: 'Active users', value: store.activeUsers.toLocaleString('en-US'), icon: 'bi-person-check', tone: 'green', note: 'Currently active' },
  { label: 'Inactive users', value: store.inactiveUsers.toLocaleString('en-US'), icon: 'bi-person-dash', tone: 'amber', note: 'Deactivated in this browser' },
  { label: 'Roles', value: store.roleCount.toString(), icon: 'bi-shield-lock', tone: 'blue', note: 'Represented in directory' },
])

const storageAlerts = computed(() => {
  const alerts = []
  if (store.storageState === 'unavailable' || store.persistenceState === 'unavailable') {
    alerts.push({
      key: 'unavailable',
      variant: 'danger',
      icon: 'bi-hdd-stack',
      text: 'Browser storage is unavailable. User changes will last for this session only.',
      retry: false,
    })
  } else if (store.persistenceState === 'failed') {
    alerts.push({
      key: 'failed',
      variant: 'danger',
      icon: 'bi-exclamation-triangle',
      text: 'Browser storage is not accepting user saves. Recent changes will be lost when you refresh.',
      retry: true,
    })
  }

  const recovery = store.recovery
  if (recovery) {
    if (recovery.kind === 'invalid-json' || recovery.kind === 'invalid-format') {
      alerts.push({
        key: 'recovery',
        variant: 'warning',
        icon: 'bi-shield-exclamation',
        text: 'Saved user data could not be read, so demo user records were restored to safe defaults.',
        retry: false,
      })
    } else {
      const changes = []
      if (recovery.discarded > 0) changes.push(`${recovery.discarded} invalid ${recovery.discarded === 1 ? 'record was' : 'records were'} removed`)
      if (recovery.corrected > 0) changes.push(`${recovery.corrected} ${recovery.corrected === 1 ? 'record was' : 'records were'} repaired`)
      if (changes.length) {
        alerts.push({
          key: 'recovery-records',
          variant: 'warning',
          icon: 'bi-shield-exclamation',
          text: `Some saved users needed attention: ${changes.join('; ')}.`,
          retry: false,
        })
      }
    }
  }
  return alerts
})

watch([searchTerm, roleFilter, statusFilter, sortKey, sortDir, pageSize], () => {
  page.value = 1
})

watch(totalPages, (value) => {
  if (page.value > value) page.value = value
})

function resetFilters() {
  searchTerm.value = ''
  roleFilter.value = 'all'
  statusFilter.value = 'all'
  sortKey.value = 'fullName'
  sortDir.value = 'asc'
  page.value = 1
}

function toggleSort(key) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
  page.value = 1
}

function openAdd() {
  editingUser.value = null
  formOpen.value = true
}

function openEdit(user) {
  detailsOpen.value = false
  editingUser.value = user
  formOpen.value = true
}

function openView(user) {
  viewingUser.value = user
  detailsOpen.value = true
}

function askToggleStatus(user) {
  statusTarget.value = user
}

function closeStatusDialog(open) {
  if (!open) statusTarget.value = null
}

function handleRetryPersist() {
  const result = store.retryPersist()
  if (result.ok) {
    toast({ variant: 'success', title: 'User changes saved', message: 'User changes are now saved in browser storage.' })
  } else {
    toast({ variant: 'danger', title: 'Could not save user changes', message: result.error || 'Browser storage is still unavailable.' })
  }
}

function handleSaved({ mode, user, persisted }) {
  formOpen.value = false
  editingUser.value = null
  if (mode === 'add') page.value = 1

  toast({
    variant: persisted ? 'success' : 'warning',
    title: persisted ? (mode === 'edit' ? 'User updated' : 'User added') : mode === 'edit' ? 'User updated for this session' : 'User added for this session',
    message: persisted
      ? `${user.fullName} (${user.userId}) was saved to browser storage.`
      : 'Browser storage could not save this change. It will be lost when you refresh.',
  })
}

function confirmStatusChange() {
  if (!statusTarget.value) return
  const target = statusTarget.value
  const nextStatus = target.status === 'Active' ? 'Inactive' : 'Active'
  isStatusBusy.value = true
  const result = store.setUserStatus(target.uid, nextStatus)
  isStatusBusy.value = false

  if (!result.ok) {
    toast({ variant: 'danger', title: 'Could not update user', message: result.errors.form || 'The user status could not be updated.' })
    statusTarget.value = null
    return
  }

  if (viewingUser.value?.uid === target.uid) {
    viewingUser.value = result.user
  }

  const action = nextStatus === 'Active' ? 'activated' : 'deactivated'
  toast({
    variant: result.persisted ? 'success' : 'warning',
    title: result.persisted ? `User ${action}` : `User ${action} for this session`,
    message: result.persisted
      ? `${target.fullName} is now ${nextStatus.toLowerCase()}.`
      : 'Browser storage could not save this change. It will be lost when you refresh.',
  })
  statusTarget.value = null
}

function handleDetailsStatus(user) {
  detailsOpen.value = false
  askToggleStatus(user)
}

function handleQueryAction() {
  if (route.query.action === 'add') {
    openAdd()
    router.replace({ name: 'users' })
  }
}

onMounted(() => {
  store.loadUsers()
  handleQueryAction()
})

watch(() => route.query.action, handleQueryAction)
</script>

<template>
  <div>
    <PageHeader
      title="User Management"
      description="Manage demonstration system accounts, access roles, and active account states. Records are frontend-only and stored in this browser."
      eyebrow="Administration"
      eyebrow-icon="bi-shield-lock"
    >
      <template #actions>
        <span class="demo-flag">
          <i class="bi bi-hdd" aria-hidden="true"></i>
          Browser storage
        </span>
        <button type="button" class="btn-ch btn-ch-primary" @click="openAdd">
          <i class="bi bi-person-plus" aria-hidden="true"></i>
          Add user
        </button>
      </template>
    </PageHeader>

    <div v-if="store.loadState === 'loading'" class="ch-alert is-info" role="status">
      <i class="bi bi-arrow-repeat" aria-hidden="true"></i>
      <span>Loading users from browser storage…</span>
    </div>

    <div v-if="store.loadState === 'error'" class="ch-alert is-warning" role="alert">
      <i class="bi bi-exclamation-triangle" aria-hidden="true"></i>
      <span>{{ store.loadError }}</span>
      <button type="button" class="btn-ch btn-ch-soft btn-ch-sm api-retry" @click="store.loadUsers()">
        <i class="bi bi-arrow-clockwise" aria-hidden="true"></i>
        Retry
      </button>
    </div>

    <div
      v-for="alert in storageAlerts"
      :key="alert.key"
      class="ch-alert"
      :class="`is-${alert.variant}`"
      role="alert"
    >
      <i class="bi" :class="alert.icon" aria-hidden="true"></i>
      <span>{{ alert.text }}</span>
      <button v-if="alert.retry" type="button" class="btn-ch btn-ch-soft btn-ch-sm api-retry" @click="handleRetryPersist">
        <i class="bi bi-arrow-clockwise" aria-hidden="true"></i>
        Retry save
      </button>
    </div>

    <section class="row g-3 g-xl-4 mb-1" aria-label="User summary statistics">
      <div v-for="card in summaryCards" :key="card.label" class="col-sm-6 col-xl-3">
        <StatCard v-bind="card" />
      </div>
    </section>

    <section class="ch-card mt-3 mt-xl-4">
      <div class="ch-card-header has-border">
        <div>
          <h2 class="ch-card-title">User directory</h2>
          <p class="ch-card-subtitle">{{ directorySubtitle }}</p>
        </div>
        <button v-if="hasFilters" type="button" class="btn-ch btn-ch-ghost btn-ch-sm" @click="resetFilters">
          <i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i>
          Reset filters
        </button>
      </div>

      <div class="data-toolbar">
        <SearchField v-model="searchTerm" class="toolbar-search" label="Search users" placeholder="Search by user ID, name, email, role, or department…" />
        <FilterSelect v-model="roleFilter" label="Role" :options="roleOptions" />
        <FilterSelect v-model="statusFilter" label="Status" :options="statusOptions" />
      </div>

      <div v-if="pagedUsers.length" class="ch-card-body is-flush">
        <UserTable
          :users="pagedUsers"
          :sort-key="sortKey"
          :sort-dir="sortDir"
          @sort="toggleSort"
          @view="openView"
          @edit="openEdit"
          @toggle-status="askToggleStatus"
        />
        <PaginationBar
          :page="page"
          :page-size="pageSize"
          :total="filteredUsers.length"
          item-label="users"
          @update:page="page = $event"
          @update:page-size="pageSize = $event"
        />
      </div>

      <div v-else class="ch-card-body">
        <EmptyState
          v-if="store.totalUsers === 0"
          icon="bi-person-plus"
          title="No users yet"
          message="Add your first demo user record to start building the directory."
        >
          <button type="button" class="btn-ch btn-ch-primary" @click="openAdd">
            <i class="bi bi-person-plus" aria-hidden="true"></i>
            Add user
          </button>
        </EmptyState>

        <EmptyState
          v-else
          icon="bi-search"
          title="No users match your filters"
          message="Try a different search term, role, status, or reset all filters."
        >
          <button type="button" class="btn-ch btn-ch-soft" @click="resetFilters">
            <i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i>
            Clear filters
          </button>
        </EmptyState>

        <PaginationBar
          v-if="filteredUsers.length > 0"
          :page="page"
          :page-size="pageSize"
          :total="filteredUsers.length"
          item-label="users"
          @update:page="page = $event"
          @update:page-size="pageSize = $event"
        />
      </div>
    </section>

    <UserFormModal v-model="formOpen" :user="editingUser" @saved="handleSaved" />
    <UserDetailsModal
      v-model="detailsOpen"
      :user="viewingUser"
      @edit="openEdit"
      @toggle-status="handleDetailsStatus"
    />

    <ConfirmDialog
      :model-value="Boolean(statusTarget)"
      :title="statusTarget?.status === 'Active' ? 'Deactivate user?' : 'Activate user?'"
      :confirm-label="statusTarget?.status === 'Active' ? 'Deactivate user' : 'Activate user'"
      :variant="statusTarget?.status === 'Active' ? 'danger' : 'primary'"
      :busy="isStatusBusy"
      @update:model-value="closeStatusDialog"
      @confirm="confirmStatusChange"
      @cancel="closeStatusDialog(false)"
    >
      <p v-if="statusTarget">
        <template v-if="statusTarget.status === 'Active'">
          <strong>{{ statusTarget.fullName }}</strong> will be marked inactive in this browser demo. No backend account is affected.
        </template>
        <template v-else>
          <strong>{{ statusTarget.fullName }}</strong> will be marked active in this browser demo.
        </template>
      </p>
    </ConfirmDialog>
  </div>
</template>
