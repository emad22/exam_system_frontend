<script setup>
import { useRoute, useRouter } from 'vue-router'
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import api from '@/services/api'
import Button from 'primevue/button'
import Avatar from 'primevue/avatar'
import { useAdminStore } from '@/stores/admin'

const route = useRoute()
const router = useRouter()
const adminStore = useAdminStore()

const navigation = [
    { name: 'Dashboard', href: '/admin', icon: 'pi pi-home' },
    { name: 'Exams', href: '/admin/exams', icon: 'pi pi-file-edit' },
    { name: 'Exam Categories', href: '/admin/exam-categories', icon: 'pi pi-tags' },
    { name: 'Questions', href: '/admin/questions', icon: 'pi pi-list' },
    { name: 'Levels', href: '/admin/levels', icon: 'pi pi-sort-amount-up' },
    { name: 'Students', href: '/admin/students', icon: 'pi pi-users' },
    { name: 'Reports', href: '/admin/reports', icon: 'pi pi-chart-bar' },
    { name: 'Certificates', href: '/admin/certificates', icon: 'pi pi-award' },
    { name: 'Skills', href: '/admin/skills', icon: 'pi pi-star' },
    { name: 'Partner', href: '/admin/partners', icon: 'pi pi-briefcase' },
    { name: 'Skill Packages', href: '/admin/packages', icon: 'pi pi-box' },
    { name: 'System Requirements', href: '/admin/system-requirements', icon: 'pi pi-cog' },
    { name: 'Payments', href: '/admin/payments', icon: 'pi pi-credit-card' },
    { name: 'Staff & Roles', href: '/admin/staff', icon: 'pi pi-shield' },
    { name: 'Activity Logs', href: '/admin/activity-logs', icon: 'pi pi-history' },
]

const currentUser = computed(() => adminStore.user);
const notifications = computed(() => adminStore.notifications);
const showNotifications = ref(false);
const showUserMenu = ref(false);
const notificationAudio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

const fetchNotifications = async () => {
    await adminStore.fetchNotifications();
};

watch(() => adminStore.notifications.length, (newCount, oldCount) => {
    if (newCount > oldCount) {
        notificationAudio.play().catch(e => console.warn('Audio playback was blocked or failed', e));
    }
});

const toggleNotifications = () => {
    showNotifications.value = !showNotifications.value;
};

const goToReport = async (notif) => {
    try {
        await api.post('/admin/notifications/mark-as-read', { id: notif.id });
        adminStore.markAsRead(notif.id);
    } catch (err) {
        console.error('Failed to mark notification as read', err);
    }

    const isTeacher = currentUser.value?.role === 'teacher';
    const routeName = isTeacher ? 'teacher.reports.show' : 'admin.reports.show';
    
    router.push({ 
        name: routeName, 
        params: { id: notif.data.attempt_id } 
    });
    showNotifications.value = false;
};

const clearNotifications = async () => {
    try {
        await api.post('/admin/notifications/mark-as-read');
        adminStore.clearNotifications();
        showNotifications.value = false;
    } catch (err) {
        console.error('Failed to clear notifications', err);
    }
};

let intervalId = null;

onMounted(async () => {
    try {
        await adminStore.fetchUser();
        
        // Start polling for notifications only if user is authenticated
        fetchNotifications();
        intervalId = setInterval(fetchNotifications, 15000); // Every 15 seconds
    } catch (err) {
        console.error('Failed to load user profile', err);
        if (err.response?.status === 401) {
            router.push('/login');
        }
    }
});

onUnmounted(() => {
    if (intervalId) clearInterval(intervalId);
});

const filteredNavigation = computed(() => {
    if (!currentUser.value) return [];

    const isTeacher = currentUser.value.role === 'teacher';
    let baseNav = navigation;

    if (isTeacher) {
        // Restricted list for Teachers
        const teacherAllowed = ['Dashboard', 'Questions', 'Reports'];
        baseNav = navigation.filter(item => teacherAllowed.includes(item.name));
    }

    // Map hrefs to /teacher if the user is a teacher
    return baseNav.map(item => ({
        ...item,
        href: isTeacher ? item.href.replace('/admin', '/teacher') : item.href
    }));
});

const isActive = (path) => {
    if (path === '/admin' || path === '/teacher') {
        return route.path === path;
    }
    return route.path.startsWith(path);
}

const logout = () => {
    localStorage.removeItem('token');
    router.push('/login');
}

