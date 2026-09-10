<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import PartnerLayout from '@/components/PartnerLayout.vue';
import api from '@/services/api';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Card from 'primevue/card';
import DatePicker from 'primevue/datepicker';

// ── State ────────────────────────────────────────────────────────────────────
const students        = ref([]);
const loading         = ref(true);
const search          = ref('');
const statusFilter    = ref(null);
const dateFrom        = ref(null);
const dateTo          = ref(null);
const totalRecords    = ref(0);
const currentPage     = ref(1);
const rowsPerPage     = ref(15);

const stats = ref({
    total:     0,
    booked:    0,
    not_booked: 0,
    completed: 0,
});

// ── Labels ───────────────────────────────────────────────────────────────────
const t = {
    title:           'Live Speaking Bookings',
    subtitle:        'Track all live speaking session bookings for your students',
    statTotal:       'Total Students',
    statBooked:      'Booked a Session',
    statNotBooked:   'Not Booked Yet',
    statCompleted:   'Completed Interview',
    searchPlaceholder: 'Search by student name or email...',
    filterStatus:    'Filter by Status',
    filterFrom:      'From Date',
    filterTo:        'To Date',
    resetFilters:    'Reset',
    colStudent:      'Student',
    colDate:         'Session Date & Time',
    colTeacher:      'Assigned Teacher',
    colStatus:       'Status',
    emptyMsg:        'No booking records found.',
    loadingMsg:      'Loading live speaking data...',
};

