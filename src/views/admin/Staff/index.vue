<script setup>
import { useModal } from '@/composables/useModal';
import { ref, onMounted, computed } from 'vue';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';

import Button from 'primevue/button';
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import Tag from 'primevue/tag';
import Select from 'primevue/select';
import DatePicker from 'primevue/datepicker';
import CardListSkeleton from '@/components/skeletons/CardListSkeleton.vue';
import CustomPagination from '@/components/CustomPagination.vue';
import FilterBar from '@/components/FilterBar.vue';
import { watch } from 'vue';

const { showAlert, showConfirm } = useModal();

const staff = ref([]);
const partners = ref([]);
const selectedPartner = ref(null);
const dateFrom = ref(null);
const dateTo = ref(null);
const loading = ref(true);
const isDeleting = ref(false);
const searchQuery = ref('');

const labels = {
    loading: "Loading staff...",
    title: "Staff & Roles",
    subtitle: "Manage administrators, teachers, and proctors",
    createBtn: "Add Staff Member",
    searchPlaceholder: "Search staff...",
    colName: "Name & Email",
    colRole: "Role",
    colStatus: "Status",
    colActions: "Actions",
    partnerLabel: "Partner:",
    roleAdmin: "Administrator",
    roleTeacher: "Teacher / Proctor",
    roleSupervisor: "Academic Supervisor",
    statusActive: "Active",
    statusDeactivated: "Deactivated",
    emptySearch: "No matching staff found.",
    emptyTitle: "No Staff Members",
    emptySubtitle: "Add administrators, teachers, or supervisors to help manage the system.",
    emptyBtn: "Add First Staff Member",
    confirmDelete: "Are you sure you want to revoke access for this user?",
    deleteSuccess: "Access revoked successfully",
    deleteFailed: "Access revocation failed."
};

const filteredStaff = computed(() => {
    let result = staff.value;

    if (selectedPartner.value) {
        result = result.filter(u => u.partner_id === selectedPartner.value || u.partner?.id === selectedPartner.value);
    }

    if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase();
        result = result.filter(user => {
            const name = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
            const email = (user.email || '').toLowerCase();
            return name.includes(query) || email.includes(query);
        });
    }

    if (dateFrom.value) {
        const fromTime = new Date(dateFrom.value).setHours(0, 0, 0, 0);
        result = result.filter(u => {
            if (!u.created_at) return false;
            return new Date(u.created_at).getTime() >= fromTime;
        });
    }

    if (dateTo.value) {
        const toTime = new Date(dateTo.value).setHours(23, 59, 59, 999);
        result = result.filter(u => {
            if (!u.created_at) return false;
            return new Date(u.created_at).getTime() <= toTime;
        });
    }

    return result;
});

const currentPage = ref(1);
const rowsPerPage = ref(15);

watch([searchQuery, selectedPartner, dateFrom, dateTo], () => {
    currentPage.value = 1;
});

const resetFilters = () => {
    searchQuery.value = '';
    selectedPartner.value = null;
    dateFrom.value = null;
    dateTo.value = null;
    currentPage.value = 1;
};

const paginatedStaff = computed(() => {
    const start = (currentPage.value - 1) * rowsPerPage.value;
    return filteredStaff.value.slice(start, start + rowsPerPage.value);
});

const roles = [
    { value: 'admin', label: 'Administrator', severity: 'info' },
    { value: 'teacher', label: 'Teacher / Proctor', severity: 'success' },
    { value: 'supervisor', label: 'Academic Supervisor', severity: 'secondary' }
];

const fetchData = async () => {
    loading.value = true;
    try {
        const [staffRes, partnersRes] = await Promise.all([
            api.get('/admin/staff'),
            api.get('/admin/partners/active').catch(() => api.get('/admin/partners')).catch(() => ({ data: [] }))
        ]);
        staff.value = staffRes.data.data || staffRes.data;
        partners.value = partnersRes.data || [];
    } catch (err) {
        const error = err.response?.data?.message || err.response?.data?.errors || 'Failed to load staff.';
        showAlert(error, 'Error', 'danger');
    } finally {
        loading.value = false;
    }
};

const deleteStaff = async (id) => {
    if (!(await showConfirm(labels.confirmDelete))) return;
    isDeleting.value = true;
    try {
        await api.delete(`/admin/staff/${id}`);
        fetchData();
    } catch (err) {
        showAlert(err.response?.data?.error || labels.deleteFailed);
    } finally {
        isDeleting.value = false;
    }
};

const getRoleSeverity = (role) => {
    return roles.find(r => r.value === role)?.severity || 'secondary';
};

const getRoleLabel = (role) => {
    if (role === 'admin') return labels.roleAdmin;
    if (role === 'teacher') return labels.roleTeacher;
    if (role === 'supervisor') return labels.roleSupervisor;
    return role;
};

onMounted(fetchData);
</script>

