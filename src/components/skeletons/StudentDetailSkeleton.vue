<script setup lang="ts">
import Skeleton from 'primevue/skeleton';
</script>

<template>
  <div class="space-y-6 w-full animate-pulse">
    <!-- Header bar -->
    <div class="bg-white rounded-2xl border border-slate-100 shadow-sm px-6 py-4">
      <div class="flex justify-between items-center">
        <div class="flex items-center gap-3">
          <Skeleton width="2.25rem" height="2.25rem" borderRadius="0.75rem" />
          <div class="space-y-1.5">
            <Skeleton width="4rem" height="0.7rem" borderRadius="0.25rem" />
            <Skeleton width="10rem" height="1.25rem" borderRadius="0.5rem" />
          </div>
        </div>
        <div class="flex gap-2">
          <Skeleton v-for="i in 2" :key="i" width="7rem" height="2.25rem" borderRadius="0.75rem" />
        </div>
      </div>
    </div>

    <!-- Profile card -->
    <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div class="flex flex-col md:flex-row gap-6 items-start">
        <Skeleton shape="circle" size="5rem" />
        <div class="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div v-for="i in 8" :key="i" class="space-y-1.5">
            <Skeleton width="50%" height="0.65rem" borderRadius="0.25rem" />
            <Skeleton width="85%" height="1rem" borderRadius="0.375rem" />
          </div>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div class="bg-slate-50/60 border-b border-slate-100 px-4 pt-4 pb-0 flex gap-2">
        <Skeleton v-for="i in 3" :key="i" width="7rem" height="2.5rem" borderRadius="0.75rem 0.75rem 0 0" />
      </div>
      <div class="p-5 space-y-3">
        <div v-for="i in 5" :key="i" class="border border-slate-100 rounded-xl p-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <Skeleton shape="circle" size="2.5rem" />
            <div class="space-y-1.5">
              <Skeleton width="8rem" height="0.9rem" borderRadius="0.375rem" />
              <Skeleton width="5rem" height="0.7rem" borderRadius="0.25rem" />
            </div>
          </div>
          <div class="flex gap-3 items-center">
            <Skeleton width="5rem" height="1.5rem" borderRadius="0.5rem" />
            <Skeleton width="5rem" height="1.5rem" borderRadius="0.5rem" />
            <Skeleton width="2.25rem" height="2.25rem" borderRadius="0.75rem" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
