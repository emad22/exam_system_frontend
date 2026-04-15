<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';

import Button from 'primevue/button';
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import Tag from 'primevue/tag';
import ProgressSpinner from 'primevue/progressspinner';

const router = useRouter();

const students = ref([]);
const packages = ref([]);
const loading = ref(true);
const isSaving = ref(false);
const skills = ref([]);

const selectedStudents = ref([]);
const searchQuery = ref('');

const filteredStudents = computed(() => {
    if (!searchQuery.value) return students.value;
    const query = searchQuery.value.toLowerCase();
    return students.value.filter(s => {
        const name = `${s.user?.first_name || ''} ${s.user?.last_name || ''}`.toLowerCase();
        const email = (s.user?.email || '').toLowerCase();
        const code = (s.student_code || '').toLowerCase();
        return name.includes(query) || email.includes(query) || code.includes(query);
    });
});



const fetchStudents = async () => {
    loading.value = true;
    try {
        const res = await api.get('/admin/students');
        students.value = res.data.data || res.data;
    } catch (err) {
        console.error('Failed to load students', err);
    } finally {
        loading.value = false;
    }
};

const fetchSkills = async () => {
    try {
        const res = await api.get('/admin/skills');
        skills.value = res.data;
    } catch (err) {
        console.error('Failed to load skills', err);
    }
};

const fetchPackages = async () => {
    try {
        const res = await api.get('/admin/packages');
        packages.value = res.data;
    } catch (err) {
        console.error('Failed to load packages', err);
    }
};

const openView = (student) => {
    router.push(`/admin/students/${student.id}/show`);
};

const openEdit = (student) => {
    router.push(`/admin/students/${student.id}/edit`);
};

const deleteStudent = async (student) => {
    const fullName = `${student.user?.first_name} ${student.user?.last_name}`;
    if (!confirm(`Are you sure you want to permanently delete student: ${fullName}? This will also delete their User account and all exam history.`)) return;

    try {
        await api.delete(`/admin/students/${student.id}`);
        students.value = students.value.filter(s => s.id !== student.id);
        alert('Student successfully purged from system.');
    } catch (err) {
        alert('Failed to delete student.');
    }
};

const bulkDelete = async () => {
    if (!selectedStudents.value.length) return;
    if (!confirm(`Are you sure you want to delete ${selectedStudents.value.length} selected students? This action cannot be undone.`)) return;

    try {
        const ids = selectedStudents.value.map(s => s.id);
        await api.post('/admin/students/bulk-delete', { ids });
        students.value = students.value.filter(s => !ids.includes(s.id));
        selectedStudents.value = [];
        alert('Selected identities successfully deleted.');
    } catch (err) {
        alert(err.response?.data?.message || 'Failed to bulk delete students.');
    }
};





const getSourceStyles = (source) => {
    switch (source) {
        case 'wordpress': return 'bg-blue-50 text-blue-600 border-blue-100';
        case 'batch': return 'bg-purple-50 text-purple-600 border-purple-100';
        default: return 'bg-slate-50 text-slate-500 border-slate-100';
    }
};

onMounted(() => {
    fetchStudents();
    fetchPackages();
    fetchSkills();
});
</script>

