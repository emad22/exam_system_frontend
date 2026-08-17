<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import PartnerLayout from '@/components/PartnerLayout.vue';
import api from '@/services/api';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import InputText from 'primevue/inputtext';
import DatePicker from 'primevue/datepicker';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Card from 'primevue/card';
import ProgressSpinner from 'primevue/progressspinner';

const router = useRouter();
const students = ref([]);
const loading = ref(true);
const search = ref('');
const dateFrom = ref(null);
const dateTo = ref(null);

const totalRecords = ref(0);
const currentPage = ref(1);
const rowsPerPage = ref(15);
const rowsPerPageOptions = [10, 15, 25, 50];

const formatDateParam = (dateVal) => {
    if (!dateVal) return undefined;
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return undefined;
    return d.toISOString().split('T')[0];
};

const fetchStudents = async () => {
    loading.value = true;
    try {
        const params = {
            page: currentPage.value,
            per_page: rowsPerPage.value,
            search: search.value ? search.value.trim() : undefined,
            from_date: formatDateParam(dateFrom.value),
            to_date: formatDateParam(dateTo.value)
        };
        const res = await api.get('/partner/students', { params });
        if (res.data.data) {
            students.value = res.data.data;
            totalRecords.value = res.data.total;
        } else {
            students.value = res.data;
            totalRecords.value = Array.isArray(res.data) ? res.data.length : 0;
        }
    } catch (err) {
        console.error('Failed to load partner students', err);
    } finally {
        loading.value = false;
    }
};

let filterTimeout = null;
const triggerFilter = () => {
    clearTimeout(filterTimeout);
    filterTimeout = setTimeout(() => {
        currentPage.value = 1;
        fetchStudents();
    }, 350);
};

watch([search, dateFrom, dateTo], () => {
    triggerFilter();
});

const resetFilters = () => {
    search.value = '';
    dateFrom.value = null;
    dateTo.value = null;
};

const onPageChange = (event) => {
    currentPage.value = event.page + 1;
    rowsPerPage.value = event.rows;
    fetchStudents();
};

const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toISOString().split('T')[0];
};

onMounted(() => {
    fetchStudents();
});

const totalPages = computed(() => Math.ceil(totalRecords.value / rowsPerPage.value) || 1);

const goToReportsForStudent = (student) => {
    const studentName = `${student.user?.first_name || ''} ${student.user?.last_name || ''}`.trim();
    router.push({
        name: 'partner.reports',
        query: { search: studentName || student.user?.username }
    });
};
</script>

