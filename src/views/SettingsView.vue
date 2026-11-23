<script setup>
import { computed, onMounted, ref } from 'vue'
import PageHeader from '../components/common/PageHeader.vue'
import ConfirmDialog from '../components/common/ConfirmDialog.vue'
import { useSettingsStore } from '../stores/settings'
import { useToast } from '../composables/useToast'
import { SETTINGS_DEFAULTS, TABLE_DENSITY_OPTIONS } from '../utils/settings'

const store = useSettingsStore()
const { push: toast } = useToast()
const resetOpen = ref(false)

const currentSettings = computed(() => store.settings)
const hasCustomizations = computed(
  () =>
    currentSettings.value.sidebarDefaultCollapsed !== SETTINGS_DEFAULTS.sidebarDefaultCollapsed ||
    currentSettings.value.tableDensity !== SETTINGS_DEFAULTS.tableDensity,
)

const storageAlerts = computed(() => {
  const alerts = []
  if (store.storageState === 'unavailable' || store.persistenceState === 'unavailable') {
    alerts.push({
      key: 'unavailable',
      variant: 'danger',
      icon: 'bi-hdd-stack',
      text: 'Browser storage is unavailable. Settings changes will last for this session only.',
      retry: false,
    })
  } else if (store.persistenceState === 'failed') {
    alerts.push({
      key: 'failed',
      variant: 'danger',
      icon: 'bi-exclamation-triangle',
      text: 'Browser storage is not accepting settings saves. Recent changes will be lost when you refresh.',
      retry: true,
    })
  }
  if (store.recovery?.kind === 'invalid-json' || store.recovery?.kind === 'invalid-format') {
    alerts.push({
      key: 'recovered',
      variant: 'warning',
      icon: 'bi-shield-exclamation',
      text: 'Saved settings could not be read and were reset to safe defaults.',
      retry: false,
    })
  } else if (store.recovery?.kind === 'normalized') {
    alerts.push({
      key: 'normalized',
      variant: 'warning',
      icon: 'bi-shield-exclamation',
      text: 'Some saved settings were invalid and were repaired to safe defaults.',
      retry: false,
    })
  } else if (store.recovery?.kind === 'legacy-migration') {
    alerts.push({
      key: 'legacy',
      variant: 'info',
      icon: 'bi-info-circle',
      text: 'Your previous sidebar preference was imported into Settings.',
      retry: false,
    })
  }
  return alerts
})

function handleRetryPersist() {
  const result = store.retryPersist()
  toast({
    variant: result.ok ? 'success' : 'danger',
    title: result.ok ? 'Settings saved' : 'Could not save settings',
    message: result.ok
      ? 'Settings are now saved in browser storage.'
      : result.error || 'Browser storage is still unavailable.',
  })
}

function updateSetting(patch, successTitle, successMessage) {
  const result = store.updateSettings(patch)
  toast({
    variant: result.persisted ? 'success' : 'warning',
    title: result.persisted ? successTitle : `${successTitle} for this session`,
    message: result.persisted
      ? successMessage
      : 'Browser storage could not save this change. It will be lost when you refresh.',
  })
}

function setSidebarDefault(event) {
  updateSetting(
    { sidebarDefaultCollapsed: event.target.checked },
    'Sidebar preference updated',
    event.target.checked
      ? 'New sessions will start with the sidebar collapsed.'
      : 'New sessions will start with the sidebar expanded.',
  )
}

function setTableDensity(value) {
  if (store.tableDensity === value) return
  updateSetting(
    { tableDensity: value },
    'Table density updated',
    value === 'compact'
      ? 'Tables now use a compact layout.'
      : 'Tables now use the comfortable layout.',
  )
}

function confirmReset() {
  const result = store.resetToDefaults()
  resetOpen.value = false
  toast({
    variant: result.persisted ? 'success' : 'warning',
    title: result.persisted ? 'Settings reset' : 'Settings reset for this session',
    message: result.persisted
      ? 'Settings were restored to their default values.'
      : 'Defaults were applied, but browser storage could not save the change.',
  })
}

onMounted(() => {
  store.loadSettings()
})
</script>

