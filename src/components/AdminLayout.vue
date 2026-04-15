<script setup>
import { useRoute, useRouter } from 'vue-router'
import { ref, onMounted } from 'vue'
import Button from 'primevue/button'
import Avatar from 'primevue/avatar'

const route = useRoute()
const router = useRouter()

const navigation = [
    { name: 'Dashboard', href: '/admin', icon: 'pi pi-home' },
    { name: 'Exams', href: '/admin/exams', icon: 'pi pi-file-edit' },
    { name: 'Questions', href: '/admin/questions', icon: 'pi pi-list' },
    { name: 'Students', href: '/admin/students', icon: 'pi pi-users' },
    { name: 'Reports', href: '/admin/reports', icon: 'pi pi-chart-bar' },
    { name: 'Skills', href: '/admin/skills', icon: 'pi pi-star' },
    { name: 'Partner', href: '/admin/partners', icon: 'pi pi-briefcase' },
    { name: 'Skill Packages', href: '/admin/packages', icon: 'pi pi-box' },
    { name: 'System Requirements', href: '/admin/system-requirements', icon: 'pi pi-cog' },
    { name: 'Payments', href: '/admin/payments', icon: 'pi pi-credit-card' },
    { name: 'Staff & Roles', href: '/admin/staff', icon: 'pi pi-shield' },
]

const isActive = (path) => {
    return route.path === path;
}

const logout = () => {
    localStorage.removeItem('token');
    router.push('/login');
}
</script>

<template>
    <div
        class="flex h-screen bg-slate-50 font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900 overflow-hidden">

        <!-- Sidebar -->
        <aside
            class="w-[280px] bg-slate-900 border-r border-slate-800 shadow-2xl flex flex-col justify-between hidden lg:flex relative z-20">
            <div class="flex-1 flex flex-col">
                <!-- Logo Section -->
                <div class="h-28 flex items-center px-8 mb-4 border-b border-slate-800/50">
                    <div
                        class="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center text-white text-lg font-black shadow-lg shadow-indigo-500/30 mr-4">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3"
                                d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <div>
                        <h1 class="text-xl font-black text-white tracking-tight leading-none mb-1">ArabAcademy<span
                                class="text-indigo-400">.</span></h1>
                        <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Exam
                            Authority</span>
                    </div>
                </div>

                <!-- Navigation -->
                <nav class="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto no-scrollbar">
                    <div class="px-4 mb-3">
                        <p class="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Core Modules</p>
                    </div>
                    <template v-for="item in navigation" :key="item.name">
                        <router-link :to="item.href" :class="[
                            isActive(item.href) ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white',
                            'group flex items-center px-4 py-3.5 text-xs font-bold rounded-xl transition-all duration-300'
                        ]">
                            <i :class="[item.icon, isActive(item.href) ? 'text-white' : 'text-slate-500 group-hover:text-indigo-400']" class="text-lg mr-4 transition-colors"></i>
                            {{ item.name }}
                            <div v-if="isActive(item.href)" class="ml-auto w-1.5 h-1.5 bg-white rounded-full"></div>
                        </router-link>
                    </template>
                </nav>
            </div>

            <!-- User Profile / Bottom Section -->
            <div class="p-6 border-t border-slate-800/50">
                <div
                    class="bg-slate-800/40 rounded-2xl p-4 mb-4 group cursor-pointer hover:bg-slate-800 transition-colors duration-300 border border-slate-700/50">
                    <div class="flex items-center space-x-3">
                        <div class="w-9 h-9 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 shadow-md">
                        </div>
                        <div>
                            <p class="text-xs font-black text-white">Admin Staff</p>
                            <p
                                class="text-[10px] font-bold text-slate-400 group-hover:text-indigo-400 transition-colors">
                                Management Portal</p>
                        </div>
                    </div>
                </div>
                <button @click="logout"
                    class="w-full flex items-center justify-center space-x-2 px-4 py-3 text-[10px] font-black text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-all active:scale-95 uppercase tracking-widest">
                    <i class="pi pi-sign-out text-sm"></i>
                    <span>Secure Sign Out</span>
                </button>
            </div>
        </aside>

        <!-- Main Content -->
        <main class="flex-1 flex flex-col overflow-hidden relative">
            <div
                class="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-100/30 rounded-full blur-3xl -mr-64 -mt-64 pointer-events-none">
            </div>
            <div
                class="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-100/20 rounded-full blur-3xl -ml-64 -mb-64 pointer-events-none">
            </div>

            <!-- Top header -->
            <header
                class="h-24 bg-white/40 backdrop-blur-xl border-b border-white/20 flex items-center justify-between px-10 z-10 sticky top-0">
                <div>
                    <div
                        class="flex items-center space-x-2 text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-1">
                        <span class="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
                        <span>Operational Hub</span>
                    </div>
                    <h2 class="text-2xl font-black text-slate-800 tracking-tight">
                        {{ route.name ? route.name.replace('admin.', '').toUpperCase() : 'SYSTEM OVERVIEW' }}
                    </h2>
                </div>

                <div class="flex items-center space-x-6">
                    <div class="hidden md:flex space-x-3">
                        <Button icon="pi pi-bell" severity="secondary" rounded text aria-label="Notifications" />
                        <Button icon="pi pi-cog" severity="secondary" rounded text aria-label="Settings" />
                    </div>
                    <div class="h-8 w-px bg-slate-200 mx-2"></div>
                    <Button label="New Action" icon="pi pi-plus" size="small" class="font-bold tracking-wide" />
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
