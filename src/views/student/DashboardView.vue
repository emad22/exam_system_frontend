<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '@/services/api';
import Tag from 'primevue/tag';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';

const router = useRouter();
const exams = ref([]);
const student = ref(null);
const isLoading = ref(false);
const startingSkillId = ref(null);
const selectedLevel = ref(1);
const isDemo = ref(false);

const fetchDashboard = async () => {
    isLoading.value = true;
    try {
        const [userRes, examsRes] = await Promise.all([
            api.get('/user'),
            api.get('/exams'),
        ]);
        student.value = userRes.data;
        exams.value = examsRes.data;
        
        // Check role case-insensitively and include typos
        const userRole = (student.value?.role || '').toLowerCase();
        isDemo.value = ['demo', 'deom', 'staff'].includes(userRole);
    } catch (err) {
        console.error('Failed to load dashboard', err);
    } finally {
        isLoading.value = false;
    }
};

onMounted(fetchDashboard);

const skills = () => exams.value?.[0]?.skills || [];

const isSkillCompleted = (exam, skillId) => {
    if (!exam || !exam.completed_skill_ids) return false;
    // Use String comparison to be 100% safe against type mismatches
    return exam.completed_skill_ids.some(id => String(id) === String(skillId));
};

const startSkill = async (skillId) => {
    if (!exams.value[0]) return;
    // Remove the blocking check for demo users
    // Fix: pass exams.value[0] as the first argument
    if (!isDemo.value && isSkillCompleted(exams.value[0], skillId)) return;
    
    startingSkillId.value = skillId;
    try {
        const payload = { skill_id: skillId };
        if (isDemo.value) payload.level_id = selectedLevel.value;
        
        const res = await api.post(`/exams/${exams.value[0].id}/start`, payload);
        router.push(`/exam/${res.data.attempt.id}`);
    } catch (err) {
        alert(err.response?.data?.error || 'Failed to start session');
    } finally {
        startingSkillId.value = null;
    }
};

const resetDemoProgress = async () => {
    const examId = exams.value?.[0]?.id;
    if (!examId || !confirm('Are you sure you want to reset all exam progress? This will delete all your answers and start you fresh. This action cannot be undone.')) return;
    isLoading.value = true;
    try {
        await api.post(`/exams/${examId}/reset-demo`);
        await fetchDashboard();
    } catch (err) {
        alert(err.response?.data?.error || 'Failed to reset progress.');
        isLoading.value = false;
    }
};

const getSkillIcon = (name) => {
    name = name.toLowerCase();
    if (name.includes('listening')) return '🎧';
    if (name.includes('reading')) return '📖';
    if (name.includes('writing')) return '✍️';
    if (name.includes('speaking')) return '🗣️';
    if (name.includes('grammar') || name.includes('structure')) return '📋';
    return '🎯';
};

const logout = () => {
    localStorage.removeItem('token');
    router.push('/login');
};

const showProfileModal = ref(false);
const isUpdating = ref(false);
const profileForm = ref({
    password: '',
    password_confirmation: '',
    avatar: null
});

const onFileSelect = (event) => {
    profileForm.value.avatar = event.target.files[0];
};

