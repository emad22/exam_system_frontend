<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import api from '@/services/api';

const props = defineProps({
    visible: { type: Boolean, default: false },
    mode: { type: String, default: 'book' }, // 'book' | 'reschedule'
});

const emit = defineEmits(['close', 'booked']);

const slots = ref([]);
const selectedSlotId = ref(null);
const isLoading = ref(false);
const isSubmitting = ref(false);
const errorMsg = ref('');
const successMsg = ref('');

const groupedSlots = computed(() => slots.value);

const fetchSlots = async () => {
    isLoading.value = true;
    errorMsg.value = '';
    try {
        const { data } = await api.get('/live-speaking/slots');
        slots.value = data.slots || [];
    } catch (e) {
        errorMsg.value = 'Failed to load available slots.';
    } finally {
        isLoading.value = false;
    }
};

const confirmBooking = async () => {
    if (!selectedSlotId.value) return;
    isSubmitting.value = true;
    errorMsg.value = '';
    try {
        const endpoint = props.mode === 'reschedule' ? '/live-speaking/reschedule' : '/live-speaking/book';
        const { data } = await api.post(endpoint, { slot_id: selectedSlotId.value });
        successMsg.value = data.message || 'Booking confirmed successfully!';
        emit('booked', data.booking);
        setTimeout(() => { emit('close'); }, 1800);
    } catch (e) {
        errorMsg.value = e?.response?.data?.message || 'An error occurred, please try again.';
    } finally {
        isSubmitting.value = false;
    }
};

watch(() => props.visible, (val) => {
    if (val) {
        selectedSlotId.value = null;
        errorMsg.value = '';
        successMsg.value = '';
        fetchSlots();
    }
});

onMounted(() => {
    if (props.visible) fetchSlots();
});
</script>

