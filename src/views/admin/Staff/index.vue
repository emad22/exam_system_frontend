<script setup>
import { ref, onMounted, computed } from 'vue';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';

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
    <div class="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
        <!-- Header -->
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center space-y-6 md:space-y-0">
            <div>
                 <h1 class="text-3xl font-black text-slate-800 tracking-tight">Staff & Roles</h1>
                 <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">Manage administrators and teachers</p>
            </div>
            <router-link to="/admin/staff/create" class="bg-indigo-600 text-white font-black text-[10px] tracking-widest uppercase px-8 py-3.5 rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all">
                Add Staff +
            </router-link>
        </div>

        <div v-if="loading" class="flex flex-col items-center justify-center py-32 space-y-4">
            <div class="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Loading staff...</p>
        </div>

        <div v-else>
            <!-- Search & Results Container -->
            <div v-if="staff.length > 0 || searchQuery" class="bg-white rounded-[2.5rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden">
                <!-- Search Bar -->
                <div class="p-6 border-b border-slate-50 bg-slate-50/30">
                    <div class="relative w-full max-w-md">
                        <svg class="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                        <input v-model="searchQuery" type="text" placeholder="Search staff by name or email..."
                            class="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs uppercase tracking-widest focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all placeholder:text-slate-300 font-bold text-slate-700 shadow-sm">
                    </div>
                </div>

                <div v-if="filteredStaff.length > 0" class="overflow-x-auto">
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
                            <tr v-for="user in filteredStaff" :key="user.id" class="hover:bg-slate-50/50 transition-colors group">
                                <td class="px-10 py-6">
                                    <div class="flex items-center space-x-4">
                                         <div class="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 font-black group-hover:bg-indigo-600 group-hover:text-white transition-all transform group-hover:scale-110">
                                              {{ (user.first_name || 'S')[0] }}
                                         </div>
                                         <div>
                                              <div class="font-black text-slate-700 tracking-tight leading-none mb-1 uppercase text-sm">
                                                  {{ user.first_name }} {{ user.last_name }}
                                              </div>
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
                                          <div :class="user.is_active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse' : 'bg-slate-300'" class="w-1.5 h-1.5 rounded-full"></div>
                                          <span :class="user.is_active ? 'text-slate-500' : 'text-slate-300'" class="text-[10px] font-black uppercase tracking-widest italic">
                                              {{ user.is_active ? 'Active' : 'Deactivated' }}
                                          </span>
                                     </div>
                                </td>
                                <td class="px-10 py-6 text-right space-x-3">
                                    <router-link :to="`/admin/staff/${user.id}/edit`" class="inline-block bg-white border border-slate-200 text-slate-500 font-black text-[9px] tracking-widest uppercase px-5 py-2.5 rounded-xl hover:border-indigo-100 hover:text-indigo-600 transition shadow-sm active:scale-95">
                                        EDIT
                                    </router-link>
                                    <button @click="deleteStaff(user.id)" class="bg-rose-50 border border-rose-100 text-rose-400 font-black text-[9px] tracking-widest uppercase px-5 py-2.5 rounded-xl hover:bg-rose-500 hover:text-white transition active:scale-95">
                                        DELETE
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Empty Search Result -->
                <div v-else class="p-20 text-center">
                    <div class="text-4xl mb-4 text-slate-200">🔍</div>
                    <h4 class="text-lg font-black text-slate-400 uppercase tracking-widest">No matching staff found</h4>
                    <p class="text-xs text-slate-300 font-bold mt-2">Try adjusting your search query</p>
                </div>
            </div>

            <!-- Empty Global State -->
            <div v-else class="bg-white rounded-[3rem] shadow-[0_32px_120px_rgba(0,0,0,0.02)] border border-slate-100 p-24 text-center group">
                <div class="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 text-5xl group-hover:rotate-12 transition-transform duration-500">🛡️</div>
                <h3 class="text-3xl font-black text-slate-800 mb-4 tracking-tight uppercase">No Staff Members</h3>
                <p class="text-slate-400 font-medium max-w-sm mx-auto mb-12 text-sm leading-relaxed italic">
                    Add new administrators or teachers to help manage the system. 
                </p>
                <router-link to="/admin/staff/create" class="inline-block bg-indigo-600 text-white font-black py-5 px-12 rounded-2xl shadow-xl shadow-indigo-100 hover:shadow-indigo-200 hover:bg-indigo-700 transition transform hover:-translate-y-1 active:scale-95 uppercase tracking-widest text-xs">
                    Add First Staff Member ➜
                </router-link>
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
