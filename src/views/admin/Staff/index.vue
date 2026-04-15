<script setup>
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

const staff = ref([]);
const loading = ref(true);
const isDeleting = ref(false);
const searchQuery = ref('');

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
        console.error('Failed to load staff', err);
    } finally {
        loading.value = false;
    }
};

const deleteStaff = async (id) => {
    if (!confirm('Are you sure you want to revoke access for this identity?')) return;
    isDeleting.value = true;
    try {
        await api.delete(`/admin/staff/${id}`);
        fetchData();
    } catch (err) {
        alert(err.response?.data?.error || 'Access revocation failed.');
    } finally {
        isDeleting.value = false;
    }
};

const getRoleSeverity = (role) => {
    return roles.find(r => r.value === role)?.severity || 'secondary';
};

const getRoleLabel = (role) => {
    return roles.find(r => r.value === role)?.label || role;
};

onMounted(fetchData);
</script>

<template>
  <AdminLayout>
    <div class="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
        <!-- Header -->
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center space-y-6 md:space-y-0">
            <div>
                 <h1 class="text-3xl font-black text-slate-800 tracking-tight">Staff & Roles</h1>
                 <p class="text-xs font-bold text-slate-500 mt-1">Manage administrators and teachers</p>
            </div>
            <Button label="Add Staff" icon="pi pi-plus" @click="$router.push('/admin/staff/create')" />
        </div>

        <div v-if="loading" class="flex flex-col items-center justify-center py-32 space-y-4">
            <ProgressSpinner />
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Loading staff...</p>
        </div>

        <div v-else>
            <Card v-if="staff.length > 0 || searchQuery" class="border border-slate-100 shadow-sm rounded-3xl overflow-hidden mt-6">
                <template #content>
                    <DataTable :value="filteredStaff" dataKey="id" paginator :rows="10" 
                        class="p-datatable-sm text-sm" responsiveLayout="scroll" :globalFilterFields="['first_name', 'last_name', 'email']">
                        
                        <template #header>
                            <div class="flex justify-end p-2 pb-4">
                                <span class="relative">
                                    <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                                    <InputText v-model="searchQuery" placeholder="Search staff..." class="pl-10 w-full md:w-80 shadow-sm rounded-xl" />
                                </span>
                            </div>
                        </template>

                        <Column header="Name" style="min-width: 250px">
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
                                    </div>
                                </div>
                            </template>
                        </Column>

                        <Column header="Role" style="min-width: 150px">
                            <template #body="{ data }">
                                <Tag :value="getRoleLabel(data.role)" :severity="getRoleSeverity(data.role)" class="text-[10px] uppercase tracking-wider" />
                            </template>
                        </Column>

                        <Column header="Status" style="min-width: 120px">
                            <template #body="{ data }">
                                <Tag :value="data.is_active ? 'Active' : 'Deactivated'" :severity="data.is_active ? 'success' : 'danger'" class="text-[10px] uppercase tracking-wider" />
                            </template>
                        </Column>

                        <Column :exportable="false" style="min-width: 150px">
                            <template #body="{ data }">
                                <div class="flex items-center space-x-2">
                                    <Button icon="pi pi-pencil" outlined rounded severity="warning" size="small" @click="$router.push(`/admin/staff/${data.id}/edit`)" />
                                    <Button icon="pi pi-trash" outlined rounded severity="danger" size="small" @click="deleteStaff(data.id)" />
                                </div>
                            </template>
                        </Column>

                        <template #empty>
                            <div class="p-8 text-center text-slate-400">No matching staff found.</div>
                        </template>
                    </DataTable>
                </template>
            </Card>

            <!-- Empty Global State -->
            <div v-else class="bg-white rounded-[3rem] shadow-[0_32px_120px_rgba(0,0,0,0.02)] border border-slate-100 p-24 text-center group mt-6">
                <div class="w-24 h-24 bg-indigo-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 text-5xl group-hover:rotate-12 transition-transform duration-500 text-indigo-500">
                    <i class="pi pi-shield"></i>
                </div>
                <h3 class="text-3xl font-black text-slate-800 mb-4 tracking-tight uppercase">No Staff Members</h3>
                <p class="text-slate-500 mb-8 max-w-md mx-auto">
                    Add new administrators or teachers to help manage the system. 
                </p>
                <Button label="Add First Staff Member" icon="pi pi-arrow-right" iconPos="right" @click="$router.push('/admin/staff/create')" />
            </div>
        </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
.animate-in {
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}
</style>
