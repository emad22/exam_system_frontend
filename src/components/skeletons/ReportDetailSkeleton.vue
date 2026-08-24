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
            <Skeleton width="5rem" height="0.7rem" borderRadius="0.25rem" />
            <Skeleton width="8rem" height="1.25rem" borderRadius="0.5rem" />
          </div>
        </div>
        <div class="flex gap-2">
          <Skeleton v-for="i in 3" :key="i" width="8rem" height="2.25rem" borderRadius="0.75rem" />
        </div>
      </div>
    </div>

    <!-- Summary card -->
    <div class="bg-white rounded-2xl border border-slate-100 shadow-sm px-6 py-5">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Candidate -->
        <div class="flex items-center gap-4">
          <Skeleton shape="circle" size="3rem" />
          <div class="space-y-2 flex-1">
            <Skeleton width="40%" height="0.7rem" borderRadius="0.25rem" />
            <Skeleton width="75%" height="1.1rem" borderRadius="0.375rem" />
            <Skeleton width="55%" height="0.75rem" borderRadius="0.25rem" />
          </div>
        </div>
        <!-- Score -->
        <div class="flex items-center gap-4 md:border-x border-slate-100 md:px-6">
          <Skeleton shape="circle" size="5rem" />
          <div class="space-y-2">
            <Skeleton width="6rem" height="0.7rem" borderRadius="0.25rem" />
            <Skeleton width="5rem" height="2rem" borderRadius="0.5rem" />
            <Skeleton width="7rem" height="1.25rem" borderRadius="0.75rem" />
            <Skeleton width="5.5rem" height="1.5rem" borderRadius="0.5rem" />
          </div>
        </div>
        <!-- Exam & Dates -->
        <div class="space-y-2">
          <Skeleton width="3rem" height="0.7rem" borderRadius="0.25rem" />
          <Skeleton width="85%" height="1rem" borderRadius="0.375rem" />
          <Skeleton width="6rem" height="0.7rem" borderRadius="0.25rem" />
          <div class="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-100">
            <div class="space-y-1.5">
              <Skeleton width="60%" height="0.65rem" borderRadius="0.25rem" />
              <Skeleton width="80%" height="0.9rem" borderRadius="0.25rem" />
              <Skeleton width="50%" height="0.7rem" borderRadius="0.25rem" />
            </div>
            <div class="space-y-1.5">
              <Skeleton width="60%" height="0.65rem" borderRadius="0.25rem" />
              <Skeleton width="80%" height="0.9rem" borderRadius="0.25rem" />
              <Skeleton width="5rem" height="0.7rem" borderRadius="0.25rem" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Skills tabs container -->
    <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <!-- Tab bar -->
      <div class="bg-slate-50/60 border-b border-slate-100 px-4 pt-4 pb-0 flex gap-2">
        <Skeleton v-for="i in 4" :key="i" width="7rem" height="2.5rem" borderRadius="0.75rem 0.75rem 0 0" />
      </div>

      <!-- Tab content -->
      <div class="p-5 space-y-5">
        <!-- Skill header card -->
        <div class="bg-slate-50 rounded-2xl border border-slate-100 p-5">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div class="flex items-center gap-4">
              <Skeleton width="2.75rem" height="2.75rem" borderRadius="0.75rem" />
              <div class="space-y-2">
                <Skeleton width="7rem" height="1rem" borderRadius="0.375rem" />
                <Skeleton width="11rem" height="0.75rem" borderRadius="0.25rem" />
              </div>
            </div>
            <div class="flex gap-2">
              <Skeleton v-for="i in 3" :key="i" width="5rem" height="3.5rem" borderRadius="0.75rem" />
              <Skeleton width="7rem" height="2.25rem" borderRadius="0.75rem" class="self-center" />
            </div>
          </div>
          <!-- Level progression -->
          <div class="mt-4 pt-4 border-t border-slate-200 flex gap-2">
            <Skeleton v-for="i in 5" :key="i" width="5.5rem" height="2rem" borderRadius="0.75rem" />
          </div>
        </div>

        <!-- Response section header -->
        <div class="flex items-center gap-3">
          <Skeleton width="14rem" height="0.75rem" borderRadius="0.25rem" />
          <div class="flex-1 h-px bg-slate-100"></div>
          <Skeleton width="6rem" height="1.5rem" borderRadius="1rem" />
        </div>

        <!-- Question cards -->
        <div class="space-y-3">
          <div v-for="q in 5" :key="q" class="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
            <!-- Q header -->
            <div class="flex items-center gap-3 px-5 py-3 border-b border-slate-50 bg-slate-50/40">
              <Skeleton width="1.75rem" height="1.75rem" borderRadius="0.5rem" />
              <Skeleton width="5rem" height="1.25rem" borderRadius="0.5rem" />
              <div class="flex-1"></div>
              <Skeleton width="3rem" height="1.25rem" borderRadius="0.375rem" />
            </div>
            <!-- Q body -->
            <div class="p-5 space-y-4">
              <Skeleton width="90%" height="1rem" borderRadius="0.375rem" />
              <Skeleton width="70%" height="1rem" borderRadius="0.375rem" />
              <div class="grid grid-cols-2 gap-4 pt-3 border-t border-slate-50">
                <div class="bg-slate-50 rounded-xl p-4 space-y-2">
                  <Skeleton width="5rem" height="0.65rem" borderRadius="0.25rem" />
                  <Skeleton width="75%" height="0.9rem" borderRadius="0.375rem" />
                </div>
                <div class="bg-emerald-50 rounded-xl p-4 space-y-2">
                  <Skeleton width="5rem" height="0.65rem" borderRadius="0.25rem" />
                  <Skeleton width="65%" height="0.9rem" borderRadius="0.375rem" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