<template>
  <PartnerLayout>
    <div class="w-full space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000">
        
        <!-- Header Section -->
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6 md:space-y-0 relative overflow-hidden group">
            <div class="absolute right-0 top-0 w-64 h-64 bg-rose-50/30 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-rose-100/40 transition-all duration-1000"></div>
            
            <div class="relative z-10 space-y-1">
                 <div class="flex items-center gap-2 text-xs font-extrabold text-brand-primary uppercase tracking-wider">
                      <i class="pi pi-users text-brand-accent"></i>
                      <span>Student Management</span>
                 </div>
                 <h1 class="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">Student Directory</h1>
                 <p class="text-xs font-bold text-slate-400">View and manage all registered students under your partner organization</p>
            </div>
            
            <div class="flex items-center gap-4 relative z-10">
                 <div class="flex flex-col items-end px-6 border-r border-slate-100">
                     <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Enrolled</span>
                     <span class="text-2xl font-black text-slate-800 tracking-tight">{{ totalRecords }}</span>
                 </div>
                 <Button label="View Reports" icon="pi pi-chart-bar" outlined severity="secondary" 
                         class="text-xs font-black uppercase tracking-wider px-6 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300" 
                         @click="router.push({ name: 'partner.reports' })" />
            </div>
        </div>

        <!-- Search & Date Filter Bar Card -->
        <div class="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <!-- Search Input (ID, Name, Email, Username, Code) -->
            <div class="relative flex-1 min-w-[280px]">
                <i class="pi pi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                <InputText v-model="search" placeholder="Search by ID, Name, Email, Username, Code..." 
                           class="w-full pl-11 pr-4 py-3 text-xs font-bold rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white text-slate-800 shadow-sm h-12" />
            </div>

            <!-- Date Range Filters -->
            <div class="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                <div class="w-full sm:w-40 shrink-0">
                    <DatePicker v-model="dateFrom" placeholder="From Date" dateFormat="yy-mm-dd" showIcon iconDisplay="input"
                                class="w-full rounded-2xl border-slate-100 bg-slate-50/50 hover:bg-white focus:bg-white text-xs font-bold shadow-sm h-12" />
                </div>

                <div class="w-full sm:w-40 shrink-0">
                    <DatePicker v-model="dateTo" placeholder="To Date" dateFormat="yy-mm-dd" showIcon iconDisplay="input"
                                class="w-full rounded-2xl border-slate-100 bg-slate-50/50 hover:bg-white focus:bg-white text-xs font-bold shadow-sm h-12" />
                </div>

                <Button v-if="search || dateFrom || dateTo" 
                        icon="pi pi-filter-slash" label="Reset" 
                        text severity="secondary" 
                        class="text-xs font-bold rounded-xl h-12 px-4 hover:bg-slate-100" 
                        @click="resetFilters" />
            </div>
            
            <div class="w-full flex justify-end text-xs font-bold text-slate-400 pt-1 border-t border-slate-50">
                <span>Showing {{ students.length }} of {{ totalRecords }} students</span>
            </div>
        </div>

        <!-- Students Table Card -->
        <Card class="border border-slate-100 shadow-sm rounded-[2.5rem] overflow-hidden">
            <template #content>
                <div v-if="loading" class="flex flex-col items-center justify-center py-28 space-y-4">
                    <ProgressSpinner />
                    <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Student Directory...</p>
                </div>

                <div v-else class="overflow-x-auto">
                    <DataTable :value="students" class="p-datatable-sm text-sm" responsiveLayout="scroll">
                        
                        <!-- Student Column -->
                        <Column header="Student" style="min-width: 280px">
                            <template #body="{ data }">
                                <div class="flex items-center space-x-4 py-3 group">
                                     <div class="w-11 h-11 rounded-2xl bg-slate-50 text-slate-500 flex items-center justify-center border border-slate-100 shadow-sm transition-all group-hover:bg-brand-primary group-hover:text-white group-hover:rotate-6">
                                         <i class="pi pi-user text-lg"></i>
                                     </div>
                                     <div class="space-y-1">
                                          <div class="font-black text-slate-800 tracking-tight leading-none group-hover:text-brand-primary transition-colors">
                                              {{ data.user ? (data.user.first_name + ' ' + data.user.last_name) : 'Student #' + data.id }}
                                          </div>
                                          <div class="text-[11px] font-bold text-slate-400">
                                              {{ data.user?.username ? '@' + data.user.username : '' }} • {{ data.user?.email || 'No email' }}
                                          </div>
                                     </div>
                                </div>
                            </template>
                        </Column>

                        <!-- Student Code / ID -->
                        <Column header="Student ID / Code" style="min-width: 160px">
                            <template #body="{ data }">
                                <div class="flex flex-col space-y-0.5">
                                    <span class="text-xs font-black text-slate-700 font-mono">
                                        {{ data.student_code || '#' + data.id }}
                                    </span>
                                    <span v-if="data.institution_code" class="text-[10px] font-bold text-slate-400">
                                        Inst: {{ data.institution_code }}
                                    </span>
                                </div>
                            </template>
                        </Column>

                        <!-- Package / Category -->
                        <Column header="Package / Model" style="min-width: 180px">
                            <template #body="{ data }">
                                <div class="flex flex-col space-y-1">
                                    <span class="text-xs font-extrabold text-slate-700">{{ data.package?.name || 'Standard Package' }}</span>
                                    <span v-if="data.category?.name" class="text-[10px] font-bold text-slate-400">{{ data.category.name }}</span>
                                </div>
                            </template>
                        </Column>

                        <!-- Attempts Count -->
                        <Column header="Attempts" style="min-width: 140px" class="text-center">
                            <template #body="{ data }">
                                <div class="flex items-center space-x-2">
                                    <span class="text-xs font-black text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
                                        {{ data.attempts_count ?? data.attempts?.length ?? 0 }} Total
                                    </span>
                                    <span v-if="data.completed_attempts_count > 0" class="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                                        {{ data.completed_attempts_count }} Completed
                                    </span>
                                </div>
                            </template>
                        </Column>

                        <!-- Registered Date -->
                        <Column header="Registered Date" style="min-width: 140px">
                            <template #body="{ data }">
                                <div class="flex items-center gap-1.5 text-xs font-bold text-slate-600 font-mono">
                                    <i class="pi pi-calendar text-slate-400 text-xs"></i>
                                    <span>{{ formatDate(data.registration_date || data.created_at) }}</span>
                                </div>
                            </template>
                        </Column>

                        <!-- Status -->
                        <Column header="Status" style="width: 120px">
                            <template #body="{ data }">
                                <Tag :value="data.user?.is_active !== false ? 'Active' : 'Inactive'" 
                                     :severity="data.user?.is_active !== false ? 'success' : 'secondary'"
                                     class="text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-xl border-none shadow-sm" />
                            </template>
                        </Column>

                        <!-- Actions -->
                        <Column header="Actions" style="width: 140px" class="text-right">
                            <template #body="{ data }">
                                <Button label="Reports" icon="pi pi-chart-bar" size="small" text severity="info"
                                        class="text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-slate-50"
                                        @click="goToReportsForStudent(data)" />
                            </template>
                        </Column>

                        <!-- Empty State -->
                        <template #empty>
                            <div class="py-20 text-center space-y-3">
                                 <div class="text-4xl opacity-20">👥</div>
                                 <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">No students found matching your criteria.</p>
                            </div>
                        </template>

                    </DataTable>

                    <!-- Pagination -->
                    <div v-if="totalRecords > rowsPerPage" class="p-6 border-t border-slate-50 flex items-center justify-between">
                        <div class="text-xs font-bold text-slate-400">
                            Page {{ currentPage }} of {{ totalPages }}
                        </div>
                        <div class="flex items-center space-x-2">
                            <Button icon="pi pi-chevron-left" text :disabled="currentPage <= 1" @click="currentPage--; fetchStudents()" />
                            <Button icon="pi pi-chevron-right" text :disabled="currentPage >= totalPages" @click="currentPage++; fetchStudents()" />
                        </div>
                    </div>
                </div>
            </template>
        </Card>
    </div>
  </PartnerLayout>
</template>

<style scoped>
.animate-in {
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}
:deep(.p-datatable-thead > tr > th) {
    background: #fbfcfe;
    border-bottom: 2px solid #f1f5f9;
    padding: 1.25rem 1rem;
    color: #94a3b8;
    font-size: 10px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.15em;
}
:deep(.p-datatable-tbody > tr:hover) {
    background: #fbfcfe;
}
:deep(.p-card .p-card-header) {
    background: transparent;
}
</style>
