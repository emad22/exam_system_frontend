<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import api from '@/services/api';

const router = useRouter();
const step = ref(1); // 1: Personal, 2: Academic, 3: Account
const isSubmitting = ref(false);
const errorMsg = ref('');

const form = reactive({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    exam_type: 'adult',
    gender: 'male',
    password: '',
    password_confirmation: ''
});

const nextStep = () => {
    if (step.value < 3) step.value++;
};

const prevStep = () => {
    if (step.value > 1) step.value--;
};

const handleRegister = async () => {
    isSubmitting.value = true;
    errorMsg.value = '';

    try {
        const res = await api.post('/register', form);
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        
        // Success Step
        step.value = 4;
        
        setTimeout(() => {
            router.push('/dashboard');
        }, 3000);
    } catch (err) {
        console.error(err);
        errorMsg.value = err.response?.data?.message || 'Registration failed. Please check your data.';
        isSubmitting.value = false;
    }
};
</script>

<template>
    <div class="min-h-screen bg-[#fafbfc] flex items-center justify-center p-6 font-sans">
        <div class="w-full max-w-xl space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
            
            <!-- Branding/Logo Placeholder -->
            <div class="text-center space-y-4">
                <div class="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-indigo-100 transform -rotate-6">
                    <span class="text-white font-black text-2xl tracking-tighter">AA</span>
                </div>
                <h1 class="text-3xl font-black text-slate-800 tracking-tight">Begin Your Journey</h1>
                <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-loose">Join the Arab Academy’s Elite Assessment Network</p>
            </div>

            <!-- Wizard Card -->
            <div class="bg-white rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-slate-100 p-10 md:p-16 relative overflow-hidden">
                <!-- Progress Line -->
                <div v-if="step < 4" class="absolute top-0 left-0 w-full h-1.5 bg-slate-50 flex">
                    <div :class="`w-${step}/3`" class="h-full bg-indigo-600 transition-all duration-700 ease-out shadow-[0_0_15px_rgba(79,70,229,0.5)]"></div>
                </div>

                <form @submit.prevent="handleRegister" class="space-y-10">
                    
                    <!-- Error Message -->
                    <div v-if="errorMsg" class="p-5 bg-rose-50 border border-rose-100 text-rose-500 text-[10px] font-black uppercase tracking-widest rounded-2xl animate-in shake duration-500">
                        ⚠️ SYSTEM_ERROR: {{ errorMsg }}
                    </div>

                    <!-- Step 1: Personal Identity -->
                    <div v-if="step === 1" class="space-y-8 animate-in slide-in-from-right-4 duration-500">
                        <div class="flex items-center space-x-4">
                             <div class="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
                             <h3 class="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">Personal Identity</h3>
                        </div>

                        <div class="grid grid-cols-2 gap-6">
                            <div class="space-y-3">
                                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Given Name</label>
                                <input v-model="form.first_name" type="text" required class="w-full bg-slate-50 border-none rounded-2xl p-5 text-sm font-bold focus:ring-4 focus:ring-indigo-50 transition-all outline-none" placeholder="ALI">
                            </div>
                            <div class="space-y-3">
                                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Family Name</label>
                                <input v-model="form.last_name" type="text" required class="w-full bg-slate-50 border-none rounded-2xl p-5 text-sm font-bold focus:ring-4 focus:ring-indigo-50 transition-all outline-none" placeholder="DOE">
                            </div>
                        </div>

                        <div class="space-y-3">
                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Contact Phone</label>
                            <input v-model="form.phone" type="tel" class="w-full bg-slate-50 border-none rounded-2xl p-5 text-sm font-bold focus:ring-4 focus:ring-indigo-50 transition-all outline-none" placeholder="+20 123 456 789">
                        </div>

                        <div class="pt-6">
                             <button type="button" @click="nextStep" class="w-full bg-indigo-600 text-white font-black py-5 rounded-[1.5rem] shadow-xl shadow-indigo-100 hover:shadow-indigo-300 transition-all text-xs uppercase tracking-[0.3em]">Continue ➜</button>
                        </div>
                    </div>

                    <!-- Step 2: Academic Profile -->
                    <div v-if="step === 2" class="space-y-8 animate-in slide-in-from-right-4 duration-500">
                        <div class="flex items-center space-x-4">
                             <div class="w-1.5 h-6 bg-purple-600 rounded-full"></div>
                             <h3 class="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">Academic Profile</h3>
                        </div>

                        <div class="space-y-6">
                            <div class="space-y-3">
                                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Operational Mode</label>
                                <div class="grid grid-cols-2 gap-4">
                                    <button type="button" @click="form.exam_type = 'adult'" :class="form.exam_type === 'adult' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-slate-50 text-slate-400'" class="p-6 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all">Adult (18+)</button>
                                    <button type="button" @click="form.exam_type = 'children'" :class="form.exam_type === 'children' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-slate-50 text-slate-400'" class="p-6 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all">Young Learner</button>
                                </div>
                            </div>

                            <div class="space-y-3">
                                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Gender Profile</label>
                                <select v-model="form.gender" class="w-full bg-slate-50 border-none rounded-2xl p-5 text-xs font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-purple-50 transition-all">
                                    <option value="male">MALE_IDENTITY</option>
                                    <option value="female">FEMALE_IDENTITY</option>
                                </select>
                            </div>
                        </div>

                        <div class="pt-6 flex space-x-4">
                             <button type="button" @click="prevStep" class="w-1/3 bg-slate-50 text-slate-400 font-black py-5 rounded-[1.5rem] transition-all text-[10px] uppercase tracking-widest">Back</button>
                             <button type="button" @click="nextStep" class="w-2/3 bg-indigo-600 text-white font-black py-5 rounded-[1.5rem] shadow-xl shadow-indigo-100 hover:shadow-indigo-300 transition-all text-xs uppercase tracking-[0.3em]">Continue ➜</button>
                        </div>
                    </div>

                    <!-- Step 3: Account Security -->
                    <div v-if="step === 3" class="space-y-8 animate-in slide-in-from-right-4 duration-500">
                        <div class="flex items-center space-x-4">
                             <div class="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
                             <h3 class="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">Account Security</h3>
                        </div>

                        <div class="space-y-6">
                            <div class="space-y-3">
                                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Email Identifier</label>
                                <input v-model="form.email" type="email" required class="w-full bg-slate-50 border-none rounded-2xl p-5 text-sm font-bold focus:ring-4 focus:ring-emerald-50 transition-all outline-none" placeholder="NAME@EXAMPLE.COM">
                            </div>
                            <div class="space-y-3">
                                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Secret Access Key</label>
                                <input v-model="form.password" type="password" required class="w-full bg-slate-50 border-none rounded-2xl p-5 text-sm font-bold focus:ring-4 focus:ring-emerald-50 transition-all outline-none" placeholder="••••••••">
                            </div>
                            <div class="space-y-3">
                                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Confirm Secret</label>
                                <input v-model="form.password_confirmation" type="password" required class="w-full bg-slate-50 border-none rounded-2xl p-5 text-sm font-bold focus:ring-4 focus:ring-emerald-50 transition-all outline-none" placeholder="••••••••">
                            </div>
                        </div>

                        <div class="pt-6 flex space-x-4">
                             <button type="button" @click="prevStep" :disabled="isSubmitting" class="w-1/3 bg-slate-50 text-slate-400 font-black py-5 rounded-[1.5rem] transition-all text-[10px] uppercase tracking-widest">Back</button>
                             <button type="submit" :disabled="isSubmitting" class="w-2/3 bg-indigo-600 text-white font-black py-5 rounded-[1.5rem] shadow-xl shadow-indigo-100 hover:shadow-indigo-300 transition-all text-xs uppercase tracking-[0.3em]">
                                 {{ isSubmitting ? 'SYNCING...' : 'COMPLETE REGISTRATION' }}
                             </button>
                        </div>
                    </div>

                    <!-- Step 4: Success Message -->
                    <div v-if="step === 4" class="text-center space-y-10 py-10 animate-in zoom-in-95 duration-700">
                         <div class="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-xl shadow-emerald-50 animate-bounce">
                             <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
                         </div>
                         <div class="space-y-4">
                             <h2 class="text-2xl font-black text-slate-800 uppercase tracking-widest">Welcome Aboard</h2>
                             <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-loose">Identity successfully provisioned. Redirecting to your secure assessment dashboard...</p>
                         </div>
                         <div class="pt-4">
                             <div class="w-full h-1.5 bg-slate-50 rounded-full overflow-hidden">
                                 <div class="h-full bg-emerald-500 animate-progress origin-left"></div>
                             </div>
                         </div>
                    </div>
                </form>
            </div>

            <div class="text-center">
                 <router-link to="/login" class="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-colors">Already have an identity? Access here</router-link>
            </div>
        </div>
    </div>
</template>

<style scoped>
@keyframes progress {
    0% { transform: scaleX(0); }
    100% { transform: scaleX(1); }
}
.animate-progress {
    animation: progress 3s linear forwards;
}

@keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
}
.shake {
    animation: shake 0.5s ease-in-out;
}
</style>
