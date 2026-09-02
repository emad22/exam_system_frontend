<script setup>
import { ref, computed } from 'vue';
import DatePicker from 'primevue/datepicker';

const props = defineProps({
  // Search
  modelValue: { type: String, default: '' },
  searchPlaceholder: { type: String, default: 'Filter identities / codes...' },
  // Date
  dateFrom: { type: [Date, null], default: null },
  dateTo: { type: [Date, null], default: null },
  showDateFilter: { type: Boolean, default: true },
  showQuickPresets: { type: Boolean, default: true },
  // Active count (for extra filters passed via slots)
  activeCount: { type: Number, default: 0 },
});

const emit = defineEmits([
  'update:modelValue',
  'update:dateFrom',
  'update:dateTo',
  'apply',
  'reset',
]);

const showDateMenu = ref(false);
const activePreset = ref(null);

const formatDateLabel = (d) => {
  if (!d) return '';
  const date = new Date(d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const dateLabel = computed(() => {
  if (props.dateFrom && props.dateTo) {
    return `${formatDateLabel(props.dateFrom)} – ${formatDateLabel(props.dateTo)}`;
  }
  if (props.dateFrom) {
    return `From ${formatDateLabel(props.dateFrom)}`;
  }
  if (props.dateTo) {
    return `Until ${formatDateLabel(props.dateTo)}`;
  }
  return 'All Dates';
});

const isDateActive = computed(() => Boolean(props.dateFrom || props.dateTo));

const setPreset = (preset) => {
  activePreset.value = preset;
  const now = new Date();
  let from = null;
  let to = new Date();

  if (preset === 'today') {
    from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  } else if (preset === 'yesterday') {
    const y = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    from = new Date(y.getFullYear(), y.getMonth(), y.getDate());
    to = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59);
  } else if (preset === 'thisWeek') {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
    from = new Date(now.setDate(diff));
    from.setHours(0, 0, 0, 0);
    to = new Date();
  } else if (preset === 'thisMonth') {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
    to = new Date();
  } else if (preset === 'all') {
    from = null;
    to = null;
    activePreset.value = null;
  }

  emit('update:dateFrom', from);
  emit('update:dateTo', to);
  showDateMenu.value = false;
  emit('apply');
};

const handleClearAll = () => {
  activePreset.value = null;
  emit('update:modelValue', '');
  emit('update:dateFrom', null);
  emit('update:dateTo', null);
  emit('reset');
};

const handleApply = () => {
  showDateMenu.value = false;
  emit('apply');
};
</script>

<template>
  <div class="bg-white rounded-3xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] p-6 space-y-4 relative z-30">
    
    <!-- ── Row 1: Structured Filters Grid ────────────────────────────── -->
    <div class="flex flex-wrap items-end gap-3.5">

      <!-- Column 1: Search -->
      <div class="flex-1 min-w-[220px]">
        <label class="block text-[11px] font-bold text-slate-600 mb-1.5 tracking-tight flex items-center gap-1.5">
          <i class="pi pi-search text-[10px] text-slate-400" />
          <span>Search</span>
        </label>
        <div class="relative flex items-center bg-slate-50/70 hover:bg-slate-50 focus-within:bg-white border border-slate-200/80 focus-within:border-brand-primary rounded-xl px-3.5 h-11 transition-all">
          <i class="pi pi-search text-slate-400 text-xs mr-2" />
          <input
            :value="modelValue"
            @input="emit('update:modelValue', $event.target.value)"
            @keyup.enter="handleApply"
            :placeholder="searchPlaceholder"
            type="text"
            class="bg-transparent outline-none text-xs font-semibold text-slate-700 placeholder-slate-400 w-full"
          />
          <button
            v-if="modelValue"
            @click="emit('update:modelValue', '')"
            class="text-slate-400 hover:text-slate-600 transition-colors p-1"
          >
            <i class="pi pi-times text-[10px]" />
          </button>
        </div>
      </div>

      <!-- Column 2: Date Range -->
      <div v-if="showDateFilter" class="w-full sm:w-48 relative">
        <label class="block text-[11px] font-bold text-slate-600 mb-1.5 tracking-tight flex items-center gap-1.5">
          <i class="pi pi-calendar text-[10px] text-slate-400" />
          <span>Date Range</span>
        </label>
        <button
          @click="showDateMenu = !showDateMenu"
          :class="[
            isDateActive
              ? 'bg-rose-50 text-brand-primary border-brand-primary/40 font-bold'
              : 'bg-slate-50/70 hover:bg-slate-50 text-slate-700 border-slate-200/80 font-semibold',
          ]"
          class="w-full flex items-center justify-between px-3.5 h-11 rounded-xl border text-xs transition-all cursor-pointer select-none"
        >
          <div class="flex items-center gap-2 truncate">
            <i class="pi pi-calendar text-xs text-slate-400" />
            <span class="truncate">{{ dateLabel }}</span>
          </div>
          <i class="pi pi-chevron-down text-[10px] text-slate-400 shrink-0 ml-1" :class="showDateMenu ? 'rotate-180' : ''" />
        </button>

        <!-- Backdrop overlay -->
        <div v-if="showDateMenu" @click="showDateMenu = false" class="fixed inset-0 z-40 bg-transparent" />

        <!-- Date Dropdown Popover -->
        <transition
          enter-active-class="transition duration-150 ease-out"
          enter-from-class="transform scale-95 opacity-0 -translate-y-1"
          enter-to-class="transform scale-100 opacity-100 translate-y-0"
          leave-active-class="transition duration-100 ease-in"
          leave-from-class="transform scale-100 opacity-100"
          leave-to-class="transform scale-95 opacity-0"
        >
          <div
            v-if="showDateMenu"
            class="absolute left-0 top-[4.25rem] z-50 w-72 bg-white rounded-2xl border border-slate-200 shadow-xl p-4 space-y-3"
          >
            <div class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Custom Date Range</div>
            
            <div class="space-y-2">
              <div class="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2">
                <span class="text-[10px] font-bold text-slate-400 w-10">FROM:</span>
                <DatePicker
                  :modelValue="dateFrom"
                  @update:modelValue="emit('update:dateFrom', $event); activePreset = null"
                  placeholder="Start date"
                  dateFormat="yy-mm-dd"
                  :showButtonBar="true"
                  :showIcon="false"
                  inputClass="!bg-transparent !border-none !outline-none !text-xs !font-bold !text-slate-700 !p-0 !w-full"
                />
              </div>
              <div class="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2">
                <span class="text-[10px] font-bold text-slate-400 w-10">TO:</span>
                <DatePicker
                  :modelValue="dateTo"
                  @update:modelValue="emit('update:dateTo', $event); activePreset = null"
                  placeholder="End date"
                  dateFormat="yy-mm-dd"
                  :showButtonBar="true"
                  :showIcon="false"
                  inputClass="!bg-transparent !border-none !outline-none !text-xs !font-bold !text-slate-700 !p-0 !w-full"
                />
              </div>
            </div>

            <div class="pt-2 border-t border-slate-100 flex items-center justify-between">
              <button
                v-if="isDateActive"
                @click="setPreset('all')"
                class="text-[11px] font-bold text-rose-500 hover:text-rose-700 transition-colors cursor-pointer"
              >
                Clear
              </button>
              <div v-else />
              <button
                @click="handleApply"
                class="text-xs font-black px-4 py-1.5 bg-brand-primary text-white rounded-xl hover:opacity-90 transition-all cursor-pointer ml-auto"
              >
                Apply
              </button>
            </div>
          </div>
        </transition>
      </div>

      <!-- Extra Dropdowns Slot (Partner, Status, Skill, etc.) -->
      <div class="flex flex-wrap items-end gap-3.5 extra-filters-container">
        <slot />
      </div>

      <!-- Apply & Actions Group -->
      <div class="flex items-center gap-2 shrink-0 ml-auto pt-1">
        <slot name="extra-buttons" />
        
        <button
          @click="handleApply"
          class="flex items-center gap-2 px-5 h-11 rounded-xl bg-brand-primary text-white font-bold text-xs shadow-md shadow-rose-900/10 hover:opacity-95 active:scale-98 transition-all cursor-pointer"
        >
          <i class="pi pi-check text-xs" />
          <span>Apply Filters</span>
        </button>
      </div>

    </div>

    <!-- ── Row 2: Quick Filters & Clear All ─────────────────────────── -->
    <div v-if="showQuickPresets" class="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
      
      <!-- Presets Chips -->
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-xs font-bold text-slate-700 mr-2">Quick Filters</span>
        
        <!-- Today (Blue) -->
        <button
          @click="setPreset('today')"
          :class="activePreset === 'today' ? 'bg-blue-600 text-white font-bold shadow-sm' : 'bg-blue-50/80 hover:bg-blue-100/80 text-blue-600 font-semibold border border-blue-200/60'"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer select-none"
        >
          <i class="pi pi-calendar text-[10px]" />
          <span>Today</span>
        </button>

        <!-- Yesterday (Emerald) -->
        <button
          @click="setPreset('yesterday')"
          :class="activePreset === 'yesterday' ? 'bg-emerald-600 text-white font-bold shadow-sm' : 'bg-emerald-50/80 hover:bg-emerald-100/80 text-emerald-600 font-semibold border border-emerald-200/60'"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer select-none"
        >
          <i class="pi pi-calendar text-[10px]" />
          <span>Yesterday</span>
        </button>

        <!-- This Week (Purple) -->
        <button
          @click="setPreset('thisWeek')"
          :class="activePreset === 'thisWeek' ? 'bg-purple-600 text-white font-bold shadow-sm' : 'bg-purple-50/80 hover:bg-purple-100/80 text-purple-600 font-semibold border border-purple-200/60'"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer select-none"
        >
          <i class="pi pi-calendar text-[10px]" />
          <span>This Week</span>
        </button>

        <!-- This Month (Amber/Orange) -->
        <button
          @click="setPreset('thisMonth')"
          :class="activePreset === 'thisMonth' ? 'bg-amber-600 text-white font-bold shadow-sm' : 'bg-amber-50/80 hover:bg-amber-100/80 text-amber-700 font-semibold border border-amber-200/60'"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer select-none"
        >
          <i class="pi pi-calendar text-[10px]" />
          <span>This Month</span>
        </button>
      </div>

      <!-- Clear All Button -->
      <button
        @click="handleClearAll"
        class="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-rose-600 transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-slate-50"
      >
        <i class="pi pi-refresh text-xs" />
        <span>Clear All</span>
      </button>

    </div>

  </div>
