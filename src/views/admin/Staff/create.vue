<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';

const route = useRoute();
const router = useRouter();
const staffId = route.params.id;
const isEditing = ref(!!staffId);

const form = ref({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    role: 'teacher',
    is_active: true
});

const roles = [
    { value: 'admin', label: 'Administrator', desc: 'Full system access & control' },
    { value: 'teacher', label: 'Teacher / Proctor', desc: 'Manage exams & view results' },
    { value: 'supervisor', label: 'Academic Supervisor', desc: 'Reporting & quality control' }
];

const isSubmitting = ref(false);
const loading = ref(false);
const errorMsg = ref('');

const fetchStaff = async () => {
    if (!isEditing.value) return;
    loading.value = true;
    try {
        const res = await api.get(`/admin/staff/${staffId}`);
        form.value = { ...res.data, password: '' };
    } catch (err) {
        console.error('Failed to load identity', err);
        router.push('/admin/staff');
    } finally {
        loading.value = false;
    }
};

const saveStaff = async () => {
    isSubmitting.value = true;
    errorMsg.value = '';
    try {
        if (isEditing.value) {
            await api.patch(`/admin/staff/${staffId}`, form.value);
        } else {
            await api.post('/admin/staff', form.value);
        }
        alert(isEditing.value ? 'Identity updated successfully.' : 'Staff member registered.');
        router.push('/admin/staff');
    } catch (err) {
        errorMsg.value = err.response?.data?.message || 'Failed to persist staff data.';
    } finally {
        isSubmitting.value = false;
    }
};

onMounted(fetchStaff);
</script>

<template>
    <AdminLayout>
        <div class="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            
            <!-- Header -->
            <div class="flex items-center space-x-6">
                <router-link to="/admin/staff"
                    class="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-slate-400 hover:text-indigo-600 hover:shadow-md transition-all border border-slate-100 group">
                    <svg class="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none"
                        stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M15 19l-7-7 7-7" />
                    </svg>
                </router-link>
                <div>
                    <h1 class="text-3xl font-black text-slate-800 tracking-tight">
                        {{ isEditing ? 'Edit Identity' : 'Register Staff' }}
                    </h1>
                    <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">
                        {{ isEditing ? 'Modifying existing credentials' : 'Adding new administrative node' }}
                    </p>
                </div>
            </div>

            <div v-if="loading" class="flex flex-col items-center justify-center py-20">
                <div class="w-10 h-10 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hydrating data...</p>
            </div>

            <div v-else class="relative">
                <form @submit.prevent="saveStaff" class="space-y-8">
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        
                        <!-- Main Details -->
                        <div class="lg:col-span-2 space-y-8">
                            <div class="premium-card p-10 bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-50 space-y-8">
                                <div class="flex items-center space-x-4">
                                    <div class="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
                                    <h3 class="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">Core Credentials</h3>
                                </div>

                                <div v-if="errorMsg" class="bg-rose-50 border border-rose-100 text-rose-500 text-[10px] font-black p-4 rounded-xl">
                                    ⚠️ ERROR: {{ errorMsg }}
                                </div>

                                <div class="space-y-6">
                                    <div class="grid grid-cols-2 gap-6">
                                        <div>
                                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-4">First Name</label>
                                            <input v-model="form.first_name" type="text" required placeholder="John"
                                                class="premium-input uppercase text-sm w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all font-bold">
                                        </div>
                                        <div>
                                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-4">Last Name</label>
                                            <input v-model="form.last_name" type="text" required placeholder="Doe"
                                                class="premium-input uppercase text-sm w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all font-bold">
                                        </div>
                                    </div>

                                    <div>
                                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-4">Email Channel</label>
                                        <input v-model="form.email" type="email" required placeholder="j.doe@system.com"
                                            class="premium-input text-sm w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all font-bold">
                                    </div>

                                    <div>
                                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-4">Security Key (Password)</label>
                                        <input v-model="form.password" type="password" :required="!isEditing" placeholder="••••••••"
                                            class="premium-input text-sm w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all font-mono">
                                        <p v-if="isEditing" class="text-[9px] text-slate-300 mt-2 font-bold italic">Leave blank to maintain current encryption</p>
                                    </div>
                                </div>
                            </div>

                            <!-- Status Management -->
                            <div class="premium-card p-10 bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-50 space-y-6">
                                <div class="flex items-center space-x-4">
                                    <div class="w-1.5 h-6 bg-slate-200 rounded-full"></div>
                                    <h3 class="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">Account Status</h3>
                                </div>
                                
                                <label class="flex items-center cursor-pointer group w-fit">
                                    <div class="relative">
                                        <input type="checkbox" v-model="form.is_active" class="sr-only peer">
                                        <div class="w-14 h-8 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-500"></div>
                                    </div>
                                    <div class="ml-4">
                                        <span class="block text-[10px] font-black text-slate-700 uppercase tracking-widest group-hover:text-emerald-600 transition">
                                            {{ form.is_active ? 'Active Node' : 'Deactivated' }}
                                        </span>
                                        <span class="block text-[8px] text-slate-300 font-bold uppercase tracking-tight">Access is granted while active</span>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <!-- Sidebar: Role Selection -->
                        <div class="space-y-8">
                            <div class="premium-card p-10 bg-slate-900 rounded-[2.5rem] shadow-xl shadow-indigo-900/10 space-y-8">
                                <div class="flex items-center space-x-4">
                                    <div class="w-1.5 h-6 bg-indigo-400 rounded-full"></div>
                                    <h3 class="text-xs font-black text-white uppercase tracking-[0.2em]">Permission Tier</h3>
                                </div>

                                <div class="space-y-4">
                                    <label v-for="r in roles" :key="r.value" 
                                        class="block p-4 rounded-2xl border-2 transition-all cursor-pointer group"
                                        :class="form.role === r.value ? 'bg-indigo-600 border-indigo-400 scale-[1.02]' : 'bg-slate-800/50 border-transparent hover:bg-slate-800'">
                                        <input type="radio" v-model="form.role" :value="r.value" class="hidden">
                                        <div class="flex flex-col">
                                            <span class="text-[10px] font-black uppercase tracking-widest mb-1"
                                                :class="form.role === r.value ? 'text-white' : 'text-slate-400'">{{ r.label }}</span>
                                            <span class="text-[9px] font-medium"
                                                :class="form.role === r.value ? 'text-indigo-100' : 'text-slate-500'">{{ r.desc }}</span>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <button type="submit" :disabled="isSubmitting"
                                class="w-full bg-indigo-600 text-white font-black py-6 rounded-[2rem] shadow-xl shadow-indigo-100 hover:shadow-indigo-300 hover:-translate-y-1 active:scale-95 transition-all duration-300 uppercase tracking-[0.3em] text-[10px]">
                                {{ isSubmitting ? 'PERSISTING...' : (isEditing ? 'UPDATE NODE ➜' : 'ACTIVE NODE ➜') }}
                            </button>
                        </div>

                    </div>
                </form>
            </div>
        </div>
    </AdminLayout>
</template>

<style scoped>
.premium-card {
    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.premium-input {
    outline: none;
}
</style>
