<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';

const router = useRouter();

const form = ref({
    name: ''
});

const isSubmitting = ref(false);
const errorMsg = ref('');

const addSkill = async () => {
    isSubmitting.value = true;
    errorMsg.value = '';
    
    try {
        await api.post('/admin/skills', form.value);
        alert('Module integrated successfully into the ecosystem!');
        router.push('/admin/skills');
    } catch (err) {
        console.error(err);
        errorMsg.value = err.response?.data?.message || 'Failed to inject module.';
    } finally {
        isSubmitting.value = false;
    }
};
</script>

<template>
  <AdminLayout>
    <div class="max-w-3xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
        
        <!-- Header -->
        <div class="flex items-center space-x-6">
            <router-link to="/admin/skills"
                class="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-slate-400 hover:text-indigo-600 hover:shadow-md transition-all border border-slate-100 group">
                <svg class="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none"
                    stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M15 19l-7-7 7-7" />
                </svg>
            </router-link>
            <div>
                <h1 class="text-3xl font-black text-slate-800 tracking-tight">Inject Cognitive Module</h1>
                <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">Manual Skill Registry</p>
            </div>
        </div>

        <div class="premium-card p-10 md:p-16 relative overflow-hidden bg-white rounded-[3rem] shadow-[0_32px_120px_rgba(0,0,0,0.05)] border border-slate-100">
            <!-- Decorative Accent -->
            <div class="absolute -right-24 -top-24 w-64 h-64 bg-indigo-50/40 rounded-full blur-3xl"></div>

            <form @submit.prevent="addSkill" class="relative z-10 space-y-12">
                
                <div v-if="errorMsg"
                    class="bg-rose-50 border border-rose-100 text-rose-500 text-[10px] font-black uppercase tracking-widest p-5 rounded-2xl animate-in slide-in-from-top-2">
                    ⚠️ INJECTION_ERROR: {{ errorMsg }}
                </div>

                <div class="space-y-8">
                    <div class="flex items-center space-x-4 mb-4">
                        <div class="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
                        <h3 class="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">Module Identity</h3>
                    </div>

                    <div>
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-4">Logical Designation (Module Name)</label>
                        <input v-model="form.name" type="text" required 
                            class="premium-input uppercase text-sm placeholder:text-slate-300 w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-800 font-bold tracking-wide" 
                            placeholder="E.G. GRAMMAR_MODULE_V1">
                        <p class="text-[9px] text-slate-400 mt-3 ml-4 font-bold uppercase tracking-widest">This identifier will be used system-wide to map assessments</p>
                    </div>
                </div>

                <div class="pt-8 border-t border-slate-50 flex items-center justify-between">
                    <div class="flex items-center space-x-3 opacity-30 hidden sm:flex">
                        <div class="w-2 h-2 bg-slate-400 rounded-full"></div>
                        <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Awaiting Commit Sequence</span>
                    </div>
                    <button type="submit" :disabled="isSubmitting" 
                        class="w-full sm:w-auto bg-slate-900 text-white font-black py-5 px-16 rounded-[2rem] shadow-xl hover:shadow-indigo-500/20 hover:-translate-y-1 active:scale-95 transition-all duration-300 disabled:opacity-50 text-[10px] uppercase tracking-[0.4em]">
                        {{ isSubmitting ? 'COMPILING...' : 'COMMIT MODULE ➜' }}
                    </button>
                </div>
            </form>
        </div>
    </div>
  </AdminLayout>
</template>