const vClickOutside = {
    mounted(el, binding) {
        el.clickOutsideEvent = (event) => {
            if (!(el === event.target || el.contains(event.target))) {
                binding.value(event);
            }
        };
        // Use a timeout to avoid catching the same click that triggered the mounting
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
    <div
        class="flex h-screen bg-slate-50 font-sans text-slate-900 selection:bg-rose-100 selection:text-indigo-900 overflow-hidden">

        <!-- Sidebar -->
        <aside
            class="w-[280px] h-full bg-white border-r border-slate-200 shadow-xl flex flex-col hidden lg:flex relative z-20">
            
            <!-- Top Section (Logo + Nav) -->
            <div class="flex-1 flex flex-col min-h-0">
                <!-- Logo Section -->
                <div class="h-24 flex items-center px-8 shrink-0 border-b border-slate-100 bg-slate-50/50">
                    <div
                        class="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center text-white text-lg font-black shadow-md shadow-brand-primary/30 mr-4">
                        <i class="pi pi-book"></i>
                    </div>
                    <div>
                        <h1 class="text-xl font-black text-brand-primary tracking-tight leading-none mb-1">Arab<span
                                class="text-brand-accent">Academy</span></h1>
                        <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Management
                            Platform</span>
                    </div>
                </div>

                <!-- Navigation -->
                <nav class="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto no-scrollbar">
                    <div class="px-4 mb-3">
                        <p class="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Core Modules</p>
                    </div>
                    <template v-for="item in filteredNavigation" :key="item.name">
                        <router-link :to="item.href" :class="[
                            isActive(item.href) ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/20' : 'text-slate-600 hover:bg-slate-50 hover:text-brand-primary',
                            'group flex items-center px-4 py-3.5 text-xs font-bold rounded-xl transition-all duration-300 border border-transparent hover:border-slate-100'
                        ]">
                            <i :class="[item.icon, isActive(item.href) ? 'text-white' : 'text-slate-400 group-hover:text-brand-secondary']"
                                class="text-lg mr-4 transition-colors"></i>
                            {{ item.name }}
                            <div v-if="isActive(item.href)" class="ml-auto w-1.5 h-1.5 bg-brand-accent rounded-full">
                            </div>
                        </router-link>
                    </template>
                </nav>
            </div>

            <!-- User Profile / Bottom Section -->
            <div class="p-6 shrink-0 border-t border-slate-100 bg-slate-50/50">
                <div
                    @click="router.push('/profile')"
                    class="bg-white rounded-2xl p-4 mb-4 group cursor-pointer hover:bg-slate-50 transition-colors duration-300 border border-slate-200 shadow-sm">
                    <div class="flex items-center space-x-3">
                        <div
                            class="w-9 h-9 rounded-lg bg-brand-primary flex items-center justify-center text-white shadow-md">
                            <i class="pi pi-user text-sm"></i>
                        </div>
                        <div class="min-w-0">
                            <p class="text-xs font-black text-slate-800 truncate">{{ currentUser?.first_name }} {{
                                currentUser?.last_name }}
                            </p>
                            <p
                                class="text-[10px] font-bold text-slate-400 group-hover:text-brand-primary transition-colors uppercase tracking-widest">
                                {{ currentUser?.role }} Portal</p>
                        </div>
                    </div>
                </div>
                <button @click="logout"
                    class="w-full flex items-center justify-center space-x-2 px-4 py-3 text-[10px] font-black text-rose-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-xl transition-all active:scale-95 uppercase tracking-widest">
                    <i class="pi pi-sign-out text-sm"></i>
                    <span>Secure Sign Out</span>
                </button>
            </div>
        </aside>

        <!-- Main Content -->
        <main class="flex-1 flex flex-col overflow-hidden relative">
            <div
                class="absolute top-0 right-0 w-[500px] h-[500px] bg-rose-100/30 rounded-full blur-3xl -mr-64 -mt-64 pointer-events-none">
            </div>
            <div
                class="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-100/20 rounded-full blur-3xl -ml-64 -mb-64 pointer-events-none">
            </div>

            <!-- Top header -->
            <header
                class="h-24 bg-white/40 backdrop-blur-xl border-b border-white/20 flex items-center justify-between px-10 z-10 sticky top-0">
                <div>
                    <div
                        class="flex items-center space-x-2 text-[10px] font-black text-brand-accent uppercase tracking-[0.2em] mb-1">
                        <span class="w-2 h-2 bg-brand-accent rounded-full animate-pulse"></span>
                        <span>Operational Hub</span>
                    </div>
                    <h2 class="text-2xl font-black text-slate-800 tracking-tight">
                        {{ route.name ? route.name.replace('admin.', '').toUpperCase() : 'SYSTEM OVERVIEW' }}
                    </h2>
                </div>

                <div class="flex items-center space-x-6">
                    <div class="hidden md:flex space-x-3">
                        <div class="relative">
                            <Button @click.stop="toggleNotifications" icon="pi pi-bell" :severity="showNotifications ? 'primary' : 'secondary'" rounded text aria-label="Notifications" />
                            <span v-if="notifications.length > 0" class="absolute top-1 right-1 w-4 h-4 bg-brand-accent text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm animate-bounce">
                                {{ notifications.length }}
                            </span>

                            <!-- Notifications Dropdown -->
                            <div v-if="showNotifications" v-click-outside="() => showNotifications = false" class="absolute right-0 mt-3 w-80 bg-white rounded-[1.5rem] shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in zoom-in duration-200">
                                <div class="p-5 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                                    <h3 class="text-xs font-black text-slate-800 uppercase tracking-widest">Live Activity</h3>
                                    <button @click="clearNotifications" v-if="notifications.length > 0" class="text-[10px] font-bold text-brand-primary hover:text-brand-accent transition-colors">Clear All</button>
                                </div>
                                <div class="max-h-[350px] overflow-y-auto no-scrollbar">
                                    <div v-if="notifications.length === 0" class="p-10 text-center">
                                        <div class="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <i class="pi pi-bell-slash text-slate-300"></i>
                                        </div>
                                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">All caught up!</p>
                                    </div>
                                    <div v-else v-for="notif in notifications" :key="notif.id" 
                                        @click="goToReport(notif)"
                                        class="p-4 border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer group">
                                        <div class="flex items-start space-x-3">
                                            <div :class="[
                                                'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform',
                                                notif.data.type === 'exam_exited' ? 'bg-amber-50' : 'bg-emerald-50'
                                            ]">
                                                <i :class="[
                                                    'pi text-xs',
                                                    notif.data.type === 'exam_exited' ? 'pi-sign-out text-amber-500' : 'pi-check-circle text-emerald-500'
                                                ]"></i>
                                            </div>
                                            <div class="min-w-0 flex-1">
                                                <p class="text-[11px] font-black text-slate-800 leading-snug">{{ notif.data.message }}</p>
                                                <p class="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">{{ new Date(notif.created_at).toLocaleTimeString() }}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
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
