<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import api from '@/services/api';
import RequirementTester from '@/components/RequirementTester.vue';
import StudentHeader from '@/components/StudentHeader.vue';
import Button from 'primevue/button';

const router = useRouter();
const requirements = ref([]);
const checkedRequirements = ref([]);
const autoVerifiedIds = ref([]);
const activeTesterReq = ref(null);
const isLoading = ref(true);

const fetchRequirements = async () => {
    isLoading.value = true;
    try {
        const res = await api.get('/public/system-requirements');
        requirements.value = res.data;
        autoVerifyRequirements(res.data);
    } catch (err) {
        console.error('Failed to fetch requirements', err);
    } finally {
        isLoading.value = false;
    }
};

const autoVerifyRequirements = (reqs) => {
    const ua = navigator.userAgent.toLowerCase();
    const isOnline = navigator.onLine;
    const isChrome = ua.includes('chrome') && !ua.includes('edg');
    const isEdge = ua.includes('edg');
    const isDesktop = !/android|iphone|ipad|mobile/.test(ua);
    const hasMediaDevices = !!(navigator.mediaDevices);

    reqs.forEach(req => {
        if (req.test_type && req.test_type !== 'none') return;

        const cat = req.category?.toLowerCase();
        const title = req.title?.toLowerCase();
        let verified = false;
        
        if (cat === 'internet' || title.includes('internet')) verified = isOnline;
        else if (cat === 'browser' || title.includes('chrome')) verified = (isChrome || isEdge) && isDesktop;
        else if (cat === 'hardware' || title.includes('audio')) verified = hasMediaDevices;

        if (verified) {
            autoVerifiedIds.value.push(req.id);
            if (!checkedRequirements.value.includes(req.id)) checkedRequirements.value.push(req.id);
        }
    });
};

const toggleRequirement = (req) => {
    if (autoVerifiedIds.value.includes(req.id)) return;
    
    if (req.test_type && req.test_type !== 'none' && !checkedRequirements.value.includes(req.id)) {
        activeTesterReq.value = req;
        return;
    }

    const index = checkedRequirements.value.indexOf(req.id);
    if (index === -1) checkedRequirements.value.push(req.id);
    else checkedRequirements.value.splice(index, 1);
};

const handleTestPassed = (req) => {
    if (!checkedRequirements.value.includes(req.id)) {
        checkedRequirements.value.push(req.id);
    }
    activeTesterReq.value = null;
};

const canProceed = computed(() => {
    const mandatoryIds = requirements.value.filter(r => r.is_mandatory).map(r => r.id);
    return mandatoryIds.every(id => checkedRequirements.value.includes(id));
});

const proceed = () => {
    router.push('/skill-selection');
};

onMounted(fetchRequirements);
</script>

