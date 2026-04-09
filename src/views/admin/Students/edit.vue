<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const isSaving = ref(false);
const packages = ref([]);
const skills = ref([]);
const studentId = route.params.id;

const editForm = ref({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    gender: 'male',
    birth_date: '',
    address: '',
    city: '',
    country: '',
    religion: '',
    occupation: '',
    student_code: '',
    come_from: '',
    student_type: '',
    year_of_arabic: null,
    not_adaptive: false,
    package_id: '',
    exam_type: 'adult',
    assigned_skills: [],
    password: '',
    is_active: true,
});

const loadData = async () => {
    loading.value = true;
    try {
        const [studentRes, pctRes, skillRes] = await Promise.all([
            api.get(`/admin/students/${studentId}`),
            api.get('/admin/packages'),
            api.get('/admin/skills')
        ]);
        
        packages.value = pctRes.data;
        skills.value = skillRes.data;
        
        const student = studentRes.data;
        editForm.value = {
            first_name: student.user?.first_name || '',
            last_name: student.user?.last_name || '',
            email: student.user?.email || '',
            phone: student.user?.phone || '',
            gender: student.user?.gender || 'male',
            birth_date: student.user?.birth_date || '',
            address: student.user?.address || '',
            city: student.user?.city || '',
            country: student.user?.country || '',
            religion: student.user?.religion || '',
            occupation: student.user?.occupation || '',
            student_code: student.student_code || '',
            come_from: student.come_from || '',
            student_type: student.student_type || '',
            year_of_arabic: student.year_of_arabic,
            not_adaptive: !!student.not_adaptive,
            is_active: !!student.user?.is_active,
            package_id: student.package_id || '',
            exam_type: student.exam_type || 'adult',
            assigned_skills: student.assigned_skills || [],
            password: '',
        };
    } catch (err) {
        console.error(err);
        alert('Failed to load student data');
        router.push('/admin/students');
    } finally {
        loading.value = false;
    }
};

const onPackageChange = () => {
    const selected = packages.value.find(p => p.id === editForm.value.package_id);
    if (selected && selected.skills) {
        editForm.value.assigned_skills = selected.skills.map(s => s.id);
    }
};

const saveStudent = async () => {
    isSaving.value = true;
    try {
        const payload = { ...editForm.value, is_active: editForm.value.is_active ? 1 : 0 };
        await api.patch(`/admin/students/${studentId}`, payload);
        alert('Identity profile updated successfully.');
        router.push('/admin/students');
    } catch (err) {
        alert(err.response?.data?.message || 'Failed to update identity.');
    } finally {
        isSaving.value = false;
    }
};

onMounted(() => {
    loadData();
});
</script>