<template>
    <AdminLayout>
        <div class="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            <!-- Header -->
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center space-y-6 md:space-y-0">
                <div>
                    <h1 class="text-3xl font-black text-slate-800 tracking-tight">Students</h1>
                    <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">Lifecycle management
                        for registered entities</p>
                </div>
                <div class="flex items-center space-x-3">
                    <Button v-if="selectedStudents.length > 0" label="Delete Selected" :badge="selectedStudents.length.toString()" badgeSeverity="danger" icon="pi pi-trash" severity="danger" outlined size="small" @click="bulkDelete" />
                    <Button label="Bulk Import (XLS)" icon="pi pi-file-excel" severity="secondary" outlined size="small" @click="router.push('/admin/students/batch')" />
                    <Button label="Register Entity" icon="pi pi-plus" size="small" @click="router.push('/admin/students/create')" />
                </div>
            </div>

            <div v-if="loading" class="flex flex-col items-center justify-center py-32 space-y-4">
                <ProgressSpinner />
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Querying Database...</p>
            </div>

            <Card v-else class="border border-slate-100 shadow-sm rounded-3xl overflow-hidden mt-6">
                <template #content>
                    <DataTable :value="filteredStudents" v-model:selection="selectedStudents" dataKey="id" paginator :rows="10" 
                        class="p-datatable-sm text-sm" responsiveLayout="scroll" :globalFilterFields="['user.first_name', 'user.email', 'student_code']">
                        
                        <template #header>
                            <div class="flex justify-end p-2 pb-4">
                                <span class="relative">
                                    <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                                    <InputText v-model="searchQuery" placeholder="Search identities..." class="pl-10 w-full md:w-80 shadow-sm rounded-xl" />
                                </span>
                            </div>
                        </template>

                        <Column selectionMode="multiple" headerStyle="width: 3rem"></Column>
                        
                        <Column header="Identity Info" style="min-width: 250px">
                            <template #body="{ data }">
                                <div class="flex items-center space-x-4">
                                    <div class="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center font-bold">
                                        {{ data.user?.first_name ? data.user.first_name[0] : 'S' }}
                                    </div>
                                    <div>
                                        <div @click="openView(data)" class="font-bold text-slate-700 hover:text-indigo-600 cursor-pointer">
                                            {{ data.user?.first_name }} {{ data.user?.last_name }}
                                        </div>
                                        <div class="text-xs text-slate-400 mt-0.5">
                                            {{ data.user?.email }} • {{ data.student_code || 'UNCODED' }}
                                        </div>
                                    </div>
                                </div>
                            </template>
                        </Column>

                        <Column header="Subscription" style="min-width: 150px">
                            <template #body="{ data }">
                                <Tag v-if="data.package" :value="data.package.name" severity="info" class="text-[10px] uppercase tracking-wider" />
                                <span v-else class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Custom Asset</span>
                            </template>
                        </Column>

                        <Column header="Logic Mode" style="min-width: 120px">
                            <template #body="{ data }">
                                <Tag :value="data.exam_type" :severity="data.exam_type === 'adult' ? 'success' : 'warning'" class="text-[10px] uppercase tracking-wider mb-1" />
                                <div v-if="data.not_adaptive" class="text-[9px] font-bold text-amber-500 uppercase tracking-tighter">Non-Adaptive</div>
                            </template>
                        </Column>

                        <Column header="Status" style="min-width: 120px">
                            <template #body="{ data }">
                                <Tag :value="data.registration_source" severity="secondary" rounded class="text-[10px] uppercase tracking-wider" />
                            </template>
                        </Column>

                        <Column header="Active" style="min-width: 100px">
                            <template #body="{ data }">
                                <Tag :value="data.user?.is_active ? 'Active' : 'Inactive'" :severity="data.user?.is_active ? 'success' : 'danger'" class="text-[10px] uppercase tracking-wider" />
                            </template>
                        </Column>

                        <Column :exportable="false" style="min-width: 150px">
                            <template #body="{ data }">
                                <div class="flex items-center space-x-2">
                                    <Button icon="pi pi-eye" outlined rounded severity="info" size="small" @click="openView(data)" />
                                    <Button icon="pi pi-pencil" outlined rounded severity="warning" size="small" @click="openEdit(data)" />
                                    <Button icon="pi pi-trash" outlined rounded severity="danger" size="small" @click="deleteStudent(data)" />
                                </div>
                            </template>
                        </Column>

                        <template #empty>
                            <div class="p-8 text-center text-slate-400">No identities found.</div>
                        </template>
                    </DataTable>
                </template>
            </Card>
        </div>

        <!-- Modals Extracted -->
    </AdminLayout>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
    display: none;
}
</style>
