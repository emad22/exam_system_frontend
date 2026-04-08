<script setup>
import { ref, onMounted } from 'vue';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';

const staff = ref([]);
const loading = ref(true);
const showModal = ref(false);
const editMode = ref(false);
const isSubmitting = ref(false);
const errorMsg = ref('');

const form = ref({
    id: null,
    name: '',
    email: '',
    password: '',
    role: 'teacher'
});

const roles = [
    { value: 'admin', label: 'Administrator', style: 'bg-blue-50 text-blue-600 border-blue-100' },
    { value: 'teacher', label: 'Teacher / Proctor', style: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
    { value: 'supervisor', label: 'Academic Supervisor', style: 'bg-purple-50 text-purple-600 border-purple-100' }
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

const openAddModal = () => {
    editMode.value = false;
    form.value = { id: null, name: '', email: '', password: '', role: 'teacher' };
    showModal.value = true;
};

const openEditModal = (user) => {
    editMode.value = true;
    form.value = { ...user, password: '' };
    showModal.value = true;
};

const saveStaff = async () => {
    isSubmitting.value = true;
    errorMsg.value = '';
    try {
        if (editMode.value) {
            await api.patch(`/admin/staff/${form.value.id}`, form.value);
        } else {
            await api.post('/admin/staff', form.value);
        }
        showModal.value = false;
        fetchData();
    } catch (err) {
        errorMsg.value = err.response?.data?.message || 'Failed to save staff identity.';
    } finally {
        isSubmitting.value = false;
    }
};

const deleteStaff = async (id) => {
    if (!confirm('Are you sure you want to revoke access for this identity?')) return;
    try {
        await api.delete(`/admin/staff/${id}`);
        fetchData();
    } catch (err) {
        alert(err.response?.data?.error || 'Access revocation failed.');
    }
};

const getRoleStyle = (role) => {
    return roles.find(r => r.value === role)?.style || 'bg-slate-50 text-slate-400 border-slate-100';
};

const getRoleLabel = (role) => {
    return roles.find(r => r.value === role)?.label || role;
};

onMounted(fetchData);
</script>

<template>
  <AdminLayout>
    <div class="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <!-- Header -->
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center space-y-6 md:space-y-0">
            <div>
                 <h1 class="text-3xl font-black text-slate-800 tracking-tight">Staff & Roles</h1>
                 <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">Manage administrators and teachers</p>
            </div>
            <button @click="openAddModal" class="bg-indigo-600 text-white font-black text-[10px] tracking-widest uppercase px-8 py-3.5 rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all">
                Add Staff +
            </button>
        </div>

        <div v-if="loading" class="flex flex-col items-center justify-center py-32 space-y-4">
            <div class="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Loading staff...</p>
        </div>

        <div v-else>
            <div v-if="staff.length > 0" class="bg-white rounded-[2.5rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left">
                        <thead class="bg-slate-50/50 text-slate-300 text-[10px] uppercase font-black tracking-[0.2em]">
                            <tr>
                                <th class="px-10 py-8">NAME</th>
                                <th class="px-10 py-8">ROLE</th>
                                <th class="px-10 py-8">STATUS</th>
                                <th class="px-10 py-8 text-right">ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50 text-sm font-sans">
                            <tr v-for="user in staff" :key="user.id" class="hover:bg-slate-50/50 transition-colors group">
                                <td class="px-10 py-6">
                                    <div class="flex items-center space-x-4">
                                         <div class="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 font-black group-hover:bg-indigo-600 group-hover:text-white transition-all transform group-hover:scale-110">
                                              {{ user.name[0] }}
                                         </div>
                                         <div>
                                              <div class="font-black text-slate-700 tracking-tight leading-none mb-1 uppercase text-sm">{{ user.name }}</div>
                                              <div class="text-[10px] text-slate-300 font-bold uppercase tracking-widest">{{ user.email }}</div>
                                         </div>
                                    </div>
                                </td>
                                <td class="px-10 py-6">
                                    <span :class="getRoleStyle(user.role)" 
                                          class="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border">
                                        {{ getRoleLabel(user.role) }}
                                    </span>
                                </td>
                                <td class="px-10 py-6">
                                     <div class="flex items-center space-x-2">
                                          <div class="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                          <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Active</span>
                                     </div>
                                </td>
                                <td class="px-10 py-6 text-right space-x-3">
                                    <button @click="openEditModal(user)" class="bg-white border border-slate-200 text-slate-500 font-black text-[9px] tracking-widest uppercase px-5 py-2.5 rounded-xl hover:border-indigo-100 hover:text-indigo-600 transition shadow-sm active:scale-95">
                                        EDIT
                                    </button>
                                    <button @click="deleteStaff(user.id)" class="bg-rose-50 border border-rose-100 text-rose-400 font-black text-[9px] tracking-widest uppercase px-5 py-2.5 rounded-xl hover:bg-rose-500 hover:text-white transition active:scale-95">
                                        DELETE
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Empty State -->
            <div v-else class="bg-white rounded-[3rem] shadow-[0_32px_120px_rgba(0,0,0,0.02)] border border-slate-100 p-24 text-center group">
                <div class="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 text-5xl group-hover:rotate-12 transition-transform duration-500">🛡️</div>
                <h3 class="text-3xl font-black text-slate-800 mb-4 tracking-tight uppercase">No Staff Members</h3>
                <p class="text-slate-400 font-medium max-w-sm mx-auto mb-12 text-sm leading-relaxed italic">
                    Add new administrators or teachers to help manage the system. 
                </p>
                <button @click="openAddModal" class="inline-block bg-indigo-600 text-white font-black py-5 px-12 rounded-2xl shadow-xl shadow-indigo-100 hover:shadow-indigo-200 hover:bg-indigo-700 transition transform hover:-translate-y-1 active:scale-95 uppercase tracking-widest text-xs">
                    Add First Staff Member ➜
                </button>
            </div>
        </div>

        <!-- Provision Modal (Glassmorphic) -->
        <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div class="bg-white rounded-[3.5rem] border border-slate-100 shadow-[0_48px_140px_rgba(0,0,0,0.2)] w-full max-w-xl overflow-hidden animate-in zoom-in duration-300">
                <div class="p-10 md:p-14">
                    <div class="flex justify-between items-start mb-12">
                         <div>
                              <h3 class="text-2xl font-black text-slate-800 tracking-tight">{{ editMode ? 'Edit Staff' : 'Add Staff' }}</h3>
                              <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">Account details</p>
                         </div>
                         <button @click="showModal = false" class="text-slate-300 hover:text-rose-500 transition-colors text-2xl font-black">✕</button>
                    </div>

                    <form @submit.prevent="saveStaff" class="space-y-8">
                        <div v-if="errorMsg" class="bg-rose-50 text-rose-500 p-4 rounded-xl text-[10px] font-black uppercase tracking-widest border border-rose-100">
                            ⚠️ {{ errorMsg }}
                        </div>

                        <div>
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-4">Full Name</label>
                            <input v-model="form.name" type="text" required class="premium-input uppercase" placeholder="e.g. John Doe">
                        </div>

                        <div>
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-4">Email Address</label>
                            <input v-model="form.email" type="email" required class="premium-input font-bold tracking-wide" placeholder="email@example.com">
                        </div>

                        <div>
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-4">Role</label>
                            <select v-model="form.role" required class="premium-input text-[11px] uppercase tracking-widest cursor-pointer">
                                <option v-for="r in roles" :key="r.value" :value="r.value">{{ r.label }}</option>
                            </select>
                        </div>

                        <div>
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-4">Password {{ editMode ? '(Optional)' : '' }}</label>
                            <input v-model="form.password" :required="!editMode" type="password" class="premium-input font-mono" placeholder="••••••••">
                            <p v-if="editMode" class="text-[9px] text-slate-300 mt-2 italic font-bold">Leave blank to keep password same.</p>
                        </div>

                        <div class="pt-8 border-t border-slate-50 flex justify-end">
                            <button type="submit" :disabled="isSubmitting" 
                                    class="bg-indigo-600 text-white font-black py-4 px-12 rounded-2xl shadow-xl shadow-indigo-100 hover:shadow-indigo-300 active:scale-95 transition-all text-xs uppercase tracking-[0.2em]">
                                {{ isSubmitting ? 'SAVING...' : (editMode ? 'UPDATE ➜' : 'SAVE ➜') }}
                            </button>
                        </div>
                    </form>
                </div>
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
