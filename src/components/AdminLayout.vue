<script setup>
import { useRoute, useRouter } from 'vue-router'
import { ref, onMounted } from 'vue'

const route = useRoute()
const router = useRouter()

const navigation = [
    { name: 'Dashboard', href: '/admin', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
    { name: 'Exams', href: '/admin/exams', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { name: 'Questions', href: '/admin/questions', icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { name: 'Students', href: '/admin/students', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { name: 'Reports', href: '/admin/reports', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { name: 'Skills', href: '/admin/skills', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.989-2.386l-.548-.547z' },
    { name: 'Partner', href: '/admin/partners', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.989-2.386l-.548-.547z' },
    { name: 'Payments', href: '/admin/payments', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
    { name: 'Staff & Roles', href: '/admin/staff', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
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
            class="w-80 bg-white border-r border-slate-100 shadow-[20px_0_40px_rgba(0,0,0,0.02)] flex flex-col justify-between hidden lg:flex relative z-20">
            <div class="flex-1 flex flex-col">
                <!-- Logo Section -->
                <div class="h-28 flex items-center px-10 mb-6">
                    <div
                        class="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-xl shadow-indigo-100 mr-4 transform rotate-3 hover:rotate-0 transition-transform duration-500">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3"
                                d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <div>
                        <h1 class="text-2xl font-black text-slate-800 tracking-tight leading-none mb-1">ArabAcademy<span
                                class="text-indigo-600">.</span></h1>
                        <span class="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Exam
                            Authority</span>
                    </div>
                </div>

                <!-- Navigation -->
                <nav class="flex-1 px-6 space-y-1 overflow-y-auto no-scrollbar">
                    <template v-for="item in navigation" :key="item.name">
                        <router-link :to="item.href" :class="[
                            isActive(item.href) ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 translate-x-2' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-700 hover:translate-x-1',
                            'group flex items-center px-6 py-4 text-sm font-black rounded-[1.25rem] transition-all duration-300 active:scale-95'
                        ]">
                            <svg :class="[isActive(item.href) ? 'text-white' : 'text-slate-300 group-hover:text-indigo-400']"
                                class="w-5 h-5 mr-4 transition-colors" fill="none" stroke="currentColor"
                                viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="item.icon" />
                            </svg>
                            {{ item.name }}
                            <div v-if="isActive(item.href)" class="ml-auto w-1.5 h-1.5 bg-white rounded-full"></div>
                        </router-link>
                    </template>
                </nav>
            </div>

            <!-- User Profile / Bottom Section -->
            <div class="p-8 border-t border-slate-50">
                <div
                    class="bg-slate-50 rounded-3xl p-5 mb-4 group cursor-pointer hover:bg-indigo-50 transition-colors duration-300">
                    <div class="flex items-center space-x-3">
                        <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 shadow-md">
                        </div>
                        <div>
                            <p class="text-xs font-black text-slate-800">Admin Staff</p>
                            <p
                                class="text-[10px] font-bold text-slate-400 group-hover:text-indigo-500 transition-colors">
                                Management
                                Portal</p>
                        </div>
                    </div>
                </div>
                <button @click="logout"
                    class="w-full flex items-center justify-center space-x-2 px-6 py-4 text-xs font-black text-red-500 hover:bg-red-50 rounded-2xl transition-all active:scale-95 border border-transparent hover:border-red-100">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>SIGN OUT SECURELY</span>
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
                    <div class="hidden md:flex space-x-4">
                        <button
                            class="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-100 transition shadow-sm">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                        </button>
                        <button
                            class="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-100 transition shadow-sm">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </button>
                    </div>
                    <div class="h-10 w-px bg-slate-100"></div>
                    <button
                        class="bg-indigo-600 text-white font-black text-[10px] tracking-widest uppercase px-6 py-3 rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition active:scale-95">
                        New Action
                    </button>
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
