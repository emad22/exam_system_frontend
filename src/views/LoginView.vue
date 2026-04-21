<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import api from '@/services/api';

const router = useRouter();
const isLogin = ref(true);
const isLoading = ref(false);
const errorMsg = ref('');

const form = ref({
    email: '',
    password: '',
    username: ''
});

const handleLogin = async () => {
    isLoading.value = true;
    errorMsg.value = '';
    try {
        const res = await api.post('/login', {
            email: form.value.email,
            password: form.value.password
        });

        localStorage.setItem('token', res.data.token);
        
        if (res.data.role === 'admin' || res.data.role === 'teacher') {
            router.push('/admin');
        } else {
            router.push('/dashboard');
        }
    } catch (err) {
        errorMsg.value = err.response?.data?.message || 'Invalid credentials. Please try again.';
    } finally {
        isLoading.value = false;
    }
};

const handleRegister = async () => {
    isLoading.value = true;
    errorMsg.value = '';
    try {
        await api.post('/register', form.value);
        isLogin.value = true;
        alert('Registration successful! Please login.');
    } catch (err) {
        errorMsg.value = err.response?.data?.message || 'Registration failed.';
    } finally {
        isLoading.value = false;
    }
};
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden">
    
    <!-- Optional Decoration: Soft brand circles in background -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
        <div class="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-brand-primary/5 rounded-full blur-[100px]"></div>
        <div class="absolute bottom-[10%] -right-[5%] w-[30%] h-[30%] bg-brand-accent/5 rounded-full blur-[100px]"></div>
    </div>

    <!-- Login Container -->
    <div class="relative z-10 w-full max-w-lg animate-in fade-in zoom-in duration-700">
        <div class="bg-white p-10 md:p-14 rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden relative">
            
            <!-- Logo Section -->
            <div class="flex flex-col items-center justify-center mb-10">
                <img src="/logo.png" alt="Arab Academy Logo" class="h-16 w-auto object-contain drop-shadow-sm" />
            </div>

            <div class="relative z-10">
                <div class="mb-8 text-center space-y-1">
                    <h2 class="text-2xl font-black text-slate-800 tracking-tight">
                        {{ isLogin ? 'Account Login' : 'Create an Account' }}
                    </h2>
                    <p class="text-slate-500 text-sm font-semibold">
                        {{ isLogin ? 'Welcome back, please enter your details' : 'Join our vibrant learning community' }}
                    </p>
                </div>

                <form @submit.prevent="isLogin ? handleLogin() : handleRegister()" class="space-y-5">
                    <div v-if="errorMsg" class="bg-rose-50 border border-rose-200 text-brand-primary text-xs font-bold py-4 rounded-xl text-center animate-in slide-in-from-top-2">
                        {{ errorMsg }}
                    </div>

                    <div v-if="!isLogin" class="space-y-2">
                        <label class="block text-xs font-bold text-slate-700 uppercase tracking-wide">Username</label>
                        <input v-model="form.username" type="text" placeholder="e.g. johndoe" required
                               class="premium-input">
                    </div>

                    <div class="space-y-2">
                        <label class="block text-xs font-bold text-slate-700 uppercase tracking-wide">Email Address</label>
                        <input v-model="form.email" type="email" placeholder="email@example.com" required
                               class="premium-input">
                    </div>

                    <div class="space-y-2">
                        <label class="block text-xs font-bold text-slate-700 uppercase tracking-wide">Password</label>
                        <input v-model="form.password" type="password" placeholder="••••••••" required
                               class="premium-input">
                    </div>

                    <div class="pt-4">
                        <button type="submit" :disabled="isLoading"
                                class="w-full bg-brand-primary text-white font-bold py-4 rounded-xl shadow-md shadow-brand-primary/20 hover:shadow-lg hover:shadow-brand-primary/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 disabled:opacity-50 text-sm tracking-widest uppercase">
                            {{ isLoading ? 'Processing...' : (isLogin ? 'Sign In' : 'Register Now') }}
                        </button>
                    </div>
                </form>

                <div class="mt-8 text-center border-t border-slate-100 pt-6">
                    <button @click="isLogin = !isLogin" class="text-slate-500 text-sm font-semibold hover:text-brand-primary transition-colors duration-300">
                        {{ isLogin ? "Don't have an account? " : "Already have an account? " }}
                        <span class="text-brand-accent underline underline-offset-4 decoration-brand-accent/30 font-bold">
                            {{ isLogin ? "Register here" : "Login here" }}
                        </span>
                    </button>
                </div>
            </div>
        </div>

        <!-- System Footer -->
        <div class="mt-8 text-center space-y-3">
            <p class="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                © {{ new Date().getFullYear() }} Arab Academy. All Rights Reserved.
            </p>
        </div>
    </div>
  </div>
</template>

<style scoped>
.animate-in {
    animation: fade-in 0.6s ease-out;
}
@keyframes fade-in {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}
</style>