<template>
    <div class="h-screen bg-[#F8FAFC] flex flex-col relative overflow-hidden font-sans">
        <StudentHeader />
        
        <!-- Background Decoration -->
        <div class="absolute inset-0 pointer-events-none z-0">
            <div class="absolute top-[20%] -left-[10%] w-[50%] h-[50%] bg-brand-primary/5 rounded-full blur-[150px]"></div>
            <div class="absolute bottom-[20%] -right-[10%] w-[40%] h-[40%] bg-brand-accent/5 rounded-full blur-[150px]"></div>
        </div>

        <!-- Main Content -->
        <main class="flex-grow flex items-center justify-center p-4 relative z-10 overflow-hidden">
            <div class="w-full max-w-5xl h-full max-h-[min(800px,calc(100vh-120px))] bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col md:flex-row animate-in fade-in zoom-in duration-700">
                
                <!-- Left Panel: Info & Illustration -->
                <div class="w-full md:w-2/5 bg-slate-900 p-10 md:p-16 text-white flex flex-col justify-between relative overflow-hidden">
                    <div class="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                    <div class="absolute bottom-0 left-0 w-48 h-48 bg-brand-primary/10 rounded-full -ml-24 -mb-24 blur-3xl"></div>
                    
                    <div class="relative z-10">
                        <div class="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-3xl mb-10 shadow-xl border border-white/10">
                            <i class="pi pi-shield"></i>
                        </div>
                        <h1 class="text-4xl font-black tracking-tight uppercase mb-6 leading-[1.1]">System <br/> Readiness <br/> Check</h1>
                    </div>

                    <div class="relative z-10 space-y-4">
                        <div class="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-sm">
                            <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span class="text-[10px] font-black uppercase tracking-widest text-white/80">Proctoring System Active</span>
                        </div>
                    </div>
                </div>

                <!-- Right Panel: Requirements List -->
                <div class="w-full md:w-3/5 p-10 md:p-16 flex flex-col h-full bg-white">
                    <div class="flex-grow">
                        <div class="flex justify-between items-end mb-10">
                            <div>
                                <h2 class="text-xl font-black text-slate-800 uppercase tracking-tight">Required Checks</h2>
                                <p class="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Verify all mandatory items to proceed</p>
                            </div>
                            <div class="text-right">
                                <span class="text-3xl font-black text-slate-200">{{ checkedRequirements.length }}/{{ requirements.length }}</span>
                            </div>
                        </div>

                        <div v-if="isLoading" class="flex flex-col items-center justify-center h-64">
                            <div class="w-12 h-12 border-4 border-slate-100 border-t-brand-primary rounded-full animate-spin"></div>
                            <p class="mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Analyzing System...</p>
                        </div>

                        <div v-else class="h-full overflow-y-auto pr-2 custom-scrollbar pb-20">
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div v-for="req in requirements" :key="req.id" 
                                    @click="toggleRequirement(req)"
                                    class="group flex items-center gap-4 p-5 rounded-2xl border-2 transition-all cursor-pointer relative"
                                    :class="checkedRequirements.includes(req.id) 
                                        ? 'border-emerald-100 bg-emerald-50/20' 
                                        : 'border-slate-50 bg-slate-50/50 hover:border-brand-primary/20 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50'">
                                    
                                    <div class="w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-all duration-500 shrink-0"
                                        :class="checkedRequirements.includes(req.id) ? 'bg-emerald-500 text-white' : 'bg-white text-slate-400 group-hover:text-brand-primary group-hover:scale-110 shadow-sm'">
                                        <i v-if="checkedRequirements.includes(req.id)" class="pi pi-check"></i>
                                        <i v-else :class="req.icon || 'pi pi-cog'"></i>
                                    </div>

                                    <div class="min-w-0">
                                        <h3 class="text-xs font-black text-slate-800 uppercase tracking-tight truncate">{{ req.title }}</h3>
                                        <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">{{ req.category || 'System' }}</p>
                                    </div>

                                    <div v-if="req.is_mandatory && !checkedRequirements.includes(req.id)" class="absolute top-2 right-2">
                                        <div class="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-sm shadow-rose-200"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Footer Action -->
                    <div class="mt-10 pt-10 border-t border-slate-50">
                        <button @click="proceed" :disabled="!canProceed"
                            class="group relative w-full py-6 rounded-2xl font-black text-sm uppercase tracking-[0.3em] transition-all duration-500 shadow-2xl disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed"
                            :class="canProceed 
                                ? 'bg-slate-900 text-white hover:bg-brand-primary hover:shadow-brand-primary/40 hover:-translate-y-1' 
                                : 'bg-slate-100 text-slate-400'">
                            <span class="flex items-center justify-center gap-3">
                                {{ canProceed ? 'Confirm & Continue' : 'Check Mandatory Items' }}
                                <i v-if="canProceed" class="pi pi-arrow-right text-[10px] group-hover:translate-x-1 transition-transform"></i>
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </main>

        <!-- Requirement Tester Modal -->
        <RequirementTester 
            v-if="activeTesterReq" 
            :requirement="activeTesterReq"
            @close="activeTesterReq = null"
            @passed="handleTestPassed"
        />
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
    background: #E2E8F0;
    border-radius: 10px;
}
</style>
