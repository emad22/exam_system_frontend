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
import ProgressSpinner from 'primevue/progressspinner';

const { showAlert, showConfirm } = useModal();

const staff = ref([]);
const loading = ref(true);
const isDeleting = ref(false);
const searchQuery = ref('');

const currentLang = ref(localStorage.getItem('dashboard_lang') || 'ar');

const toggleLang = () => {
    currentLang.value = currentLang.value === 'ar' ? 'en' : 'ar';
    localStorage.setItem('dashboard_lang', currentLang.value);
};

const t = {
    ar: {
        loading: "جاري تحميل الكادر الإداري...",
        title: "أعضاء الكادر الإداري والتعليمي",
        subtitle: "إدارة أدوار ومستخدمي النظام والمشرفين ومراقبي الاختبارات لتيسير العملية التعليمية",
        createBtn: "إضافة موظف جديد",
        searchPlaceholder: "بحث في الكادر الإداري والتعليمي...",
        colName: "الاسم والحساب",
        colRole: "الدور الإداري",
        colStatus: "حالة الحساب",
        colActions: "العمليات",
        partnerLabel: "شريك:",
        roleAdmin: "مدير النظام",
        roleTeacher: "معلم / مراقب",
        roleSupervisor: "مشرف أكاديمي",
        statusActive: "نشط",
        statusDeactivated: "غير نشط",
        emptySearch: "لم يتم العثور على موظفين مطابقين لعملية البحث.",
        emptyTitle: "لا يوجد أعضاء في الكادر حالياً",
        emptySubtitle: "قم بإضافة مدراء، معلمين، أو مشرفين لمساعدتك في إدارة النظام وتنظيم الامتحانات.",
        emptyBtn: "إضافة أول موظف",
        confirmDelete: "هل أنت متأكد من رغبتك في سحب صلاحيات الوصول لهذا الموظف؟",
        deleteSuccess: "تم سحب الصلاحية بنجاح",
        deleteFailed: "فشلت عملية سحب الصلاحيات."
    },
    en: {
        loading: "Loading staff roster...",
        title: "Institution Staff",
        subtitle: "Manage system administrators, editors, teachers, and proctors",
        createBtn: "Add Staff Member",
        searchPlaceholder: "Search staff...",
        colName: "Staff Name & Email",
        colRole: "System Privilege / Role",
        colStatus: "Account Status",
        colActions: "Actions",
        partnerLabel: "Partner:",
        roleAdmin: "Administrator",
        roleTeacher: "Teacher / Proctor",
        roleSupervisor: "Academic Supervisor",
        statusActive: "Active",
        statusDeactivated: "Deactivated",
        emptySearch: "No matching staff found.",
        emptyTitle: "No Staff Members",
        emptySubtitle: "Add new administrators, teachers, or supervisors to help manage the system.",
        emptyBtn: "Add First Staff Member",
        confirmDelete: "Are you sure you want to revoke access for this identity?",
        deleteSuccess: "Access revoked successfully",
        deleteFailed: "Access revocation failed."
    }
};

const filteredStaff = computed(() => {
    if (!searchQuery.value) return staff.value;
    const query = searchQuery.value.toLowerCase();
    return staff.value.filter(user => {
        const name = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
        const email = (user.email || '').toLowerCase();
        return name.includes(query) || email.includes(query);
    });
});

const roles = [
    { value: 'admin', label: 'Administrator', severity: 'info' },
    { value: 'teacher', label: 'Teacher / Proctor', severity: 'success' },
    { value: 'supervisor', label: 'Academic Supervisor', severity: 'secondary' }
];

const fetchData = async () => {
    loading.value = true;
    try {
        const res = await api.get('/admin/staff');
        staff.value = res.data.data || res.data;
    } catch (err) {
        const error = err.response?.data?.message || err.response?.data?.errors || 'Failed to load staff.';
        showAlert(error, 'Error', 'danger');
    } finally {
        loading.value = false;
    }
};

const deleteStaff = async (id) => {
    if (!(await showConfirm(t[currentLang.value].confirmDelete))) return;
    isDeleting.value = true;
    try {
        await api.delete(`/admin/staff/${id}`);
        fetchData();
    } catch (err) {
        showAlert(err.response?.data?.error || t[currentLang.value].deleteFailed);
    } finally {
        isDeleting.value = false;
    }
};

const getRoleSeverity = (role) => {
    return roles.find(r => r.value === role)?.severity || 'secondary';
};

const getRoleLabel = (role) => {
    if (role === 'admin') return t[currentLang.value].roleAdmin;
    if (role === 'teacher') return t[currentLang.value].roleTeacher;
    if (role === 'supervisor') return t[currentLang.value].roleSupervisor;
    return role;
};

onMounted(fetchData);
</script>