const updateProfile = async () => {
    isUpdating.value = true;
    try {
        const formData = new FormData();
        if (profileForm.value.avatar) {
            formData.append('avatar', profileForm.value.avatar);
        }
        if (profileForm.value.password) {
            formData.append('password', profileForm.value.password);
            formData.append('password_confirmation', profileForm.value.password_confirmation);
        }

        await api.post('/profile', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        alert('Profile updated successfully!');
        showProfileModal.value = false;
        profileForm.value = { password: '', password_confirmation: '', avatar: null };
        fetchDashboard();
    } catch (err) {
        alert(err.response?.data?.message || 'Failed to update profile');
    } finally {
        isUpdating.value = false;
    }
};
</script>

<template>
    <div class="h-screen bg-[#F8FAFC] font-sans text-slate-900 overflow-hidden flex flex-col">
        <!-- Soft background blobs -->
        <div class="fixed inset-0 pointer-events-none overflow-hidden">
            <div class="absolute -top-[10%] -right-[5%] w-[40%] h-[40%] bg-brand-primary/10 rounded-full blur-[120px]"></div>
            <div class="absolute top-[30%] -left-[10%] w-[30%] h-[30%] bg-brand-accent/10 rounded-full blur-[120px]"></div>
        </div>

        <!-- Header -->
        <header class="bg-white border-b border-slate-100 shrink-0 shadow-sm transition-all duration-300">
            <div class="max-w-[1600px] mx-auto px-6 h-16 flex justify-between items-center">
                <div class="flex items-center space-x-4">
                    <div class="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center text-white shadow-lg shadow-brand-primary/20">
                        <i class="pi pi-book text-sm"></i>
                    </div>
                    <div>
                        <h1 class="text-sm font-black text-brand-primary tracking-tight leading-none uppercase">Arab<span class="text-brand-accent">Academy</span></h1>
                        <span class="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Excellence Portal</span>
                    </div>
                </div>

                <div class="flex items-center space-x-6">
                    <div class="text-right hidden sm:block">
                        <p class="text-[8px] font-black text-slate-300 uppercase tracking-widest leading-none mb-1">Authorized Candidate</p>
                        <p class="text-[10px] font-bold text-slate-700 uppercase tracking-tight leading-none">{{ student?.name || student?.email }}</p>
                    </div>
                    <button @click="showProfileModal = true" 
                            class="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 hover:text-brand-primary hover:bg-brand-primary/5 transition-all border border-slate-100 flex items-center justify-center group">
                        <i class="pi pi-cog text-sm group-hover:rotate-90 transition-transform duration-500"></i>
                    </button>
                    <button @click="logout" 
                            class="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all border border-slate-100 flex items-center justify-center group">
                        <i class="pi pi-sign-out text-sm group-hover:scale-110 transition-transform"></i>
                    </button>
                </div>
            </div>
        </header>

        <!-- Main Dashboard Split Layout -->
        <main class="flex-grow relative z-10 max-w-[1600px] mx-auto w-full px-6 py-4 overflow-hidden flex gap-6">
            
            <!-- Loading Overlay -->
            <div v-if="isLoading" class="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
                <div class="w-10 h-10 border-4 border-slate-100 border-t-brand-primary rounded-full animate-spin"></div>
                <p class="mt-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Processing Dashboard...</p>
            </div>

            <!-- Left Column: Identity & Stats -->
            <div class="w-1/3 flex flex-col gap-4 overflow-hidden animate-in fade-in slide-in-from-left-8 duration-700">
                
                <!-- Greeting & Basic Info -->
                <section class="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
                    <div class="inline-flex items-center space-x-2 bg-emerald-50 text-emerald-600 px-3 py-1 rounded-md border border-emerald-100">
                        <i class="pi pi-verified text-[8px]"></i>
                        <span class="text-[8px] font-black uppercase tracking-widest">ID Verified</span>
                    </div>
                    
                    <div class="flex items-center space-x-4">
                        <div class="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-2xl font-black shadow-lg shrink-0 overflow-hidden">
                            <img v-if="student?.avatar" :src="'http://localhost:8000/storage/' + student.avatar" class="w-full h-full object-cover" />
                            <span v-else>{{ student?.first_name?.[0] || 'S' }}</span>
                        </div>
                        <div class="min-w-0">
                            <h2 class="text-xl font-black text-slate-900 tracking-tight leading-tight truncate uppercase">
                                {{ student?.first_name || student?.name || 'Candidate' }}
                            </h2>
                            <p class="text-[9px] font-black text-slate-300 uppercase tracking-widest truncate">{{ student?.student?.student_code || 'DEMO-ACC' }}</p>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-3 pt-2">
                        <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <p class="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">Category</p>
                            <p class="text-[10px] font-black uppercase text-brand-accent truncate">{{ student?.student?.category?.name || 'Academic' }}</p>
                        </div>
                        <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <p class="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                            <div class="flex items-center gap-1.5">
                                <div class="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                <p class="text-[10px] font-black uppercase text-emerald-600">Active</p>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Evaluator Progress Card -->
                <section class="bg-brand-primary rounded-3xl p-6 text-white shadow-lg relative overflow-hidden flex-shrink-0">
                    <div class="absolute -left-4 -bottom-4 w-20 h-20 bg-white/10 rounded-full blur-2xl"></div>
                    <p class="text-[9px] font-black text-white/50 uppercase tracking-widest mb-2 relative z-10">Evaluations Finished</p>
                    <div class="flex items-baseline relative z-10">
                        <span class="text-5xl font-black italic tracking-tighter">{{ exams?.[0]?.completed_skill_ids?.length || 0 }}</span>
                        <span class="text-sm font-bold ml-2 opacity-60">/ {{ (exams?.[0]?.skills?.length || 0) }} Modules</span>
                    </div>
                    <div class="mt-4 bg-white/10 h-1.5 rounded-full overflow-hidden">
                        <div class="bg-white h-full transition-all duration-1000" 
                             :style="{ width: ((exams?.[0]?.completed_skill_ids?.length || 0) / (exams?.[0]?.skills?.length || 1) * 100) + '%' }"></div>
                    </div>
                </section>

                <!-- Demo Tool (Scrollable if needed but compact) -->
                <section v-if="isDemo" class="bg-amber-50 border border-amber-200 p-5 rounded-3xl shadow-sm flex-grow overflow-y-auto custom-scrollbar">
                    <div class="flex items-center gap-3 mb-3">
                        <div class="w-6 h-6 bg-amber-500 text-white rounded-lg flex items-center justify-center shadow-md">
                            <i class="pi pi-bolt text-[10px]"></i>
                        </div>
                        <span class="text-[9px] font-black text-amber-600 uppercase tracking-widest">Demo Tools</span>
                    </div>
                    <div class="space-y-3">
                        <div>
                            <label class="text-[8px] font-black text-amber-500 uppercase tracking-widest ml-1 mb-2 block">Starting Level Override</label>
                            <div class="flex flex-wrap gap-1.5">
                                <button v-for="l in 9" :key="l" @click="selectedLevel = l"
                                    :class="selectedLevel === l ? 'bg-amber-500 text-white shadow-md' : 'bg-white text-amber-600 hover:bg-amber-100 border-amber-200'"
                                    class="w-8 h-8 rounded-lg font-black text-[10px] transition-all flex items-center justify-center border">
                                    {{ l }}
                                </button>
                            </div>
                        </div>
                        <button @click="resetDemoProgress" class="w-full py-2.5 bg-rose-500 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-rose-600 transition-all shadow-md flex justify-center items-center gap-2">
                            <i class="pi pi-refresh text-[8px]"></i> Reset Progress
                        </button>
                    </div>
                </section>
            </div>

            <!-- Right Column: Skills Selection -->
            <div class="w-2/3 flex flex-col bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-8 duration-700">
                
                <!-- Section Header -->
                <div class="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <div>
                        <p class="text-[9px] font-black text-brand-primary uppercase tracking-[0.3em] mb-1">Assessment Matrix</p>
                        <h3 class="text-2xl font-black text-slate-900 tracking-tighter uppercase">Academic Modules</h3>
                    </div>
                    <div class="flex items-center space-x-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                        <div class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span class="text-[9px] font-black text-slate-500 uppercase tracking-widest">{{ skills().length }} Active Domains</span>
                    </div>
                </div>

                <!-- Skills List Scroll Area -->
                <div class="flex-grow overflow-y-auto p-6 custom-scrollbar space-y-3">
                    <div v-if="!exams.length" class="h-full flex flex-col items-center justify-center text-center p-12">
                        <span class="text-5xl mb-4 grayscale opacity-20">🎯</span>
                        <h3 class="text-lg font-black text-slate-700 uppercase tracking-tight">No Active Evaluations</h3>
                        <p class="text-slate-400 font-bold mt-2 text-[10px] uppercase tracking-widest max-w-xs">
                            Account pending institutional approval. Contact administration.
                        </p>
                    </div>

                    <div v-else v-for="skill in exams[0]?.skills" :key="skill.id"
                         class="group relative bg-slate-50/50 border border-slate-100 rounded-2xl p-4 transition-all duration-300 flex items-center gap-6"
                         :class="isSkillCompleted(exams[0], skill.id) ? 'opacity-50 grayscale pointer-events-none' : 'hover:bg-white hover:shadow-lg hover:shadow-slate-200/50 hover:border-brand-primary/20'">
                        
                        <!-- Icon -->
                        <div :class="[
                            isSkillCompleted(exams[0], skill.id) ? 'bg-emerald-100 text-emerald-600' : 'bg-white text-slate-600 group-hover:bg-brand-primary group-hover:text-white',
                            'w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-all duration-500 shadow-sm border border-slate-100 shrink-0'
                        ]">
                            <i v-if="isSkillCompleted(exams[0], skill.id)" class="pi pi-check text-sm"></i>
                            <span v-else class="group-hover:scale-110 transition-transform">{{ getSkillIcon(skill.name) }}</span>
                        </div>

                        <!-- Details -->
                        <div class="flex-grow min-w-0">
                            <h4 class="text-sm font-black text-slate-800 tracking-tight group-hover:text-brand-primary transition-colors uppercase leading-none mb-1.5 truncate">{{ skill.name }}</h4>
                            <div class="flex items-center gap-2">
                                <span class="text-[8px] font-bold text-slate-400 uppercase tracking-widest truncate">Standard Tracks</span>
                                <div v-if="isSkillCompleted(exams[0], skill.id)" class="flex items-center gap-1.5">
                                    <div class="w-1 h-1 rounded-full bg-emerald-400"></div>
                                    <span class="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Completed</span>
                                </div>
                            </div>
                        </div>

                        <!-- Action -->
                        <div class="shrink-0">
                            <button v-if="!isSkillCompleted(exams[0], skill.id)" 
                                @click="startSkill(skill.id)"
                                :disabled="startingSkillId !== null"
                                class="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-brand-primary transition-all active:scale-95 disabled:opacity-50">
                                <span v-if="startingSkillId === skill.id" class="flex items-center gap-2">
                                    <i class="pi pi-spin pi-spinner text-[10px]"></i> Wait
                                </span>
                                <span v-else>Launch</span>
                            </button>
                            <div v-else class="px-6 py-2.5 bg-emerald-50 text-emerald-600 rounded-xl font-black text-[9px] uppercase tracking-widest border border-emerald-100">
                                Verified
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Footer Integration inside Right Column -->

                <!-- Footer Integration inside Right Column -->
                <div class="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between shrink-0">
                    <span class="text-[8px] font-black text-slate-300 uppercase tracking-[0.3em]">Institutional Protocol 2024</span>
                    <div class="flex space-x-4">
                        <span class="text-[7px] font-bold text-slate-400 uppercase tracking-widest">Session Encrypted</span>
                        <span class="text-[7px] font-bold text-slate-400 uppercase tracking-widest">Arab Academy</span>
                    </div>
                </div>
            </div>
        </main>

        <!-- Profile Settings Modal -->
        <Dialog v-model:visible="showProfileModal" header="Profile Settings" modal class="w-full max-w-md">
            <div class="space-y-6 p-1">
                <div class="space-y-2">
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Profile Picture</label>
                    <div class="flex items-center gap-4">
                        <div class="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center overflow-hidden border-2 border-dashed border-slate-200">
                            <img v-if="student?.avatar" :src="'http://localhost:8000/storage/' + student.avatar" class="w-full h-full object-cover" />
                            <i v-else class="pi pi-user text-slate-300 text-xl"></i>
                        </div>
                        <input type="file" @change="onFileSelect" accept="image/*" class="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-brand-primary/10 file:text-brand-primary hover:file:bg-brand-primary/20 cursor-pointer" />
                    </div>
                </div>

                <div class="space-y-4 pt-4 border-t border-slate-100">
                    <div class="flex flex-col gap-2">
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">New Password</label>
                        <Password v-model="profileForm.password" toggleMask class="w-full" inputClass="w-full p-inputtext-sm" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Confirm Password</label>
                        <Password v-model="profileForm.password_confirmation" toggleMask :feedback="false" class="w-full" inputClass="w-full p-inputtext-sm" />
                    </div>
                </div>
            </div>

            <template #footer>
                <div class="flex justify-end gap-2 pt-4">
                    <Button label="Cancel" class="p-button-text p-button-sm font-black uppercase tracking-widest text-slate-400" @click="showProfileModal = false" />
                    <Button label="Save Changes" :loading="isUpdating" class="p-button-raised p-button-sm font-black uppercase tracking-widest" @click="updateProfile" />
                </div>
            </template>
        </Dialog>
    </div>
</template>

<style scoped>
.animate-in {
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}

.custom-scrollbar::-webkit-scrollbar {
    width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
    background: #e2e8f0;
    border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #cbd5e1;
}
</style>