<template>
    <AdminLayout>
        <div v-if="loading" class="flex flex-col items-center justify-center py-32 space-y-4">
            <div class="w-12 h-12 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Querying Database...</p>
        </div>
        <div v-else class="max-w-3xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            <div class="flex items-center justify-between">
                <div>
                    <h1 class="text-3xl font-black text-slate-800 tracking-tight">Sync Entity</h1>
                    <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">Manual identity reconciliation</p>
                </div>
                <button @click="router.push('/admin/students')"
                    class="w-10 h-10 rounded-full bg-white border border-slate-100 text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors shadow-sm">✕</button>
            </div>

            <div class="bg-white rounded-[3rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-full overflow-hidden flex flex-col border border-slate-100">
                <div class="p-10 space-y-12">
                    <!-- Section 1: Core -->
                    <div class="space-y-6">
                        <div class="grid grid-cols-2 gap-6">
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Given Name</label>
                                <input v-model="editForm.first_name" type="text" class="premium-input text-xs uppercase" placeholder="FIRST_NAME">
                            </div>
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Family Name</label>
                                <input v-model="editForm.last_name" type="text" class="premium-input text-xs uppercase" placeholder="LAST_NAME">
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-6">
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Identifier (Email)</label>
                                <input v-model="editForm.email" type="email" class="premium-input text-xs" placeholder="EMAIL@DOMAIN.COM">
                            </div>
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Contact Phone</label>
                                <input v-model="editForm.phone" type="text" class="premium-input text-xs" placeholder="+XX XXX XXXX">
                            </div>
                        </div>
                    </div>

                    <!-- Section 2: Bio -->
                    <div class="grid grid-cols-2 gap-6">
                        <div>
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Belief System (Religion)</label>
                            <input v-model="editForm.religion" type="text" class="premium-input text-xs uppercase" placeholder="RELIGION">
                        </div>
                        <div>
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Core Profession</label>
                            <input v-model="editForm.occupation" type="text" class="premium-input text-xs uppercase" placeholder="OCCUPATION">
                        </div>
                    </div>

                    <!-- Section 3: Academic -->
                    <div class="space-y-6 p-8 bg-slate-50/50 rounded-[2.5rem] border border-slate-100">
                        <div class="grid grid-cols-2 gap-6">
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Assigned Package</label>
                                <select v-model="editForm.package_id" @change="onPackageChange" class="premium-input text-[10px] uppercase tracking-widest">
                                    <option value="">CUSTOM_SYNC</option>
                                    <option v-for="pkg in packages" :key="pkg.id" :value="pkg.id">{{ pkg.name }}</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Logic Mode</label>
                                <select v-model="editForm.exam_type" class="premium-input text-[10px] uppercase tracking-widest">
                                    <option value="adult">ADULT (18+)</option>
                                    <option value="children">CHILD (-18)</option>
                                </select>
                            </div>
                        </div>

                        <div class="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-8">
                            <label class="flex items-center cursor-pointer group">
                                <div class="relative">
                                    <input type="checkbox" v-model="editForm.not_adaptive" class="sr-only">
                                    <div :class="editForm.not_adaptive ? 'bg-amber-500' : 'bg-slate-200'" class="block w-12 h-7 rounded-full transition-colors"></div>
                                    <div :class="editForm.not_adaptive ? 'translate-x-6' : 'translate-x-1'" class="absolute left-0 top-1 bg-white w-5 h-5 rounded-full transition-transform shadow-sm"></div>
                                </div>
                                <span class="ml-3 text-[10px] font-black text-slate-600 uppercase tracking-widest">Linear Mode (Non-Adaptive)</span>
                            </label>

                            <label class="flex items-center cursor-pointer group">
                                <div class="relative">
                                    <input type="checkbox" v-model="editForm.is_active" class="sr-only">
                                    <div :class="editForm.is_active ? 'bg-emerald-500' : 'bg-slate-200'" class="block w-12 h-7 rounded-full transition-colors"></div>
                                    <div :class="editForm.is_active ? 'translate-x-6' : 'translate-x-1'" class="absolute left-0 top-1 bg-white w-5 h-5 rounded-full transition-transform shadow-sm"></div>
                                </div>
                                <span class="ml-3 text-[10px] font-black text-slate-600 uppercase tracking-widest">Active Status</span>
                            </label>
                        </div>

                        <div>
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-4">Cognitive Module Matrix</label>
                            <div class="grid grid-cols-2 gap-3">
                                <label v-for="skill in skills" :key="skill.id" :class="editForm.assigned_skills.includes(skill.id) ? 'border-indigo-400 bg-white ring-4 ring-indigo-50 shadow-sm' : 'border-slate-50 bg-white/50'" class="flex items-center p-4 rounded-2xl border cursor-pointer hover:border-indigo-200 transition-all duration-300 group">
                                    <input type="checkbox" :value="skill.id" v-model="editForm.assigned_skills" class="w-5 h-5 text-indigo-600 rounded-lg border-slate-200 bg-white shadow-inner focus:ring-0">
                                    <span :class="editForm.assigned_skills.includes(skill.id) ? 'text-indigo-600 font-black' : 'text-slate-500 font-bold'" class="ml-3 text-[9px] uppercase tracking-wider transition-colors">
                                        {{ skill.name }}
                                    </span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <!-- Password -->
                    <div>
                        <label class="block text-[10px] font-black text-slate-300 uppercase tracking-widest mb-2 ml-4">Credential Override (Passphrase)</label>
                        <input v-model="editForm.password" type="password" placeholder="LEAVE BLANK TO RETAIN CURRENT KEY" class="premium-input font-mono text-xs tracking-widest text-center bg-slate-50 border-dashed">
                    </div>
                </div>

                <!-- Footer -->
                <div class="p-10 bg-slate-50 border-t border-slate-100 flex justify-end space-x-4 shrink-0">
                    <button @click="router.push('/admin/students')" class="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition">Discard</button>
                    <button @click="saveStudent" :disabled="isSaving" class="bg-slate-900 text-white font-black px-12 py-5 rounded-[1.5rem] shadow-xl shadow-slate-200 hover:bg-black active:scale-95 transition-all uppercase tracking-[0.2em] text-[10px]">
                        {{ isSaving ? 'SYNCHRONIZING...' : 'COMMIT CHANGES' }}
                    </button>
                </div>
            </div>
        </div>
    </AdminLayout>
</template>
