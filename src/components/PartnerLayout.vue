<script setup>
import { useRoute, useRouter } from 'vue-router'
import { ref, onMounted, computed } from 'vue'
import Button from 'primevue/button'
import { useAdminStore } from '@/stores/admin'

const route = useRoute()
const router = useRouter()
const adminStore = useAdminStore()

const navigation = [
    { name: 'Dashboard', href: '/partner', icon: 'pi pi-home' },
    { name: 'Student Reports', href: '/partner/reports', icon: 'pi pi-chart-bar' },
]

const currentUser = computed(() => adminStore.user);
const showUserMenu = ref(false);

onMounted(async () => {
    try {
        await adminStore.fetchUser();
    } catch (err) {
        console.error('Failed to load user profile', err);
        if (err.response?.status === 401) {
            router.push('/login');
        }
    }
});

const isActive = (path) => {
    if (path === '/partner') {
        return route.path === path;
    }
    return route.path.startsWith(path);
}

const logout = () => {
    sessionStorage.clear();
    router.push('/login');
}

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

const resolveUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
    const storageBase = baseUrl.replace('/api/v1', '/storage').replace('/api', '/storage');
    return `${storageBase}/${path.replace('storage/', '')}`;
};
</script>

<template>
    <div class="flex h-screen bg-slate-50 font-sans text-slate-900 selection:bg-rose-100 selection:text-indigo-900 overflow-hidden">
        <!-- Sidebar -->
        <aside class="w-[280px] h-full bg-white border-r border-slate-200 shadow-xl flex flex-col hidden lg:flex relative z-20">
            <!-- Top Section (Logo + Nav) -->
            <div class="flex-1 flex flex-col min-h-0">
                <!-- Logo Section -->
                <div class="h-24 flex items-center px-8 shrink-0 border-b border-slate-100 bg-slate-50/50">
                    <img src="/logo.png" alt="Arab Academy" class="h-14 w-auto max-w-[190px] object-contain" />
                </div>

                <!-- Navigation -->
                <nav class="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto no-scrollbar">
                    <template v-for="item in navigation" :key="item.name">
                        <router-link :to="item.href" :class="[
                            isActive(item.href) ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/20' : 'text-slate-600 hover:bg-slate-50 hover:text-brand-primary',
                            'group flex items-center px-4 py-3.5 text-xs font-bold rounded-xl transition-all duration-300 border border-transparent hover:border-slate-100'
                        ]">
                            <i :class="[item.icon, isActive(item.href) ? 'text-white' : 'text-slate-400 group-hover:text-brand-secondary']"
                                class="text-lg mr-4 transition-colors"></i>
                            {{ item.name }}
                            <div v-if="isActive(item.href)" class="ml-auto w-1.5 h-1.5 bg-brand-accent rounded-full"></div>
                        </router-link>
                    </template>
                </nav>
            </div>

            <!-- User Profile / Bottom Section -->
            <div class="p-6 shrink-0 border-t border-slate-100 bg-slate-50/50">
                <div @click="router.push('/profile')" class="bg-white rounded-2xl p-4 mb-4 group cursor-pointer hover:bg-slate-50 transition-colors duration-300 border border-slate-200 shadow-sm">
                    <div class="flex items-center space-x-3">
                        <div class="w-9 h-9 rounded-lg bg-brand-primary flex items-center justify-center text-white shadow-md">
                            <i class="pi pi-briefcase text-sm"></i>
                        </div>
                        <div class="min-w-0">
                            <p class="text-xs font-black text-slate-800 truncate">{{ currentUser?.first_name }} {{ currentUser?.last_name }}</p>
                            <p class="text-[10px] font-bold text-slate-400 group-hover:text-brand-primary transition-colors uppercase tracking-widest">Partner Portal</p>
                        </div>
                    </div>
                </div>
                <button @click="logout" class="w-full flex items-center justify-center space-x-2 px-4 py-3 text-[10px] font-black text-rose-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-xl transition-all active:scale-95 uppercase tracking-widest">
                    <i class="pi pi-sign-out text-sm"></i>
                    <span>Secure Sign Out</span>
                </button>
            </div>
        </aside>

        <!-- Main Content -->
        <main class="flex-1 flex flex-col overflow-hidden relative">
            <div class="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-100/30 rounded-full blur-3xl -mr-64 -mt-64 pointer-events-none"></div>
            <div class="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-100/20 rounded-full blur-3xl -ml-64 -mb-64 pointer-events-none"></div>

            <!-- Top header -->
            <header class="h-24 bg-white/40 backdrop-blur-xl border-b border-white/20 flex items-center justify-between px-10 z-10 sticky top-0">
                <div>
                    <div class="flex items-center space-x-2 text-[10px] font-black text-brand-accent uppercase tracking-[0.2em] mb-1">
                        <span class="w-2 h-2 bg-brand-accent rounded-full animate-pulse"></span>
                        <span>Partner Hub</span>
                    </div>
                    <h2 class="text-2xl font-black text-slate-800 tracking-tight">
                        {{ route.name ? (route.name === 'partner' ? 'DASHBOARD' : route.name.replace('partner.', '').toUpperCase()) : 'PARTNER PORTAL' }}
                    </h2>
                </div>

                <div class="flex items-center space-x-6">
                    <div class="hidden md:flex space-x-3">
                        <!-- User Profile Dropdown -->
                        <div class="relative">
                            <div @click.stop="showUserMenu = !showUserMenu" class="flex items-center gap-2 bg-white/50 hover:bg-white p-1.5 pr-3 rounded-2xl border border-slate-100 cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md group">
                                <div class="w-9 h-9 rounded-xl bg-brand-primary/10 flex items-center justify-center overflow-hidden border border-brand-primary/20">
                                    <img v-if="currentUser?.avatar" :src="resolveUrl(currentUser.avatar)" class="w-full h-full object-cover" />
                                    <i v-else class="pi pi-user text-brand-primary"></i>
                                </div>
                                <i class="pi pi-chevron-down text-[10px] text-slate-400 group-hover:text-brand-primary transition-transform duration-300" :class="{'rotate-180': showUserMenu}"></i>
                            </div>

                            <!-- Dropdown Menu -->
                            <div v-if="showUserMenu" v-click-outside="() => showUserMenu = false" class="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in zoom-in duration-200">
                                <div class="p-4 border-b border-slate-50 bg-slate-50/50">
                                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Signed in as</p>
                                    <p class="text-xs font-black text-slate-800 truncate">{{ currentUser?.name || currentUser?.username }}</p>
                                </div>
                                <div class="p-2">
                                    <button @click="router.push('/profile'); showUserMenu = false" class="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-slate-600 hover:bg-brand-primary/5 hover:text-brand-primary rounded-xl transition-all group">
                                        <div class="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-brand-primary/10">
                                            <i class="pi pi-user-edit text-xs"></i>
                                        </div>
                                        Edit Profile
                                    </button>
                                    <div class="h-px bg-slate-50 my-1"></div>
                                    <button @click="logout" class="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-rose-500 hover:bg-rose-50 rounded-xl transition-all group">
                                        <div class="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center group-hover:bg-rose-100">
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

            <!-- Dynamic Page Content -->
            <div class="flex-1 overflow-y-auto no-scrollbar p-6 md:p-10 bg-slate-50/20 relative z-0">
                <slot />
            </div>
        </main>
    </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
    display: none;
}
.no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
}
</style>
