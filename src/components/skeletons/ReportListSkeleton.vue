<script setup lang="ts">
import Skeleton from 'primevue/skeleton';
defineProps<{ rows?: number }>()
const _rows = (r?: number) => r ?? 4
</script>

<template>
  <div class="space-y-6 w-full animate-pulse">
    <!-- Header bar -->
    <div class="bg-white rounded-2xl border border-slate-100 shadow-sm px-7 py-5">
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div class="flex items-center gap-3">
          <Skeleton width="2.5rem" height="2.5rem" borderRadius="0.75rem" />
          <div class="space-y-1.5">
            <Skeleton width="5rem" height="0.75rem" borderRadius="0.375rem" />
            <Skeleton width="9rem" height="1.5rem" borderRadius="0.5rem" />
          </div>
        </div>
        <div class="flex gap-2">
          <Skeleton width="9rem" height="2.25rem" borderRadius="0.75rem" />
          <Skeleton width="9rem" height="2.25rem" borderRadius="0.75rem" />
          <Skeleton width="11rem" height="2.25rem" borderRadius="0.75rem" />
          <Skeleton width="14rem" height="2.25rem" borderRadius="0.75rem" />
          <Skeleton width="2.25rem" height="2.25rem" borderRadius="0.75rem" />
        </div>
      </div>
    </div>

    <!-- Summary cards -->
    <div class="bg-white rounded-2xl border border-slate-100 shadow-sm px-7 py-5">
      <div class="space-y-2 mb-5">
        <Skeleton width="7rem" height="1.1rem" borderRadius="0.5rem" />
        <Skeleton width="11rem" height="0.75rem" borderRadius="0.375rem" />
      </div>
      <div class="grid grid-cols-2 gap-6">
        <div v-for="i in 2" :key="i" class="flex items-center gap-3">
          <Skeleton width="2.5rem" height="2.5rem" borderRadius="0.75rem" />
          <div class="space-y-1.5">
            <Skeleton width="5rem" height="0.65rem" borderRadius="0.25rem" />
            <Skeleton width="3.5rem" height="1.5rem" borderRadius="0.5rem" />
            <Skeleton width="6rem" height="0.65rem" borderRadius="0.25rem" />
          </div>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <!-- Table header -->
      <div class="grid grid-cols-6 gap-4 px-6 py-3 bg-slate-50 border-b border-slate-100">
        <Skeleton v-for="c in 6" :key="c" :width="c === 1 ? '70%' : '60%'" height="0.75rem" borderRadius="0.25rem" />
      </div>

      <!-- Rows -->
      <div v-for="row in (_rows($props.rows))" :key="row">
        <!-- Main row -->
        <div class="grid grid-cols-6 gap-4 px-6 py-5 items-center border-b border-slate-50">
          <!-- Student col -->
          <div class="flex items-center gap-3">
            <Skeleton width="2.5rem" height="2.5rem" borderRadius="0.75rem" />
            <div class="space-y-1.5 flex-1">
              <Skeleton width="80%" height="0.9rem" borderRadius="0.375rem" />
              <Skeleton width="55%" height="0.7rem" borderRadius="0.25rem" />
            </div>
          </div>
          <!-- Exam col -->
          <div class="space-y-1.5">
            <Skeleton width="85%" height="0.9rem" borderRadius="0.375rem" />
            <Skeleton width="60%" height="0.7rem" borderRadius="0.25rem" />
          </div>
          <!-- Score circle -->
          <div class="flex flex-col items-center gap-1">
            <Skeleton shape="circle" size="4rem" />
            <Skeleton width="2.5rem" height="0.7rem" borderRadius="0.25rem" />
          </div>
          <!-- Status -->
          <div class="flex flex-col items-center gap-1.5">
            <Skeleton width="5.5rem" height="1.6rem" borderRadius="0.5rem" />
            <Skeleton width="7rem" height="0.7rem" borderRadius="0.25rem" />
          </div>
          <!-- Dates -->
          <div class="space-y-2">
            <div class="space-y-1">
              <Skeleton width="40%" height="0.65rem" borderRadius="0.25rem" />
              <Skeleton width="70%" height="0.8rem" borderRadius="0.25rem" />
              <Skeleton width="50%" height="0.7rem" borderRadius="0.25rem" />
            </div>
          </div>
          <!-- Action -->
          <div class="flex justify-end">
            <Skeleton width="2.25rem" height="2.25rem" borderRadius="0.75rem" />
          </div>
        </div>
        <!-- Skills sub-row -->
        <div class="px-6 pb-4 pt-2 bg-slate-50/30 border-b border-slate-50 flex gap-2">
          <Skeleton v-for="s in 4" :key="s" width="7rem" height="2.25rem" borderRadius="0.75rem" />
        </div>
      </div>
    </div>
  </div>
</template>