</template>

<style scoped>
:deep(.p-datepicker-input) {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  padding: 0 !important;
  height: auto !important;
}

:deep(.p-datepicker-input-icon-container) {
  display: none !important;
}

/* Match all PrimeVue Selects inside slot with the design */
:deep(.extra-filters-container .p-select),
:deep(.extra-filters-container .p-dropdown) {
  height: 2.75rem !important;
  border-radius: 0.75rem !important;
  background: rgba(248, 250, 252, 0.7) !important;
  border: 1px solid rgba(226, 232, 240, 0.8) !important;
  font-size: 0.75rem !important;
  font-weight: 600 !important;
  transition: all 0.2s ease !important;
  display: inline-flex !important;
  align-items: center !important;
}

:deep(.extra-filters-container .p-select:hover),
:deep(.extra-filters-container .p-dropdown:hover) {
  background: #ffffff !important;
  border-color: rgba(203, 213, 225, 1) !important;
}

:deep(.extra-filters-container .p-select:focus-within),
:deep(.extra-filters-container .p-dropdown:focus-within) {
  background: #ffffff !important;
  border-color: rgba(136, 19, 55, 0.8) !important;
  box-shadow: 0 0 0 3px rgba(136, 19, 55, 0.08) !important;
}

:deep(.extra-filters-container .p-select-label),
:deep(.extra-filters-container .p-dropdown-label) {
  padding: 0 0.875rem !important;
  font-size: 0.75rem !important;
  font-weight: 600 !important;
  color: #334155 !important;
}
</style>