<template>
  <AdminLayout>
    <div :class="{ 'arabic-theme': currentLang === 'ar' }" :dir="currentLang === 'ar' ? 'rtl' : 'ltr'" class="w-full">
      <!-- Loading Spinner -->
      <div v-if="loading" class="flex flex-col items-center justify-center py-32 space-y-4">
          <ProgressSpinner />
          <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">{{ t[currentLang].loading }}</p>
      </div>

      <!-- Main Content -->
      <div v-else class="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 mt-6 px-4 md:px-8 pb-20">
          <!-- Premium Standardized Header Card -->
          <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6 md:space-y-0 relative overflow-hidden group">
              <div class="absolute right-0 top-0 w-64 h-64 bg-rose-50/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-rose-100/30 transition-all duration-1000"></div>
              <div class="absolute left-0 bottom-0 w-64 h-64 bg-slate-50/30 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl transition-all duration-1000"></div>
              
              <div class="relative z-10 space-y-2">
                   <h1 class="text-3xl font-black text-slate-800 tracking-tight leading-tight">
                       {{ t[currentLang].title }}
                   </h1>
                   <p class="text-xs font-bold text-slate-400 max-w-xl leading-relaxed">
                       {{ t[currentLang].subtitle }}
                   </p>
              </div>
              
              <div class="flex flex-wrap items-center gap-4 relative z-10">
                   
                   
                   <!-- Primary Action Button (Create) -->
                   <Button :label="t[currentLang].createBtn" icon="pi pi-plus" 
                           class="px-8 py-3 rounded-2xl bg-brand-primary border-none shadow-lg shadow-rose-100 text-xs font-black tracking-wider uppercase transition-all hover:-translate-y-1"
                           @click="$router.push('/admin/staff/create')" />
              </div>
          </div>
          
          <!-- Page Registry (DataTable in Card) -->
          <div v-if="staff.length > 0 || searchQuery">
            <Card class="border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-[2rem] overflow-hidden">
                <template #content>
                    <DataTable :value="filteredStaff" dataKey="id" paginator :rows="10" 
                        class="p-datatable-sm text-sm" responsiveLayout="scroll">
                        
                        <template #header>
                            <div class="flex justify-end p-2 pb-4">
                                <span class="relative">
                                    <i class="pi pi-search absolute text-slate-400 z-10" :class="currentLang === 'ar' ? 'right-3 top-1/2 -translate-y-1/2' : 'left-3 top-1/2 -translate-y-1/2'" />
                                    <InputText v-model="searchQuery" :placeholder="t[currentLang].searchPlaceholder" class="w-full md:w-80 shadow-sm rounded-xl" :class="currentLang === 'ar' ? 'pr-10' : 'pl-10'" />
                                </span>
                            </div>
                        </template>

                        <Column :header="t[currentLang].colName" style="min-width: 250px">
                            <template #body="{ data }">
                                <div class="flex items-center" :class="currentLang === 'ar' ? 'space-x-reverse space-x-4' : 'space-x-4'">
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
                                            {{ t[currentLang].partnerLabel }} {{ data.partner.partner_name }}
                                        </div>
                                    </div>
                                </div>
                            </template>
                        </Column>

                        <Column :header="t[currentLang].colRole" style="min-width: 150px">
                            <template #body="{ data }">
                                <Tag :value="getRoleLabel(data.role)" :severity="getRoleSeverity(data.role)" class="text-[10px] uppercase tracking-wider font-extrabold" />
                            </template>
                        </Column>

                        <Column :header="t[currentLang].colStatus" style="min-width: 120px">
                            <template #body="{ data }">
                                <Tag :value="data.is_active ? t[currentLang].statusActive : t[currentLang].statusDeactivated" :severity="data.is_active ? 'success' : 'danger'" class="text-[10px] uppercase tracking-wider font-extrabold" />
                            </template>
                        </Column>

                        <Column :header="t[currentLang].colActions" :exportable="false" style="min-width: 150px">
                            <template #body="{ data }">
                                <div class="flex items-center space-x-2" :class="currentLang === 'ar' ? 'space-x-reverse' : ''">
                                    <Button icon="pi pi-pencil" outlined rounded severity="warning" size="small" @click="$router.push(`/admin/staff/${data.id}/edit`)" />
                                    <Button icon="pi pi-trash" outlined rounded severity="danger" size="small" @click="deleteStaff(data.id)" />
                                </div>
                            </template>
                        </Column>

                        <template #empty>
                            <div class="p-8 text-center text-slate-400 font-medium">{{ t[currentLang].emptySearch }}</div>
                        </template>
                    </DataTable>
                </template>
            </Card>
          </div>

          <!-- Empty Global State -->
          <div v-else class="bg-white rounded-[3rem] shadow-[0_32px_120px_rgba(0,0,0,0.02)] border border-slate-100 p-24 text-center group mt-6">
              <div class="w-24 h-24 bg-rose-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 text-5xl group-hover:rotate-12 transition-transform duration-500 text-brand-accent">
                  <i class="pi pi-shield"></i>
              </div>
              <h3 class="text-3xl font-black text-slate-800 mb-4 tracking-tight">{{ t[currentLang].emptyTitle }}</h3>
              <p class="text-slate-500 mb-8 max-w-md mx-auto leading-relaxed">
                  {{ t[currentLang].emptySubtitle }}
              </p>
              <Button :label="t[currentLang].emptyBtn" icon="pi-arrow-right" iconPos="right" @click="$router.push('/admin/staff/create')" />
          </div>
      </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');

.arabic-theme {
    font-family: 'Cairo', system-ui, -apple-system, sans-serif !important;
}

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

.arabic-theme :deep(.p-datatable-thead > tr > th) {
    text-align: right !important;
}
.arabic-theme :deep(.p-datatable-tbody > tr > td) {
    text-align: right !important;
}

:deep(.p-datatable-tbody > tr:hover) {
    background: #fbfcfe;
}
</style>