<template>
  <div>
    <PageHeader
      title="Settings"
      description="Adjust frontend interface preferences for this browser. Settings are local-only and do not affect authentication, accounts, or server data."
      eyebrow="Administration"
      eyebrow-icon="bi-gear"
    >
      <template #actions>
        <span class="demo-flag">
          <i class="bi bi-hdd" aria-hidden="true"></i>
          Browser storage
        </span>
      </template>
    </PageHeader>

    <div v-if="store.loadState === 'loading'" class="ch-alert is-info" role="status">
      <i class="bi bi-arrow-repeat" aria-hidden="true"></i>
      <span>Loading settings from browser storage…</span>
    </div>

    <div v-if="store.loadState === 'error'" class="ch-alert is-warning" role="alert">
      <i class="bi bi-exclamation-triangle" aria-hidden="true"></i>
      <span>{{ store.loadError }}</span>
      <button type="button" class="btn-ch btn-ch-soft btn-ch-sm api-retry" @click="store.loadSettings()">
        <i class="bi bi-arrow-clockwise" aria-hidden="true"></i>
        Retry
      </button>
    </div>

    <div
      v-for="alert in storageAlerts"
      :key="alert.key"
      class="ch-alert"
      :class="`is-${alert.variant}`"
      role="status"
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

    <section class="row g-3 g-xl-4">
      <div class="col-12 col-xl-7">
        <section class="ch-card h-100">
          <div class="ch-card-header has-border">
            <div>
              <h2 class="ch-card-title">Interface preferences</h2>
              <p class="ch-card-subtitle">Changes apply immediately in this browser.</p>
            </div>
          </div>

          <div class="ch-card-body">
            <div class="settings-item">
              <div class="settings-item-copy">
                <label class="settings-item-label" for="setting-sidebar-collapsed">
                  Start with sidebar collapsed
                </label>
                <p class="settings-item-help">
                  Applies the default sidebar state on page load. You can still toggle the sidebar from the top bar.
                </p>
              </div>
              <div class="form-check form-switch m-0">
                <input
                  id="setting-sidebar-collapsed"
                  class="form-check-input"
                  type="checkbox"
                  role="switch"
                  :checked="currentSettings.sidebarDefaultCollapsed"
                  @change="setSidebarDefault"
                />
              </div>
            </div>

            <hr class="settings-divider" />

            <fieldset class="settings-fieldset">
              <legend class="settings-item-label">Table density</legend>
              <p class="settings-item-help mb-3">
                Choose how compact data tables appear across the app.
              </p>
              <div class="settings-density-options" role="radiogroup" aria-label="Table density">
                <label
                  v-for="option in TABLE_DENSITY_OPTIONS"
                  :key="option.value"
                  class="settings-density-option"
                  :class="{ 'is-selected': store.tableDensity === option.value }"
                >
                  <input
                    type="radio"
                    name="table-density"
                    :value="option.value"
                    :checked="store.tableDensity === option.value"
                    @change="setTableDensity(option.value)"
                  />
                  <span class="settings-density-title">{{ option.label }}</span>
                  <span class="settings-density-help">
                    {{ option.value === 'compact' ? 'Fits more rows with tighter spacing.' : 'Balanced spacing for readability.' }}
                  </span>
                </label>
              </div>
            </fieldset>
          </div>
        </section>
      </div>

      <div class="col-12 col-xl-5">
        <section class="ch-card h-100">
          <div class="ch-card-header has-border">
            <div>
              <h2 class="ch-card-title">Storage and defaults</h2>
              <p class="ch-card-subtitle">Frontend-only preferences stored locally.</p>
            </div>
          </div>

          <div class="ch-card-body">
            <dl class="detail-grid">
              <div>
                <dt>Persistence</dt>
                <dd>Browser local storage</dd>
              </div>
              <div>
                <dt>Scope</dt>
                <dd>This browser only</dd>
              </div>
              <div>
                <dt>Sidebar default</dt>
                <dd>{{ currentSettings.sidebarDefaultCollapsed ? 'Collapsed' : 'Expanded' }}</dd>
              </div>
              <div>
                <dt>Table density</dt>
                <dd>{{ store.tableDensity === 'compact' ? 'Compact' : 'Comfortable' }}</dd>
              </div>
            </dl>

            <div class="ch-alert is-info mt-3 mb-0" role="note">
              <i class="bi bi-info-circle" aria-hidden="true"></i>
              <span>Account, password, notification delivery, and server sync settings are not available in this frontend-only demo.</span>
            </div>

            <div class="mt-3 d-flex justify-content-end">
              <button
                type="button"
                class="btn-ch btn-ch-soft"
                :disabled="!hasCustomizations"
                @click="resetOpen = true"
              >
                <i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i>
                Reset to defaults
              </button>
            </div>
          </div>
        </section>
      </div>
    </section>

    <ConfirmDialog
      :model-value="resetOpen"
      title="Reset settings to defaults?"
      confirm-label="Reset settings"
      variant="danger"
      @update:model-value="resetOpen = $event"
      @confirm="confirmReset"
      @cancel="resetOpen = false"
    >
      <p>This will restore interface preferences to their default values in this browser.</p>
    </ConfirmDialog>
  </div>
</template>
