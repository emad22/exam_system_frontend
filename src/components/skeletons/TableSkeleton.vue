<script setup lang="ts">
import Skeleton from 'primevue/skeleton';

interface Props {
  rows?: number;
  columns?: number;
  showToolbar?: boolean;
}

withDefaults(defineProps<Props>(), {
  rows: 6,
  columns: 5,
  showToolbar: true
});
</script>

<template>
  <div class="space-y-6 w-full animate-pulse">
    <!-- Toolbar / Filter Bar Skeleton -->
    <div v-if="showToolbar" class="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center gap-3 flex-1 min-w-[260px]">
        <Skeleton width="100%" height="2.75rem" borderRadius="0.75rem" class="max-w-md" />
        <Skeleton width="9rem" height="2.75rem" borderRadius="0.75rem" />
      </div>
      <div class="flex items-center gap-3">
        <Skeleton width="7rem" height="2.75rem" borderRadius="0.75rem" />
        <Skeleton width="8.5rem" height="2.75rem" borderRadius="0.75rem" />
      </div>
    </div>

    <!-- Table Skeleton Card -->
    <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-6">
      <!-- Table Header -->
      <div class="grid gap-4 pb-4 mb-4 border-b border-slate-100" :style="{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }">
        <div v-for="col in columns" :key="'th-' + col">
          <Skeleton :width="col === 1 ? '60%' : '75%'" height="1.25rem" borderRadius="0.5rem" />
        </div>
      </div>

      <!-- Table Rows -->
      <div class="space-y-4">
        <div
          v-for="row in rows"
          :key="'tr-' + row"
          class="grid gap-4 py-3 items-center border-b border-slate-50 last:border-none"
          :style="{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }"
        >
          <!-- Column 1: Primary info (avatar + text) -->
          <div class="flex items-center gap-3">
            <Skeleton shape="circle" size="2.5rem" />
            <div class="space-y-1.5 flex-1">
              <Skeleton width="80%" height="1rem" borderRadius="0.375rem" />
              <Skeleton width="50%" height="0.75rem" borderRadius="0.375rem" />
            </div>
          </div>

          <!-- Other columns -->
          <div v-for="col in columns - 1" :key="'col-' + row + '-' + col">
            <Skeleton
              :width="col % 2 === 0 ? '70%' : '85%'"
              :height="col === columns - 1 ? '2rem' : '1.1rem'"
              :borderRadius="col === columns - 1 ? '0.625rem' : '0.375rem'"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