<template>
    <Teleport to="body">
        <Transition name="modal">
            <div v-if="visible"
                class="fixed inset-0 z-50 flex items-center justify-center p-4"
                @click.self="emit('close')">

                <!-- Backdrop -->
                <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"></div>

                <!-- Modal Card -->
                <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

                    <!-- Header -->
                    <div class="bg-gradient-to-r from-[#0EA5E9] to-[#6366F1] px-6 py-5">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-3">
                                <div class="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                                    <i class="pi pi-video text-white text-base"></i>
                                </div>
                                <div>
                                    <h2 class="text-white font-black text-sm uppercase tracking-wide">
                                         {{ mode === 'reschedule' ? 'Reschedule Session' : 'Book Live Speaking Session' }}
                                    </h2>
                                    <p class="text-white/70 text-[10px] font-medium mt-0.5">Select a suitable date and time</p>
                                </div>
                            </div>
                            <button @click="emit('close')"
                                class="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                                <i class="pi pi-times text-white text-xs"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Body -->
                    <div class="p-6 max-h-[60vh] overflow-y-auto">

                        <!-- Loading -->
                        <div v-if="isLoading" class="flex flex-col items-center justify-center py-12 gap-3">
                            <div class="w-10 h-10 border-3 border-slate-100 border-t-[#0EA5E9] rounded-full animate-spin"></div>
                            <p class="text-slate-400 text-xs font-medium">Loading available slots...</p>
                        </div>

                        <!-- No Slots -->
                        <div v-else-if="!slots.length" class="text-center py-10">
                            <div class="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                                <i class="pi pi-calendar-times text-slate-400 text-2xl"></i>
                            </div>
                            <p class="text-slate-600 font-bold text-sm">No available slots at the moment</p>
                            <p class="text-slate-400 text-xs mt-1">Please check back later or contact administration.</p>
                        </div>

                        <!-- Slot Groups -->
                        <div v-else class="space-y-5">
                            <div v-for="group in slots" :key="group.date">
                                <!-- Date Header -->
                                <div class="flex items-center gap-2 mb-3">
                                    <div class="h-px flex-1 bg-slate-100"></div>
                                    <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">
                                        {{ group.day_name }} &nbsp;·&nbsp; {{ group.date }}
                                    </span>
                                    <div class="h-px flex-1 bg-slate-100"></div>
                                </div>

                                <!-- Slots Grid -->
                                <div class="grid grid-cols-2 gap-2">
                                    <button v-for="slot in group.slots" :key="slot.id"
                                        @click="selectedSlotId = slot.id"
                                        :disabled="slot.available_seats === 0"
                                        class="relative p-3 rounded-xl border-2 text-left transition-all duration-200"
                                        :class="[
                                            slot.available_seats === 0 ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed' :
                                            selectedSlotId === slot.id
                                                ? 'border-[#0EA5E9] bg-[#F0F9FF] shadow-md shadow-[#0EA5E9]/15'
                                                : 'border-slate-200 bg-white hover:border-[#0EA5E9]/50 hover:bg-[#F0F9FF]/50'
                                        ]">
                                        <!-- Selected indicator -->
                                        <div v-if="selectedSlotId === slot.id"
                                            class="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#0EA5E9] flex items-center justify-center">
                                            <i class="pi pi-check text-white" style="font-size:8px"></i>
                                        </div>
                                        <p class="font-black text-slate-800 text-sm">
                                            {{ slot.start_time }} <span class="text-slate-400 font-medium">–</span> {{ slot.end_time }}
                                        </p>
                                        <p v-if="slot.teacher_name" class="text-[10px] text-indigo-600 font-bold mt-0.5">
                                            Examiner: {{ slot.teacher_name }}
                                        </p>
                                        <div class="flex items-center gap-1 mt-1">
                                            <div class="w-1.5 h-1.5 rounded-full"
                                                :class="slot.available_seats > 1 ? 'bg-emerald-500' : slot.available_seats === 1 ? 'bg-amber-500' : 'bg-slate-300'">
                                            </div>
                                            <span class="text-[10px] font-medium"
                                                :class="slot.available_seats > 1 ? 'text-emerald-600' : slot.available_seats === 1 ? 'text-amber-600' : 'text-slate-400'">
                                                {{ slot.available_seats === 0 ? 'Full' : `${slot.available_seats} seat${slot.available_seats > 1 ? 's' : ''} available` }}
                                            </span>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Error -->
                        <div v-if="errorMsg"
                            class="mt-4 flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-lg px-4 py-3">
                            <i class="pi pi-exclamation-circle text-rose-500 text-sm"></i>
                            <span class="text-rose-700 text-xs font-medium">{{ errorMsg }}</span>
                        </div>

                        <!-- Success -->
                        <div v-if="successMsg"
                            class="mt-4 flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
                            <i class="pi pi-check-circle text-emerald-500 text-sm"></i>
                            <span class="text-emerald-700 text-xs font-bold">{{ successMsg }}</span>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div class="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
                        <button @click="emit('close')"
                            class="px-5 py-2 rounded-xl border border-slate-200 text-slate-500 font-bold text-xs hover:bg-slate-100 transition-colors">
                            Cancel
                        </button>
                        <button @click="confirmBooking"
                            :disabled="!selectedSlotId || isSubmitting"
                            class="px-6 py-2 rounded-xl bg-gradient-to-r from-[#0EA5E9] to-[#6366F1] text-white font-black text-xs uppercase tracking-wide shadow-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-md hover:shadow-[#0EA5E9]/25 flex items-center gap-2">
                            <i v-if="isSubmitting" class="pi pi-spin pi-spinner text-xs"></i>
                            <span>{{ isSubmitting ? 'Processing...' : (mode === 'reschedule' ? 'Confirm Reschedule' : 'Confirm Booking') }}</span>
                        </button>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.modal-enter-from,
.modal-leave-to {
    opacity: 0;
    transform: scale(0.95);
}
</style>
