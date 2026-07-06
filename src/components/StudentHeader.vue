<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import api from '@/services/api';
import { authStorage } from '@/services/authStorage';
import { useMediaUrl } from '@/composables/useMediaUrl';


const router = useRouter();
const student = ref(null);
const showUserMenu = ref(false);

const fetchUser = async () => {
    try {
        const res = await api.get('/user');
        student.value = res.data;
    } catch (err) {
        console.error('Failed to load user in header', err);
    }
};

// const logout = () => {
//     authStorage.clear();
//     router.push('/login');
// };


const logout = async () => {
    try {
        await api.post('/logout');

    } catch (err) {
        console.error('Logout API failed', err);
    } finally {
        authStorage.clear();
        // router.push('/login');
        router.replace('/login');

    }
};



const { resolveUrl } = useMediaUrl();


const fullStudentName = computed(() => {
    const firstName = student.value?.first_name || '';
    const lastName = student.value?.last_name || '';
    return [firstName, lastName].filter(Boolean).join(' ') || student.value?.name || 'Candidate';
});

const vClickOutside = {
    mounted(el, binding) {
        el.clickOutsideEvent = (event) => {
            if (!(el === event.target || el.contains(event.target))) {
                binding.value(event);
            }
        };
        setTimeout(() => {
            document.addEventListener('click', el.clickOutsideEvent);
        }, 0);
    },
    unmounted(el) {
        document.removeEventListener('click', el.clickOutsideEvent);
    },
};

onMounted(fetchUser);
</script>

<template>
    <header class="bg-white border-b border-slate-100 shrink-0 shadow-sm transition-all duration-300 relative z-[2000] w-full">
        <div class="max-w-[1600px] mx-auto px-6 h-16 flex justify-between items-center">
            <div class="flex items-center cursor-pointer" @click="router.push('/skill-selection')">
                <img
                    src="/logo.png"
                    alt="Arab Academy"
                    class="h-12 w-auto max-w-[180px] object-contain"
                />
            </div>

            <div class="flex items-center space-x-4">
                <!-- User Profile Dropdown -->
                <div class="relative">
                    <div @click.stop="showUserMenu = !showUserMenu"
                        class="flex items-center gap-2 bg-slate-50 hover:bg-white p-1.5 pr-3 rounded-2xl border border-slate-100 cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md group">
                        <div
                            class="w-9 h-9 rounded-xl bg-brand-primary/10 flex items-center justify-center overflow-hidden border border-brand-primary/20">
                            <img v-if="student?.avatar" :src="resolveUrl(student.avatar)"
                                class="w-full h-full object-cover" />
                            <i v-else class="pi pi-user text-brand-primary"></i>
                        </div>
                        <i class="pi pi-chevron-down text-[10px] text-slate-400 group-hover:text-brand-primary transition-transform duration-300"
                            :class="{ 'rotate-180': showUserMenu }"></i>
                    </div>

                    <!-- Dropdown Menu -->
                    <div v-if="showUserMenu" v-click-outside="() => showUserMenu = false"
                        class="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in zoom-in duration-200">
                        <div class="p-4 border-b border-slate-50 bg-slate-50/50">
                            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 text-left">Candidate</p>
                            <p class="text-xs font-black text-slate-800 truncate text-left">{{ fullStudentName }}</p>
                        </div>
                        <div class="p-2">
                            <button @click="router.push('/profile'); showUserMenu = false"
                                class="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-slate-600 hover:bg-brand-primary/5 hover:text-brand-primary rounded-xl transition-all group">
                                <div
                                    class="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-brand-primary/10">
                                    <i class="pi pi-user-edit text-xs"></i>
                                </div>
                                Edit Profile
                            </button>
                            <div class="h-px bg-slate-50 my-1"></div>
                            <button @click="logout"
                                class="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-rose-500 hover:bg-rose-50 rounded-xl transition-all group">
                                <div
                                    class="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center group-hover:bg-rose-100">
                                    <i class="pi pi-sign-out text-xs"></i>
                                </div>
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </header>
</template>

<style scoped>
.animate-in {
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}
</style>
