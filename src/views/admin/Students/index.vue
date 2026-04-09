<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';

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

const selectAll = computed({
    get: () => filteredStudents.value.length > 0 && selectedStudents.value.length === filteredStudents.value.length,
    set: (value) => {
        if (value) {
            selectedStudents.value = filteredStudents.value.map(s => s.id);
        } else {
            selectedStudents.value = [];
        }
    }
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
        await api.post('/admin/students/bulk-delete', { ids: selectedStudents.value });
        students.value = students.value.filter(s => !selectedStudents.value.includes(s.id));
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
                <div class="flex items-center space-x-4">
                    <button v-if="selectedStudents.length > 0" @click="bulkDelete"
                        class="bg-rose-50 text-rose-600 border border-rose-200 font-black text-[10px] tracking-widest uppercase px-6 py-3.5 rounded-xl hover:bg-rose-600 hover:text-white transition shadow-sm">
                        Delete Selected ({{ selectedStudents.length }})
                    </button>
                    <router-link to="/admin/students/batch"
                        class="bg-white border border-slate-200 text-slate-500 font-black text-[10px] tracking-widest uppercase px-6 py-3.5 rounded-xl hover:border-indigo-100 hover:text-indigo-600 transition shadow-sm">
                        Bulk Import (XLS)
                    </router-link>
                    <router-link to="/admin/students/create"
                        class="bg-slate-900 text-white font-black text-[10px] tracking-widest uppercase px-8 py-3.5 rounded-xl shadow-lg shadow-slate-200 hover:bg-black active:scale-95 transition-all">
                        Register Entity +
                    </router-link>
                </div>
            </div>

            <div v-if="loading" class="flex flex-col items-center justify-center py-32 space-y-4">
                <div class="w-12 h-12 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Querying Database...</p>
            </div>

            <div v-else
                class="bg-white rounded-[2.5rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden">
                <div class="p-6 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                    <div class="relative w-full max-w-md">
                        <svg class="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" fill="none"
                            stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                        <input v-model="searchQuery" type="text"
                            placeholder="Search identities by name, email, or code..."
                            class="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs uppercase tracking-widest focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all placeholder:text-slate-300 font-bold text-slate-700 shadow-sm">
                    </div>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left">
                        <thead class="bg-slate-50/50 text-slate-300 text-[10px] uppercase font-black tracking-[0.2em]">
                            <tr>
                                <th class="px-6 py-8 w-12 text-center">
                                    <input type="checkbox" v-model="selectAll"
                                        class="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer">
                                </th>
                                <th class="px-6 py-8">IDENTITY INFO</th>
                                <th class="px-10 py-8">SUBSCRIPTION</th>
                                <th class="px-10 py-8">LOGIC_MODE</th>
                                <th class="px-10 py-8">STATUS</th>
                                <th class="px-10 py-8">ACTIVE</th>
                                <th class="px-10 py-8 text-right">OPERATIONS</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50 text-sm">
                            <tr v-for="student in filteredStudents" :key="student.id"
                                class="hover:bg-slate-50/50 transition-colors group"
                                :class="{ 'bg-indigo-50/30': selectedStudents.includes(student.id) }">
                                <td class="px-6 py-6 text-center">
                                    <input type="checkbox" :value="student.id" v-model="selectedStudents"
                                        class="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer">
                                </td>
                                <td class="px-6 py-6">
                                    <div class="flex items-center space-x-5">
                                        <div
                                            class="w-14 h-14 rounded-2xl bg-slate-100 text-slate-300 flex items-center justify-center font-black group-hover:bg-slate-900 group-hover:text-white transition-all transform group-hover:-rotate-3 shadow-sm border border-slate-50">
                                            {{ student.user?.first_name ? student.user.first_name[0] : 'S' }}
                                        </div>
                                        <div>
                                            <div @click="openView(student)"
                                                class="font-black text-slate-700 text-lg tracking-tight leading-tight hover:text-indigo-600 cursor-pointer transition-colors">
                                                {{ student.user?.first_name }} {{ student.user?.last_name }}
                                            </div>
                                            <div class="flex items-center space-x-2 mt-1.5">
                                                <span
                                                    class="text-[10px] font-bold text-slate-300 tracking-wider font-mono">{{
                                                        student.user?.email }}</span>
                                                <span class="w-1 h-1 bg-slate-200 rounded-full"></span>
                                                <span
                                                    class="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{{
                                                        student.student_code || 'UNCODED' }}</span>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td class="px-10 py-6">
                                    <div v-if="student.package"
                                        class="bg-indigo-50 text-indigo-600 border border-indigo-100 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest inline-block shadow-sm">
                                        {{ student.package.name }}
                                    </div>
                                    <div v-else
                                        class="text-[9px] font-black text-slate-300 uppercase tracking-widest pl-2">
                                        Custom_Asset</div>
                                </td>
                                <td class="px-10 py-6">
                                    <div class="flex flex-col space-y-1">
                                        <span
                                            :class="student.exam_type === 'adult' ? 'text-emerald-500' : 'text-orange-500'"
                                            class="text-[10px] font-black uppercase tracking-widest">
                                            {{ student.exam_type }}
                                        </span>
                                        <span v-if="student.not_adaptive"
                                            class="text-[8px] font-bold text-amber-400 uppercase tracking-tighter italic">Non-Adaptive</span>
                                    </div>
                                </td>
                                <td class="px-10 py-6">
                                    <span :class="getSourceStyles(student.registration_source)"
                                        class="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm">
                                        {{ student.registration_source }}
                                    </span>
                                </td>
                                <td class="px-10 py-6">
                                    <span :class="student.user?.is_active ? 'text-emerald-500' : 'text-slate-300'"
                                        class="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm">
                                        {{ student.user?.is_active ? 'Active' : 'Inactive' }}
                                    </span>
                                </td>
                                <td class="px-10 py-6 text-right">
                                    <div class="flex items-center justify-end space-x-2">
                                        <button @click="openView(student)"
                                            class="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center border border-blue-100 shadow-sm"
                                            title="View Details">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"
                                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"
                                                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        </button>
                                        <button @click="openEdit(student)"
                                            class="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 hover:bg-amber-600 hover:text-white transition-all flex items-center justify-center border border-amber-100 shadow-sm"
                                            title="Edit Profile">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"
                                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                        </button>
                                        <button @click="deleteStudent(student)"
                                            class="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center border border-rose-100 shadow-sm"
                                            title="Purge Identity">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3"
                                                    d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                            <tr v-if="filteredStudents.length === 0">
                                <td colspan="7"
                                    class="py-32 text-center text-slate-300 font-black uppercase tracking-[0.2em] text-[10px]">
                                    No identities found matching query.</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Modals Extracted -->
    </AdminLayout>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
    display: none;
}
</style>