<template>
  <AdminLayout>
    <div dir="ltr" class="w-full">
      <!-- Loading Skeleton -->
      <div v-if="loading" class="mt-6 px-4 md:px-8">
          <CardListSkeleton :rows="8" />
      </div>

      <!-- Main Content -->
      <div v-else class="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 mt-6 px-4 md:px-8 pb-20">
          <!-- Premium Standardized Header Card -->
          <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6 md:space-y-0 relative overflow-hidden group">
              <div class="absolute right-0 top-0 w-64 h-64 bg-rose-50/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-rose-100/30 transition-all duration-1000"></div>
              <div class="absolute left-0 bottom-0 w-64 h-64 bg-slate-50/30 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl transition-all duration-1000"></div>
              
              <div class="relative z-10 space-y-2">
                   <h1 class="text-3xl font-black text-slate-800 tracking-tight leading-tight">
                       {{ labels.title }}
                   </h1>
                   <p class="text-xs font-bold text-slate-400 max-w-xl leading-relaxed">
                       {{ labels.subtitle }}
                   </p>
              </div>
              
              <div class="flex flex-wrap items-center gap-4 relative z-10">
                   
                   <!-- Primary Action Button (Create) -->
                   <Button :label="labels.createBtn" icon="pi pi-plus" 
                           class="px-8 py-3 rounded-2xl bg-brand-primary border-none shadow-lg shadow-rose-100 text-xs font-black tracking-wider uppercase transition-all hover:-translate-y-1"
                           @click="$router.push('/admin/staff/create')" />
              </div>
          </div>
          
          <!-- Filter Bar -->
          <FilterBar
              v-model="searchQuery"
              :search-placeholder="labels.searchPlaceholder"
              v-model:dateFrom="dateFrom"
              v-model:dateTo="dateTo"
              :active-count="selectedPartner ? 1 : 0"
              @reset="resetFilters"
          >
              <div class="hidden sm:block h-8 w-px bg-slate-100 shrink-0" />
              <Select v-model="selectedPartner" :options="partners" optionLabel="partner_name" optionValue="id"
                  placeholder="All Partners" showClear 
                  class="!h-11 !rounded-2xl !border-slate-100 !bg-slate-50 !text-xs !font-bold min-w-[180px] hover:!border-brand-primary/30 transition-all flex items-center" />
          </FilterBar>

          <!-- Page Registry (DataTable in Card) -->
          <div v-if="staff.length > 0 || searchQuery || selectedPartner || dateFrom || dateTo">
            <Card class="border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-[2rem] overflow-hidden">
                <template #content>
                    <DataTable :value="paginatedStaff" dataKey="id"
                        class="p-datatable-sm text-sm" responsiveLayout="scroll">

                        <Column :header="labels.colName" style="min-width: 250px">
                            <template #body="{ data }">
                                <div class="flex items-center space-x-4">
                                    <div class="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center font-bold">
                                        {{ (data.first_name || 'S')[0] }}
                                    </div>
                                    <div>
                                        <div class="font-bold text-slate-700">
                                            {{ data.first_name }} {{ data.last_name }}
                                        </div>
                                        <div class="text-xs text-slate-400 mt-0.5">
                                            {{ data.email }}
                                        </div>
                                        <div v-if="data.partner" class="text-[9px] font-black text-brand-primary mt-1 uppercase tracking-tighter">
                                            {{ labels.partnerLabel }} {{ data.partner.partner_name }}
                                        </div>
                                    </div>
                                </div>
                            </template>
                        </Column>

                        <Column :header="labels.colRole" style="min-width: 150px">
                            <template #body="{ data }">
                                <Tag :value="getRoleLabel(data.role)" :severity="getRoleSeverity(data.role)" class="text-[10px] uppercase tracking-wider font-extrabold" />
                            </template>
                        </Column>

                        <Column :header="labels.colStatus" style="min-width: 120px">
                            <template #body="{ data }">
                                <Tag :value="data.is_active ? labels.statusActive : labels.statusDeactivated" :severity="data.is_active ? 'success' : 'danger'" class="text-[10px] uppercase tracking-wider font-extrabold" />
                            </template>
                        </Column>

                        <Column :header="labels.colActions" :exportable="false" style="min-width: 150px">
                            <template #body="{ data }">
                                <div class="flex items-center space-x-2">
                                    <Button icon="pi pi-pencil" outlined rounded severity="warning" size="small" @click="$router.push(`/admin/staff/${data.id}/edit`)" />
                                    <Button icon="pi pi-trash" outlined rounded severity="danger" size="small" @click="deleteStaff(data.id)" />
                                </div>
                            </template>
                        </Column>

                        <template #empty>
                            <div class="p-8 text-center text-slate-400 font-medium">{{ labels.emptySearch }}</div>
                        </template>
                    </DataTable>

                    <!-- Pagination -->
                    <CustomPagination :totalRecords="filteredStaff.length" v-model:currentPage="currentPage" v-model:rowsPerPage="rowsPerPage" />
                </template>
            </Card>
          </div>

          <!-- Empty Global State -->
          <div v-else class="bg-white rounded-[3rem] shadow-[0_32px_120px_rgba(0,0,0,0.02)] border border-slate-100 p-24 text-center group mt-6">
              <div class="w-24 h-24 bg-rose-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 text-5xl group-hover:rotate-12 transition-transform duration-500 text-brand-accent">
                  <i class="pi pi-shield"></i>
              </div>
              <h3 class="text-3xl font-black text-slate-800 mb-4 tracking-tight">{{ labels.emptyTitle }}</h3>
              <p class="text-slate-500 mb-8 max-w-md mx-auto leading-relaxed">
                  {{ labels.emptySubtitle }}
              </p>
              <Button :label="labels.emptyBtn" icon="pi-arrow-right" iconPos="right" @click="$router.push('/admin/staff/create')" />
          </div>
      </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');

.animate-in {
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}

:deep(.p-datatable-thead > tr > th) {
    background: #fbfcfe;
    border-bottom: 2px solid #f1f5f9;
    padding: 1.25rem 1rem;
    color: #94a3b8;
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.1em;
}


:deep(.p-datatable-tbody > tr:hover) {
    background: #fbfcfe;
}
</style>
