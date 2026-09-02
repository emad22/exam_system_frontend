<template>
  <div v-if="totalRecords > 0" class="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 border-t border-slate-50">
    <!-- Left: record info + rows per page -->
    <div class="flex items-center gap-4">
      <span class="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
        Showing
        <span class="text-slate-700 font-black">
          {{ (currentPage - 1) * rowsPerPage + 1 }}–{{ Math.min(currentPage * rowsPerPage, totalRecords) }}
        </span>
        of
        <span class="text-slate-700 font-black">{{ totalRecords }}</span>
        records
      </span>
      <select :value="rowsPerPage" @change="onRowsPerPageChange"
        class="bg-slate-50 border border-slate-100 rounded-xl px-3 py-1.5 text-[11px] font-bold text-slate-600 outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all cursor-pointer">
        <option v-for="opt in rowsPerPageOptions" :key="opt" :value="opt">{{ opt }} / page</option>
      </select>
    </div>

    <!-- Right: page buttons -->
    <div class="flex items-center gap-1">
      <button @click="changePage(1)" :disabled="currentPage === 1"
        class="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all" title="First page">
        <i class="pi pi-angle-double-left text-xs" />
      </button>
      <button @click="changePage(currentPage - 1)" :disabled="currentPage === 1"
        class="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all" title="Previous">
        <i class="pi pi-angle-left text-xs" />
      </button>

      <template v-for="page in totalPages" :key="page">
        <button v-if="page === 1 || page === totalPages || (page >= currentPage - 2 && page <= currentPage + 2)"
          @click="changePage(page)"
          :class="[
            'w-8 h-8 rounded-xl text-[11px] font-black transition-all',
            page === currentPage
              ? 'bg-brand-primary text-white shadow-sm'
              : 'text-slate-500 hover:bg-slate-100'
          ]">
          {{ page }}
        </button>
        <span v-else-if="page === currentPage - 3 || page === currentPage + 3"
          class="w-8 h-8 flex items-center justify-center text-slate-300 text-xs font-bold">…</span>
      </template>

      <button @click="changePage(currentPage + 1)" :disabled="currentPage === totalPages"
        class="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all" title="Next">
        <i class="pi pi-angle-right text-xs" />
      </button>
      <button @click="changePage(totalPages)" :disabled="currentPage === totalPages"
        class="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all" title="Last page">
        <i class="pi pi-angle-double-right text-xs" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  totalRecords: {
    type: Number,
    required: true,
    default: 0
  },
  currentPage: {
    type: Number,
    default: 1
  },
  rowsPerPage: {
    type: Number,
    default: 15
  },
  rowsPerPageOptions: {
    type: Array,
    default: () => [10, 15, 25, 50, 100]
  }
});

const emit = defineEmits(['update:currentPage', 'update:rowsPerPage', 'pageChange']);

const totalPages = computed(() => Math.ceil(props.totalRecords / props.rowsPerPage) || 1);

const changePage = (page) => {
  if (page >= 1 && page <= totalPages.value && page !== props.currentPage) {
    emit('update:currentPage', page);
    emit('pageChange', page);
  }
};

const onRowsPerPageChange = (event) => {
  const newRows = Number(event.target.value);
  emit('update:rowsPerPage', newRows);
  emit('update:currentPage', 1);
  emit('pageChange', 1);
};
</script>