const statusOptions = [
    { label: 'All Statuses', value: null },
    { label: 'Scheduled',    value: 'scheduled' },
    { label: 'Completed',    value: 'completed' },
    { label: 'Cancelled',    value: 'cancelled' },
    { label: 'No Show',      value: 'no_show' },
    { label: 'Not Booked',   value: 'not_booked' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatDateParam = (d) => {
    if (!d) return undefined;
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? undefined : dt.toISOString().split('T')[0];
};

const statusSeverity = (status) => {
    switch (status) {
        case 'scheduled':  return 'info';
        case 'completed':  return 'success';
        case 'cancelled':  return 'danger';
        case 'no_show':    return 'warn';
        default:           return 'secondary';
    }
};

const statusLabel = (status) => {
    if (!status) return 'Not Booked';
    return status.replace('_', ' ').replace(/^\w/, c => c.toUpperCase());
};

// ── Data Fetching ─────────────────────────────────────────────────────────────
const fetchData = async () => {
    loading.value = true;
    try {
        const params = {
            page:      currentPage.value,
            per_page:  rowsPerPage.value,
            search:    search.value.trim() || undefined,
            status:    statusFilter.value  || undefined,
            from_date: formatDateParam(dateFrom.value),
            to_date:   formatDateParam(dateTo.value),
        };
        const res = await api.get('/partner/live-speaking/students', { params });
        const d = res.data;
        students.value    = d.data    ?? d;
        totalRecords.value = d.total  ?? students.value.length;
        // Stats come from the same endpoint summary block if available
        if (d.stats) {
            stats.value = {
                total:      d.stats.total     ?? 0,
                booked:     d.stats.booked    ?? 0,
                not_booked: d.stats.not_booked ?? 0,
                completed:  d.stats.completed ?? 0,
            };
        } else {
            // Derive basic stats from the full list on first page load
            stats.value.total = d.total ?? students.value.length;
        }
    } catch (err) {
        console.error('Failed to load live speaking data', err);
    } finally {
        loading.value = false;
    }
};

let filterTimer = null;
const triggerFilter = () => {
    clearTimeout(filterTimer);
    filterTimer = setTimeout(() => {
        currentPage.value = 1;
        fetchData();
    }, 350);
};

const resetFilters = () => {
    search.value       = '';
    statusFilter.value = null;
    dateFrom.value     = null;
    dateTo.value       = null;
    currentPage.value  = 1;
    fetchData();
};

const onPageChange = (event) => {
    currentPage.value = event.page + 1;
    fetchData();
};

watch([search, statusFilter, dateFrom, dateTo], triggerFilter);

onMounted(fetchData);
</script>

<template>
  <PartnerLayout>
    <div class="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 mt-6 px-4 md:px-8 pb-20">

      <!-- ── Page Header ──────────────────────────────────────────────────── -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6 md:space-y-0 relative overflow-hidden group">
        <div class="absolute right-0 top-0 w-64 h-64 bg-sky-50/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-sky-100/30 transition-all duration-1000"></div>
        <div class="absolute left-0 bottom-0 w-64 h-64 bg-slate-50/30 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl transition-all duration-1000"></div>
        <div class="relative z-10 space-y-1">
          <div class="flex items-center gap-3 mb-1">
            <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0EA5E9] to-[#6366F1] flex items-center justify-center shadow-sm">
              <i class="pi pi-video text-white text-base"></i>
            </div>
            <h1 class="text-3xl font-black text-slate-800 tracking-tight leading-tight">{{ t.title }}</h1>
          </div>
          <p class="text-xs font-bold text-slate-400 max-w-xl leading-relaxed">{{ t.subtitle }}</p>
        </div>
        <div class="relative z-10 flex items-center gap-2 px-4 py-2 bg-sky-50 rounded-xl border border-sky-100">
          <div class="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></div>
          <span class="text-[10px] font-black text-sky-600 uppercase tracking-widest">Live Booking System</span>
        </div>
      </div>

      <!-- ── Stats Cards ──────────────────────────────────────────────────── -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Total Students -->
        <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div class="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
            <i class="pi pi-users text-slate-500 text-lg"></i>
          </div>
          <div>
            <p class="text-2xl font-black text-slate-800">{{ loading ? '—' : stats.total }}</p>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{{ t.statTotal }}</p>
          </div>
        </div>
        <!-- Booked -->
        <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div class="w-12 h-12 rounded-xl bg-sky-50 flex items-center justify-center shrink-0">
            <i class="pi pi-calendar-clock text-sky-500 text-lg"></i>
          </div>
          <div>
            <p class="text-2xl font-black text-sky-600">{{ loading ? '—' : stats.booked }}</p>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{{ t.statBooked }}</p>
          </div>
        </div>
        <!-- Not Booked -->
        <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div class="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
            <i class="pi pi-clock text-amber-500 text-lg"></i>
          </div>
          <div>
            <p class="text-2xl font-black text-amber-600">{{ loading ? '—' : stats.not_booked }}</p>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{{ t.statNotBooked }}</p>
          </div>
        </div>
        <!-- Completed -->
        <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div class="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
            <i class="pi pi-check-circle text-emerald-500 text-lg"></i>
          </div>
          <div>
            <p class="text-2xl font-black text-emerald-600">{{ loading ? '—' : stats.completed }}</p>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{{ t.statCompleted }}</p>
          </div>
        </div>
      </div>

      <!-- ── Table Card ───────────────────────────────────────────────────── -->
      <Card class="shadow-sm border border-slate-100 rounded-2xl overflow-hidden">
        <template #content>
          <!-- Filters Row -->
          <div class="flex flex-wrap items-end gap-3 mb-5 px-1">
            <!-- Search -->
            <div class="flex-1 min-w-[220px]">
              <InputText
                v-model="search"
                :placeholder="t.searchPlaceholder"
                class="w-full text-xs"
              >
                <template #prefix><i class="pi pi-search text-slate-400 text-xs mr-2"></i></template>
              </InputText>
            </div>
            <!-- Status Filter -->
            <div class="min-w-[160px]">
              <Select
                v-model="statusFilter"
                :options="statusOptions"
                optionLabel="label"
                optionValue="value"
                :placeholder="t.filterStatus"
                class="w-full text-xs"
              />
            </div>
            <!-- Date From -->
            <div class="min-w-[140px]">
              <DatePicker v-model="dateFrom" :placeholder="t.filterFrom" dateFormat="yy-mm-dd" class="w-full text-xs" />
            </div>
            <!-- Date To -->
            <div class="min-w-[140px]">
              <DatePicker v-model="dateTo" :placeholder="t.filterTo" dateFormat="yy-mm-dd" class="w-full text-xs" />
            </div>
            <!-- Reset -->
            <Button
              :label="t.resetFilters"
              icon="pi pi-filter-slash"
              severity="secondary"
              outlined
              class="text-xs px-4 py-2 whitespace-nowrap"
              @click="resetFilters"
            />
          </div>

          <!-- Data Table -->
          <DataTable
            :value="students"
            :loading="loading"
            :rows="rowsPerPage"
            :totalRecords="totalRecords"
            lazy
            paginator
            @page="onPageChange"
            dataKey="id"
            :rowsPerPageOptions="[10, 15, 25, 50]"
            paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
            currentPageReportTemplate="Showing {first} to {last} of {totalRecords}"
            responsiveLayout="scroll"
            class="text-sm"
            :emptyMessage="t.emptyMsg"
          >
            <!-- Student -->
            <Column field="student_name" :header="t.colStudent" style="min-width:200px">
              <template #body="{ data }">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full bg-gradient-to-br from-[#0EA5E9] to-[#6366F1] flex items-center justify-center text-white font-black text-xs shrink-0">
                    {{ (data.student_name || data.name || '?').charAt(0).toUpperCase() }}
                  </div>
                  <div>
                    <p class="font-bold text-slate-800 text-xs leading-tight">{{ data.student_name || data.name || '—' }}</p>
                    <p class="text-[10px] text-slate-400 font-medium">{{ data.student_email || data.email || '' }}</p>
                  </div>
                </div>
              </template>
            </Column>

            <!-- Session Date & Time -->
            <Column field="slot_date" :header="t.colDate" style="min-width:180px">
              <template #body="{ data }">
                <template v-if="data.slot_date">
                  <p class="font-bold text-slate-700 text-xs">
                    <i class="pi pi-calendar text-slate-400 mr-1"></i>{{ data.slot_date }}
                  </p>
                  <p class="text-[10px] text-slate-400 mt-0.5">
                    <i class="pi pi-clock text-slate-300 mr-1"></i>{{ data.start_time }} – {{ data.end_time }}
                  </p>
                </template>
                <span v-else class="text-[10px] text-slate-300 font-medium italic">No booking</span>
              </template>
            </Column>

            <!-- Teacher -->
            <Column field="teacher_name" :header="t.colTeacher" style="min-width:160px">
              <template #body="{ data }">
                <span v-if="data.teacher_name" class="text-xs font-medium text-slate-700">
                  <i class="pi pi-user text-slate-400 mr-1"></i>{{ data.teacher_name }}
                </span>
                <span v-else class="text-[10px] text-slate-300 italic">Not assigned</span>
              </template>
            </Column>

            <!-- Status -->
            <Column field="booking_status" :header="t.colStatus" style="min-width:130px">
              <template #body="{ data }">
                <Tag
                  :severity="statusSeverity(data.booking_status)"
                  :value="statusLabel(data.booking_status)"
                  class="text-[10px] font-black uppercase tracking-wide px-2.5"
                />
              </template>
            </Column>
          </DataTable>
        </template>
      </Card>

    </div>
  </PartnerLayout>
</template>

<style scoped>
:deep(.p-datatable .p-datatable-thead > tr > th) {
    background: #F8FAFC;
    color: #64748B;
    font-size: 10px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 12px 16px;
    border-bottom: 2px solid #F1F5F9;
}

:deep(.p-datatable .p-datatable-tbody > tr) {
    border-bottom: 1px solid #F8FAFC;
    transition: background 0.15s;
}

:deep(.p-datatable .p-datatable-tbody > tr:hover) {
    background: #F8FAFC;
}

:deep(.p-datatable .p-datatable-tbody > tr > td) {
    padding: 12px 16px;
    vertical-align: middle;
}

:deep(.p-card .p-card-content) {
    padding: 1.5rem;
}
</style>
