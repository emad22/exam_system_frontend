<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';
import Button from 'primevue/button';
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import Select from 'primevue/select';
import InputNumber from 'primevue/inputnumber';
import ToggleSwitch from 'primevue/toggleswitch';
import Dialog from 'primevue/dialog';
import { useModal } from '@/composables/useModal';

const { showAlert, showConfirm } = useModal();

// ── Active Tab ────────────────────────────────────────────────────────────────
const tab = ref('slots');
const tabs = [
    { id: 'settings',     label: 'General Settings',      icon: 'pi-cog' },
    { id: 'partners',     label: 'Partners Activation',   icon: 'pi-building' },
    { id: 'slots',        label: 'Slots & Schedules',     icon: 'pi-calendar' },
    { id: 'availability', label: 'Teacher Availability',  icon: 'pi-users' },
    { id: 'bookings',     label: 'Bookings',              icon: 'pi-list' },
];

// ── Global Feedback ───────────────────────────────────────────────────────────
const toast = ref({ show: false, type: 'success', text: '' });
let toastTimer = null;
const notify = (text, type = 'success') => {
    clearTimeout(toastTimer);
    toast.value = { show: true, type, text };
    toastTimer = setTimeout(() => { toast.value.show = false; }, 3500);
};
const request = async (action) => {
    try { return await action(); }
    catch (e) { notify(e?.response?.data?.message || 'Operation failed. Please try again.', 'error'); throw e; }
};

// ══════════════════════════════════════════════════════════════════════════════
// TAB 1 — SETTINGS
// ══════════════════════════════════════════════════════════════════════════════
const settings = ref({
    slot_duration_minutes: 25,
    buffer_minutes: 5,
    cutoff_hours: 2,
    max_reschedules: 1,
    is_enabled: false,
});
const savingSettings  = ref(false);
const loadingSettings = ref(false);

const loadSettings = async () => {
    loadingSettings.value = true;
    const { data } = await request(() => api.get('/admin/live-speaking/settings'));
    if (data.settings) Object.assign(settings.value, data.settings);
    loadingSettings.value = false;
};

const saveSettings = async () => {
    savingSettings.value = true;
    await request(() => api.post('/admin/live-speaking/settings', settings.value));
    savingSettings.value = false;
    notify('General settings saved successfully.');
};

// ══════════════════════════════════════════════════════════════════════════════
// TAB 2 — PARTNERS ACTIVATION
// ══════════════════════════════════════════════════════════════════════════════
const partnersList    = ref([]);
const loadingPartners = ref(false);
const partnerSearch   = ref('');
const showPartnerModal = ref(false);
const editingPartnerSettings = ref(null);
const savingPartnerSettings = ref(false);
const savingAllPartners = ref(false);
const hasUnsavedPartnerChanges = ref(false);

const loadPartners = async () => {
    loadingPartners.value = true;
    try {
        const { data } = await request(() => api.get('/admin/live-speaking/partners'));
        partnersList.value = data.partners || [];
        hasUnsavedPartnerChanges.value = false;
    } catch (e) {}
    loadingPartners.value = false;
};

const enabledPartnersCount = computed(() => {
    return partnersList.value.filter(p => p.is_enabled).length;
});

const filteredPartners = computed(() => {
    if (!partnerSearch.value.trim()) return partnersList.value;
    const q = partnerSearch.value.toLowerCase();
    return partnersList.value.filter(p =>
        (p.partner_name && p.partner_name.toLowerCase().includes(q)) ||
        (p.id && String(p.id).includes(q))
    );
});

const onPartnerToggle = (partner) => {
    partner.is_enabled = !partner.is_enabled;
    hasUnsavedPartnerChanges.value = true;
};

const enableAllPartners = () => {
    partnersList.value.forEach(p => { p.is_enabled = true; });
    hasUnsavedPartnerChanges.value = true;
};

const disableAllPartners = () => {
    partnersList.value.forEach(p => { p.is_enabled = false; });
    hasUnsavedPartnerChanges.value = true;
};

const saveAllPartners = async () => {
    savingAllPartners.value = true;
    try {
        const payload = {
            partners: partnersList.value.map(p => ({
                id: p.id,
                is_enabled: !!p.is_enabled,
            }))
        };
        const { data } = await request(() => api.post('/admin/live-speaking/partners/save-bulk', payload));
        notify(data?.message || 'Partner settings saved successfully.');
        hasUnsavedPartnerChanges.value = false;
        await loadPartners();
    } finally {
        savingAllPartners.value = false;
    }
};

const openPartnerSettings = (partner) => {
    editingPartnerSettings.value = {
        partner_id: partner.id,
        partner_name: partner.partner_name,
        slot_duration_minutes: partner.slot_duration_minutes || 25,
        buffer_minutes: partner.buffer_minutes || 5,
        cutoff_hours: partner.cutoff_hours || 2,
        max_reschedules: partner.max_reschedules || 1,
        is_enabled: partner.is_enabled,
    };
    showPartnerModal.value = true;
};

const savePartnerCustomSettings = async () => {
    if (!editingPartnerSettings.value) return;
    savingPartnerSettings.value = true;
    try {
        await request(() => api.post('/admin/live-speaking/settings', editingPartnerSettings.value));
        notify(`Custom settings for ${editingPartnerSettings.value.partner_name} saved.`);
        showPartnerModal.value = false;
        await loadPartners();
    } finally {
        savingPartnerSettings.value = false;
    }
};

// ══════════════════════════════════════════════════════════════════════════════
// TAB 3 — TEACHER AVAILABILITY
// ══════════════════════════════════════════════════════════════════════════════
const teachers       = ref([]);
const availabilities = ref([]);
const loadingAvail   = ref(false);
const savingAvail    = ref(false);
const avForm = ref({
    teacher_id:  '',
    day_of_week: 'monday',
    start_time:  '09:00',
    end_time:    '12:00',
});

const dayOptions = [
    { label: 'Monday',    value: 'monday'    },
    { label: 'Tuesday',   value: 'tuesday'   },
    { label: 'Wednesday', value: 'wednesday' },
    { label: 'Thursday',  value: 'thursday'  },
    { label: 'Friday',    value: 'friday'    },
    { label: 'Saturday',  value: 'saturday'  },
    { label: 'Sunday',    value: 'sunday'    },
];

const loadAvailability = async () => {
    loadingAvail.value = true;
    const { data } = await request(() => api.get('/admin/live-speaking/teachers/availability'));
    teachers.value       = data.teachers       || [];
    availabilities.value = data.availabilities || [];
    loadingAvail.value   = false;
};

const addAvailability = async () => {
    if (!avForm.value.teacher_id) { notify('Please select a teacher.', 'error'); return; }
    savingAvail.value = true;
    await request(() => api.post('/admin/live-speaking/teachers/availability', avForm.value));
    await loadAvailability();
    savingAvail.value = false;
    notify('Availability slot added.');
};

const removeAvailability = async (id) => {
    if (!(await showConfirm('Remove this availability slot?'))) return;
    await request(() => api.delete(`/admin/live-speaking/teachers/availability/${id}`));
    await loadAvailability();
    notify('Availability slot removed.');
};

// ══════════════════════════════════════════════════════════════════════════════
// TAB 4 — SLOTS & SCHEDULES
// ══════════════════════════════════════════════════════════════════════════════
const slots             = ref([]);
const loadingSlots      = ref(false);
const creatingSlots     = ref(false);
const slotDateFilter    = ref('');
const slotPartnerFilter = ref(null);
const slotTeacherFilter = ref(null);

const slotForm = ref({
    slot_date: '',
    range_start: '14:00',
    range_end: '16:00',
    partner_id: null,
    teacher_ids: [],
    allocation_mode: 'alternating', // 'alternating' | 'concurrent'
    slot_duration_minutes: 30,
    buffer_minutes: 0,
});

const toggleTeacherSelection = (teacherId) => {
    const idx = slotForm.value.teacher_ids.indexOf(teacherId);
    if (idx >= 0) {
        slotForm.value.teacher_ids.splice(idx, 1);
    } else {
        slotForm.value.teacher_ids.push(teacherId);
    }
};

const selectAllTeachers = () => {
    slotForm.value.teacher_ids = teachers.value.map(t => t.id);
};

const clearTeacherSelection = () => {
    slotForm.value.teacher_ids = [];
};

const generatedSlots = ref([]);

const teacherDropdownOptions = computed(() => [
    { label: '👤 Any Available Teacher', value: null },
    ...teachers.value.map(t => ({
        label: `${t.first_name} ${t.last_name}`,
        value: t.id
    }))
]);

const recalculateSlots = () => {
    const duration = Number(slotForm.value.slot_duration_minutes) || 30;
    const buffer = Number(slotForm.value.buffer_minutes) || 0;
    const step = duration + buffer;
    if (step <= 0 || duration <= 0) {
        generatedSlots.value = [];
        return;
    }

    if (!slotForm.value.range_start || !slotForm.value.range_end) {
        generatedSlots.value = [];
        return;
    }

    const [startH, startM] = slotForm.value.range_start.split(':').map(Number);
    const [endH, endM] = slotForm.value.range_end.split(':').map(Number);
    if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) {
        generatedSlots.value = [];
        return;
    }

    let startTotal = startH * 60 + startM;
    let endTotal = endH * 60 + endM;
    if (endTotal <= startTotal) {
        generatedSlots.value = [];
        return;
    }

    const selectedTeacherIds = slotForm.value.teacher_ids;
    const list = [];
    let iter = 0;

    const fmt = (mins) => {
        const h = String(Math.floor(mins / 60)).padStart(2, '0');
        const m = String(mins % 60).padStart(2, '0');
        return `${h}:${m}`;
    };

    while (startTotal + duration <= endTotal) {
        const slotEnd = startTotal + duration;

        if (slotForm.value.allocation_mode === 'concurrent' && selectedTeacherIds.length > 1) {
            selectedTeacherIds.forEach(tId => {
                list.push({
                    id: 'temp_' + Date.now() + '_' + Math.random(),
                    start_time: fmt(startTotal),
                    end_time: fmt(slotEnd),
                    teacher_id: tId,
                    capacity: 1,
                });
            });
        } else {
            let assignedTeacherId = null;
            if (selectedTeacherIds.length > 0) {
                assignedTeacherId = selectedTeacherIds[iter % selectedTeacherIds.length];
            }
            list.push({
                id: 'temp_' + Date.now() + '_' + Math.random(),
                start_time: fmt(startTotal),
                end_time: fmt(slotEnd),
                teacher_id: assignedTeacherId,
                capacity: 1,
            });
        }

        startTotal += step;
        iter++;
    }

    generatedSlots.value = list;
};

const removePreviewSlot = (index) => {
    generatedSlots.value.splice(index, 1);
};

const addCustomPreviewSlot = () => {
    let newStart = '14:00';
    let newEnd = '14:30';
    if (generatedSlots.value.length > 0) {
        const last = generatedSlots.value[generatedSlots.value.length - 1];
        newStart = last.end_time;
        const [h, m] = newStart.split(':').map(Number);
        const total = h * 60 + m + (Number(slotForm.value.slot_duration_minutes) || 30);
        const nh = String(Math.floor(total / 60)).padStart(2, '0');
        const nm = String(total % 60).padStart(2, '0');
        newEnd = `${nh}:${nm}`;
    }
    generatedSlots.value.push({
        id: 'custom_' + Date.now() + '_' + Math.random(),
        start_time: newStart,
        end_time: newEnd,
        teacher_id: slotForm.value.teacher_ids[0] || null,
        capacity: 1,
    });
};

const teacherSlotsSummary = computed(() => {
    const summary = {};
    generatedSlots.value.forEach(s => {
        const key = s.teacher_id ? String(s.teacher_id) : 'unassigned';
        if (!summary[key]) {
            const tObj = teachers.value.find(t => String(t.id) === String(s.teacher_id));
            summary[key] = {
                teacher_id: s.teacher_id,
                teacher_name: tObj ? `${tObj.first_name} ${tObj.last_name}` : 'Any Available Teacher',
                slots: []
            };
        }
        summary[key].slots.push(`${s.start_time} – ${s.end_time}`);
    });
    return Object.values(summary);
});

watch(
    () => [
        slotForm.value.range_start,
        slotForm.value.range_end,
        slotForm.value.slot_duration_minutes,
        slotForm.value.buffer_minutes,
        slotForm.value.allocation_mode,
        slotForm.value.teacher_ids.slice(),
    ],
    () => {
        recalculateSlots();
    },
    { deep: true, immediate: true }
);

watch(teachers, () => {
    if (teachers.value.length && generatedSlots.value.length === 0) {
        recalculateSlots();
    }
});

const partnerOptions = computed(() => [
    { label: '🌐 All Partners (Global / Shared)', value: null },
    ...partnersList.value.map(p => ({
        label: `${p.partner_name} (ID: ${p.id})`,
        value: p.id
    }))
]);

const teacherFilterOptions = computed(() => [
    { label: '👤 Any / All Teachers', value: null },
    ...teachers.value.map(t => ({
        label: `${t.first_name} ${t.last_name}`,
        value: t.id
    }))
]);

const loadSlots = async () => {
    loadingSlots.value = true;
    const params = {};
    if (slotDateFilter.value) params.date = slotDateFilter.value;
    if (slotPartnerFilter.value !== null) params.partner_id = slotPartnerFilter.value;
    if (slotTeacherFilter.value !== null) params.teacher_id = slotTeacherFilter.value;
    const { data } = await request(() => api.get('/admin/live-speaking/slots', { params }));
    slots.value = data.slots || [];
    loadingSlots.value = false;
};

const createSlots = async () => {
    if (!slotForm.value.slot_date) { notify('Please select a date for the slots.', 'error'); return; }
    if (generatedSlots.value.length === 0) { notify('No slots defined to generate. Please check time window or add slots.', 'error'); return; }

    creatingSlots.value = true;
    try {
        const payload = {
            slot_date: slotForm.value.slot_date,
            partner_id: slotForm.value.partner_id,
            custom_slots: generatedSlots.value.map(s => ({
                start_time: s.start_time,
                end_time: s.end_time,
                teacher_id: s.teacher_id || null,
                capacity: s.capacity || 1,
            })),
        };
        const { data } = await request(() => api.post('/admin/live-speaking/slots', payload));
        await loadSlots();
        notify(data?.message || 'Slots generated and saved successfully.');
    } finally {
        creatingSlots.value = false;
    }
};

const removeSlot = async (slot) => {
    if (slot.booked_count > 0) { notify('Cannot delete a slot that has bookings.', 'error'); return; }
    if (!(await showConfirm('Delete this slot?'))) return;
    await request(() => api.delete(`/admin/live-speaking/slots/${slot.id}`));
    await loadSlots();
    notify('Slot deleted.');
};

watch([slotDateFilter, slotPartnerFilter, slotTeacherFilter], () => loadSlots());

// ══════════════════════════════════════════════════════════════════════════════
// TAB 5 — BOOKINGS
// ══════════════════════════════════════════════════════════════════════════════
const bookings        = ref([]);
const loadingBookings = ref(false);
const bookingStats    = ref({ total: 0, scheduled: 0, completed: 0, cancelled: 0 });
const bookingFilters  = ref({ status: null, date: '' });
const bPage           = ref(1);
const bLastPage       = ref(1);

const statusOptions = [
    { label: 'All Statuses',    value: null          },
    { label: 'Scheduled',       value: 'scheduled'   },
    { label: 'In Progress',     value: 'in_progress' },
    { label: 'Completed',       value: 'completed'   },
    { label: 'Cancelled',       value: 'cancelled'   },
    { label: 'No Show',         value: 'no_show'     },
];

const statusValues = ['scheduled','in_progress','completed','cancelled','no_show'];
const statusLabels = {
    scheduled: 'Scheduled', in_progress: 'In Progress', completed: 'Completed',
    cancelled: 'Cancelled', no_show: 'No Show',
};

const loadBookings = async () => {
    loadingBookings.value = true;
    const { data } = await request(() => api.get('/admin/live-speaking/bookings', {
        params: {
            status: bookingFilters.value.status || undefined,
            date:   bookingFilters.value.date   || undefined,
            page:   bPage.value,
        }
    }));
    bookings.value     = data.bookings?.data || [];
    bookingStats.value = data.stats || bookingStats.value;
    bLastPage.value    = data.bookings?.last_page || 1;
    loadingBookings.value = false;
};

const updateStatus = async (booking, value) => {
    await request(() => api.patch(`/admin/live-speaking/bookings/${booking.id}/status`, { status: value }));
    booking.status = value;
    notify('Booking status updated.');
};

const assignTeacher = async (booking, teacherId) => {
    if (!teacherId) return;
    await request(() => api.patch(`/admin/live-speaking/bookings/${booking.id}/assign-teacher`, { teacher_id: teacherId }));
    const teacher = teachers.value.find(t => String(t.id) === String(teacherId));
    if (teacher) booking.teacher_name = `${teacher.first_name} ${teacher.last_name}`;
    notify('Teacher assigned.');
};

const canPrev = computed(() => bPage.value > 1);
const canNext = computed(() => bPage.value < bLastPage.value);
const changePage = (delta) => { bPage.value += delta; loadBookings(); };

watch(bookingFilters, () => { bPage.value = 1; loadBookings(); }, { deep: true });

// ── Tab Loader ────────────────────────────────────────────────────────────────
const selectTab = (id) => {
    tab.value = id;
    if (id === 'settings')     loadSettings();
    if (id === 'partners')     loadPartners();
    if (id === 'availability') { loadAvailability(); }
    if (id === 'slots')        { loadSlots(); loadPartners(); loadAvailability(); }
    if (id === 'bookings')     { loadBookings(); if (!teachers.value.length) loadAvailability(); }
};

onMounted(() => {
    loadSettings();
    loadPartners();
    loadAvailability();
    loadSlots();
});
</script>

<template>
  <AdminLayout>
    <div class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 mt-4 px-4 md:px-8 pb-20">

      <!-- ── Header Banner ────────────────────────────────────────────────── -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-sm relative overflow-hidden gap-4">
        <div class="relative z-10 space-y-1.5">
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-md shadow-sky-500/20 text-white">
              <i class="pi pi-microphone text-lg"></i>
            </div>
            <div>
              <div class="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Management Hub</div>
              <h1 class="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Live Speaking Assessment</h1>
            </div>
          </div>
          <p class="text-xs font-semibold text-slate-500 max-w-xl">
            Configure partner eligibility, generate date & time slots, schedule teachers, and oversee candidate bookings.
          </p>
        </div>

        <div class="relative z-10 flex items-center gap-3">
          <div class="flex items-center gap-2.5 px-4 py-2 rounded-2xl border shadow-sm transition-all"
            :class="settings.is_enabled ? 'bg-emerald-50 border-emerald-200/80' : 'bg-slate-50 border-slate-200'">
            <div class="w-2.5 h-2.5 rounded-full"
              :class="settings.is_enabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'"></div>
            <span class="text-[11px] font-black uppercase tracking-wider"
              :class="settings.is_enabled ? 'text-emerald-700' : 'text-slate-600'">
              {{ settings.is_enabled ? 'System Active' : 'System Disabled' }}
            </span>
          </div>
        </div>
      </div>

      <!-- ── Toast Feedback ──────────────────────────────────────────────── -->
      <Transition name="toast">
        <div v-if="toast.show"
          class="flex items-center gap-3 rounded-2xl border px-5 py-3 text-xs font-bold shadow-md"
          :class="toast.type === 'error'
            ? 'border-rose-200 bg-rose-50 text-rose-700'
            : 'border-emerald-200 bg-emerald-50 text-emerald-700'">
          <i class="pi text-sm" :class="toast.type === 'error' ? 'pi-exclamation-circle' : 'pi-check-circle'"></i>
          {{ toast.text }}
        </div>
      </Transition>

      <!-- ── Navigation Tabs ─────────────────────────────────────────────── -->
      <div class="flex items-center gap-2 overflow-x-auto border-b border-slate-200 pb-2">
        <button v-for="item in tabs" :key="item.id"
          @click="selectTab(item.id)"
          class="flex shrink-0 items-center gap-2 rounded-2xl px-5 py-3 text-xs font-black transition-all cursor-pointer"
          :class="tab === item.id
            ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20'
            : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/80 hover:border-slate-300'">
          <i :class="['pi text-xs', item.icon]"></i>
          <span>{{ item.label }}</span>
        </button>
      </div>

      <!-- ════════════════════════════════════════════════════════════════════ -->
      <!-- TAB 1: GENERAL SETTINGS                                               -->
      <!-- ════════════════════════════════════════════════════════════════════ -->
      <section v-if="tab === 'settings'" class="max-w-4xl">
        <Card class="border border-slate-200/80 shadow-sm rounded-3xl overflow-hidden bg-white">
          <template #content>
            <div v-if="loadingSettings" class="flex justify-center py-16">
              <i class="pi pi-spin pi-spinner text-indigo-600 text-3xl"></i>
            </div>
            <div v-else class="space-y-6">

              <div class="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h2 class="text-base font-black text-slate-800">Global Booking Configuration</h2>
                  <p class="text-xs text-slate-500 mt-0.5">Default timing rules applied when partner-specific overrides are not set.</p>
                </div>
                <Button label="Save Settings" icon="pi pi-check" :loading="savingSettings"
                  class="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white border-none shadow-sm text-xs font-black tracking-wider uppercase transition-all"
                  @click="saveSettings" />
              </div>

              <!-- Form Grid -->
              <div class="grid gap-6 md:grid-cols-2">
                <div class="space-y-2">
                  <label class="text-[11px] font-black text-slate-600 uppercase tracking-wider">Default Session Duration (minutes)</label>
                  <InputNumber v-model="settings.slot_duration_minutes" :min="5" :max="120" showButtons class="w-full" />
                  <p class="text-[11px] text-slate-400">Duration of each candidate interview slot.</p>
                </div>
                <div class="space-y-2">
                  <label class="text-[11px] font-black text-slate-600 uppercase tracking-wider">Buffer Between Slots (minutes)</label>
                  <InputNumber v-model="settings.buffer_minutes" :min="0" :max="60" showButtons class="w-full" />
                  <p class="text-[11px] text-slate-400">Rest or preparation gap between consecutive sessions.</p>
                </div>
                <div class="space-y-2">
                  <label class="text-[11px] font-black text-slate-600 uppercase tracking-wider">Booking Cut-off (hours before)</label>
                  <InputNumber v-model="settings.cutoff_hours" :min="0" :max="72" showButtons class="w-full" />
                  <p class="text-[11px] text-slate-400">Students cannot book a slot that starts within this window.</p>
                </div>
                <div class="space-y-2">
                  <label class="text-[11px] font-black text-slate-600 uppercase tracking-wider">Max Reschedules Allowed</label>
                  <InputNumber v-model="settings.max_reschedules" :min="0" :max="10" showButtons class="w-full" />
                  <p class="text-[11px] text-slate-400">Maximum times a student can change their slot date.</p>
                </div>
              </div>

              <!-- Global Switch -->
              <div class="flex items-center justify-between rounded-2xl bg-slate-50 border border-slate-200/80 p-5 mt-4">
                <div>
                  <p class="text-sm font-black text-slate-800">Enable Live Speaking Globally</p>
                  <p class="text-xs text-slate-500 mt-0.5">
                    Master switch for candidate booking visibility and scheduling availability across the platform.
                  </p>
                </div>
                <ToggleSwitch v-model="settings.is_enabled" />
              </div>

              <!-- Bottom Save Button -->
              <div class="flex justify-end pt-4 border-t border-slate-100">
                <Button label="Save Settings" icon="pi pi-check" :loading="savingSettings"
                  class="px-8 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white border-none shadow-md shadow-indigo-600/20 text-xs font-black tracking-wider uppercase transition-all hover:-translate-y-0.5"
                  @click="saveSettings" />
              </div>
            </div>
          </template>
        </Card>
      </section>

      <!-- ════════════════════════════════════════════════════════════════════ -->
      <!-- TAB 2: PARTNERS ACTIVATION                                           -->
      <!-- ════════════════════════════════════════════════════════════════════ -->
      <section v-else-if="tab === 'partners'" class="space-y-6">
        <Card class="border border-slate-200/80 shadow-sm rounded-3xl overflow-hidden bg-white">
          <template #content>
            <!-- Header Controls -->
            <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100 mb-5">
              <div>
                <div class="flex items-center gap-3">
                  <h2 class="text-base font-black text-slate-800">Partners Live Speaking Activation</h2>
                  <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {{ enabledPartnersCount }} / {{ partnersList.length }} Active
                  </span>
                </div>
                <p class="text-xs text-slate-500 mt-0.5">
                  Select which partners participate in the live speaking booking system, or customize durations per institution.
                </p>
              </div>

              <div class="flex flex-wrap items-center gap-2.5">
                <!-- Search -->
                <div class="relative">
                  <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                  <input v-model="partnerSearch" type="text" placeholder="Search partner name..."
                    class="pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-indigo-600 transition-colors w-[180px] md:w-[220px]" />
                </div>

                <!-- Quick Bulk Actions -->
                <Button label="Enable All" severity="secondary" outlined size="small" class="text-xs font-bold"
                  @click="enableAllPartners" />
                <Button label="Disable All" severity="secondary" outlined size="small" class="text-xs font-bold"
                  @click="disableAllPartners" />

                <!-- PROMINENT SAVE BUTTON -->
                <Button label="Save Changes" icon="pi pi-save" :loading="savingAllPartners"
                  class="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white border-none shadow-md shadow-indigo-600/20 text-xs font-black tracking-wider uppercase transition-all hover:-translate-y-0.5"
                  @click="saveAllPartners" />
              </div>
            </div>

            <!-- Unsaved changes notice -->
            <div v-if="hasUnsavedPartnerChanges"
              class="mb-4 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs text-amber-800 font-bold animate-in fade-in">
              <div class="flex items-center gap-2">
                <i class="pi pi-exclamation-triangle text-amber-600"></i>
                <span>You have unsaved changes in partner activation. Click "Save Changes" to apply.</span>
              </div>
              <Button label="Save Now" icon="pi pi-check" size="small"
                class="bg-amber-600 hover:bg-amber-700 text-white border-none text-[11px] font-black px-3 py-1 rounded-lg"
                :loading="savingAllPartners" @click="saveAllPartners" />
            </div>

            <!-- Table -->
            <div v-if="loadingPartners" class="flex justify-center py-16">
              <i class="pi pi-spin pi-spinner text-indigo-600 text-3xl"></i>
            </div>
            <div v-else-if="!filteredPartners.length" class="text-center py-16 text-slate-400 text-xs font-bold">
              No partners match your search criteria.
            </div>
            <div v-else class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead>
                  <tr class="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider bg-slate-50/50">
                    <th class="py-3.5 px-4">Partner Name</th>
                    <th class="py-3.5 px-4 text-center">Live Speaking Status</th>
                    <th class="py-3.5 px-4 text-center">Configuration</th>
                    <th class="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  <tr v-for="partner in filteredPartners" :key="partner.id" class="hover:bg-slate-50/70 transition-colors">
                    <td class="py-3.5 px-4 font-bold text-slate-800">
                      <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-50 to-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black text-xs">
                          {{ partner.partner_name?.charAt(0) || 'P' }}
                        </div>
                        <div>
                          <p class="text-slate-800 font-bold text-xs">{{ partner.partner_name }}</p>
                          <p class="text-[10px] text-slate-400 font-medium">Partner ID: #{{ partner.id }}</p>
                        </div>
                      </div>
                    </td>
                    <td class="py-3.5 px-4 text-center">
                      <div class="inline-flex items-center gap-3">
                        <ToggleSwitch :modelValue="partner.is_enabled"
                          @change="onPartnerToggle(partner)" />
                        <Tag :severity="partner.is_enabled ? 'success' : 'secondary'"
                          :value="partner.is_enabled ? 'Active' : 'Disabled'"
                          class="text-[10px] font-black uppercase tracking-wider" />
                      </div>
                    </td>
                    <td class="py-3.5 px-4 text-center">
                      <span class="font-mono text-slate-500 text-[11px]">
                        {{ partner.slot_duration_minutes || 25 }}m duration &nbsp;·&nbsp; {{ partner.cutoff_hours || 2 }}h cutoff
                      </span>
                    </td>
                    <td class="py-3.5 px-4 text-right">
                      <Button label="Custom Settings" icon="pi pi-sliders-h" outlined size="small"
                        class="text-xs font-bold text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                        @click="openPartnerSettings(partner)" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Footer Save Button -->
            <div class="flex items-center justify-between pt-5 border-t border-slate-100 mt-4">
              <span class="text-xs text-slate-400 font-medium">
                {{ filteredPartners.length }} partner{{ filteredPartners.length !== 1 ? 's' : '' }} listed
              </span>
              <Button label="Save Changes" icon="pi pi-save" :loading="savingAllPartners"
                class="px-8 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white border-none shadow-md shadow-indigo-600/20 text-xs font-black tracking-wider uppercase transition-all hover:-translate-y-0.5"
                @click="saveAllPartners" />
            </div>
          </template>
        </Card>
      </section>

      <!-- ════════════════════════════════════════════════════════════════════ -->
      <!-- TAB 3: SLOTS & SCHEDULES                                              -->
      <!-- ════════════════════════════════════════════════════════════════════ -->
      <section v-else-if="tab === 'slots'" class="space-y-6">

        <!-- Generator Card -->
        <Card class="border border-slate-200/80 shadow-sm rounded-3xl overflow-hidden bg-white">
          <template #content>
            <div class="pb-4 border-b border-slate-100 mb-5">
              <h2 class="text-base font-black text-slate-800">Generate Bulk Time Slots</h2>
              <p class="text-xs text-slate-500 mt-0.5">
                Automatically generate test slots for a selected partner, teacher, date, and time window with alternating rotation.
              </p>
            </div>

            <form @submit.prevent="createSlots" class="space-y-5">

              <!-- Row 1: Target Partner & Date & Duration -->
              <div class="grid gap-4 md:grid-cols-4 items-start">
                <div class="space-y-1.5 md:col-span-2">
                  <label class="text-[10px] font-black text-slate-500 uppercase tracking-wider">Partner Allocation</label>
                  <Select v-model="slotForm.partner_id" :options="partnerOptions"
                    optionLabel="label" optionValue="value"
                    placeholder="Select Partner" class="w-full text-xs" />
                  <p class="text-[10px] text-slate-400">Select a specific partner or assign slots globally to all partners.</p>
                </div>

                <div class="space-y-1.5">
                  <label class="text-[10px] font-black text-slate-500 uppercase tracking-wider">Slot Date</label>
                  <input v-model="slotForm.slot_date" type="date" required
                    class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-600 transition-colors" />
                </div>

                <div class="grid grid-cols-2 gap-2">
                  <div class="space-y-1.5">
                    <label class="text-[10px] font-black text-slate-500 uppercase tracking-wider">Duration (min)</label>
                    <input v-model.number="slotForm.slot_duration_minutes" type="number" min="5" max="180" step="5" required
                      class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-600 transition-colors text-center font-bold" />
                  </div>
                  <div class="space-y-1.5">
                    <label class="text-[10px] font-black text-slate-500 uppercase tracking-wider">Buffer (min)</label>
                    <input v-model.number="slotForm.buffer_minutes" type="number" min="0" max="60" step="5" required
                      class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-600 transition-colors text-center font-bold" />
                  </div>
                </div>
              </div>

              <!-- Row 2: Time Window -->
              <div class="grid gap-4 md:grid-cols-4 items-start p-4 rounded-2xl bg-slate-50/70 border border-slate-100">
                <div class="space-y-1.5">
                  <label class="text-[10px] font-black text-slate-500 uppercase tracking-wider">Window Start Time</label>
                  <input v-model="slotForm.range_start" type="time" required
                    class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-600 transition-colors font-mono font-bold" />
                </div>

                <div class="space-y-1.5">
                  <label class="text-[10px] font-black text-slate-500 uppercase tracking-wider">Window End Time</label>
                  <input v-model="slotForm.range_end" type="time" required
                    class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-600 transition-colors font-mono font-bold" />
                </div>

                <div class="space-y-1.5 md:col-span-2">
                  <label class="text-[10px] font-black text-slate-500 uppercase tracking-wider">Teacher Rotation Strategy</label>
                  <div class="flex items-center gap-2">
                    <button type="button" @click="slotForm.allocation_mode = 'alternating'"
                      class="flex-1 py-2 px-3 rounded-xl border text-xs font-black transition-all cursor-pointer text-center"
                      :class="slotForm.allocation_mode === 'alternating'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'">
                      🔄 Alternating (Staggered)
                    </button>
                    <button type="button" @click="slotForm.allocation_mode = 'concurrent'"
                      class="flex-1 py-2 px-3 rounded-xl border text-xs font-black transition-all cursor-pointer text-center"
                      :class="slotForm.allocation_mode === 'concurrent'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'">
                      👥 Concurrent (Parallel)
                    </button>
                  </div>
                  <p class="text-[10px] text-slate-400 mt-1">
                    {{ slotForm.allocation_mode === 'alternating' 
                        ? 'Alternates teachers slot by slot (e.g. Teacher 1 takes 2:00-2:30, Teacher 2 takes 2:30-3:00, Teacher 1 takes 3:00-3:30).' 
                        : 'Generates parallel simultaneous slots for all selected teachers at each time window.' }}
                  </p>
                </div>
              </div>

              <!-- Row 3: Teachers Selection Chips -->
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <label class="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    Select Teachers ({{ slotForm.teacher_ids.length }} selected)
                  </label>
                  <div class="flex items-center gap-2">
                    <button type="button" @click="selectAllTeachers"
                      class="text-[10px] font-black text-indigo-600 hover:text-indigo-800 transition-colors">
                      Select All
                    </button>
                    <span class="text-slate-300">·</span>
                    <button type="button" @click="clearTeacherSelection"
                      class="text-[10px] font-black text-slate-400 hover:text-slate-600 transition-colors">
                      Clear Selection
                    </button>
                  </div>
                </div>

                <div v-if="!teachers.length" class="text-xs text-slate-400 py-2">
                  No active teachers found. Make sure users with "teacher" role exist.
                </div>
                <div v-else class="flex flex-wrap gap-2">
                  <button type="button" v-for="t in teachers" :key="t.id"
                    @click="toggleTeacherSelection(t.id)"
                    class="flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer"
                    :class="slotForm.teacher_ids.includes(t.id)
                      ? 'bg-indigo-50 border-indigo-400 text-indigo-800 shadow-sm ring-1 ring-indigo-400/30'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'">
                    <i :class="slotForm.teacher_ids.includes(t.id) ? 'pi pi-check-circle text-indigo-600 font-bold' : 'pi pi-circle text-slate-300'"></i>
                    <span>{{ t.first_name }} {{ t.last_name }}</span>
                  </button>
                </div>
              </div>

              <!-- Live Schedule Preview & Interactive Editor -->
              <div v-if="generatedSlots.length"
                class="p-5 rounded-2xl bg-gradient-to-r from-sky-50 via-indigo-50/70 to-purple-50 border border-indigo-100 shadow-xs space-y-4">
                
                <!-- Preview Header & Strategy Info -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-indigo-100/80">
                  <div class="flex items-center gap-2 text-xs font-black text-indigo-950">
                    <i class="pi pi-calendar-clock text-indigo-600 text-sm"></i>
                    <span>Schedule Breakdown & Assignment ({{ generatedSlots.length }} slot{{ generatedSlots.length !== 1 ? 's' : '' }})</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <button type="button" @click="recalculateSlots"
                      class="px-2.5 py-1 rounded-lg bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-2xs">
                      🔄 Reset Auto Rotation
                    </button>
                    <button type="button" @click="addCustomPreviewSlot"
                      class="px-2.5 py-1 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-2xs">
                      ➕ Add Extra Slot
                    </button>
                  </div>
                </div>

                <!-- Teacher Allocation Summary Badges -->
                <div v-if="teacherSlotsSummary.length" class="flex flex-wrap gap-2.5">
                  <div v-for="ts in teacherSlotsSummary" :key="ts.teacher_name"
                    class="bg-white/90 backdrop-blur-xs rounded-xl border border-indigo-100 px-3 py-2 shadow-2xs text-xs space-y-1">
                    <div class="flex items-center gap-1.5 font-bold text-slate-800 text-[11px]">
                      <i class="pi pi-user text-indigo-600 text-[10px]"></i>
                      <span>{{ ts.teacher_name }}</span>
                      <span class="ml-1 px-1.5 py-0.2 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-black">
                        {{ ts.slots.length }} slot{{ ts.slots.length !== 1 ? 's' : '' }}
                      </span>
                    </div>
                    <div class="flex flex-wrap gap-1">
                      <span v-for="(timeWin, twIdx) in ts.slots" :key="twIdx"
                        class="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-mono font-bold">
                        {{ timeWin }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Interactive Slot Cards Grid -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-h-72 overflow-y-auto pr-1">
                  <div v-for="(ps, idx) in generatedSlots" :key="ps.id || idx"
                    class="bg-white rounded-xl border border-indigo-100 p-3 shadow-2xs hover:border-indigo-300 transition-all flex flex-col justify-between space-y-2">
                    <div class="flex items-center justify-between">
                      <span class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Slot #{{ idx + 1 }}</span>
                      <div class="flex items-center gap-1.5">
                        <span class="font-mono font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md text-[11px]">
                          {{ ps.start_time }} – {{ ps.end_time }}
                        </span>
                        <button type="button" @click="removePreviewSlot(idx)"
                          class="w-5 h-5 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
                          title="Remove slot">
                          <i class="pi pi-times text-[9px]"></i>
                        </button>
                      </div>
                    </div>

                    <!-- Teacher Dropdown Selector inside card -->
                    <div class="space-y-1">
                      <label class="text-[9px] font-black text-slate-400 uppercase tracking-wider">Assigned Examiner</label>
                      <select v-model="ps.teacher_id"
                        class="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-indigo-600 focus:bg-white transition-all cursor-pointer">
                        <option :value="null">👤 Any Available Teacher</option>
                        <option v-for="t in teachers" :key="t.id" :value="t.id">
                          👤 {{ t.first_name }} {{ t.last_name }}
                        </option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Submit Button -->
              <div class="flex justify-end pt-2">
                <Button type="submit"
                  :label="`Generate & Save ${generatedSlots.length > 0 ? generatedSlots.length + ' ' : ''}Slots`"
                  icon="pi pi-check-circle"
                  :loading="creatingSlots"
                  :disabled="generatedSlots.length === 0"
                  class="px-8 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white border-none text-xs font-black tracking-wider uppercase shadow-md shadow-indigo-600/20 hover:-translate-y-0.5 transition-all disabled:opacity-50" />
              </div>
            </form>
          </template>
        </Card>

        <!-- Slots List Table -->
        <Card class="border border-slate-200/80 shadow-sm rounded-3xl overflow-hidden bg-white">
          <template #content>
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 mb-5">
              <div>
                <h2 class="text-base font-black text-slate-800">Existing Slots</h2>
                <p class="text-xs text-slate-500 mt-0.5">{{ slots.length }} slot{{ slots.length !== 1 ? 's' : '' }} found</p>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <!-- Partner filter -->
                <Select v-model="slotPartnerFilter" :options="partnerOptions"
                  optionLabel="label" optionValue="value"
                  placeholder="Filter by Partner" class="text-xs min-w-[180px]" />
                <!-- Teacher filter -->
                <Select v-model="slotTeacherFilter" :options="teacherFilterOptions"
                  optionLabel="label" optionValue="value"
                  placeholder="Filter by Teacher" class="text-xs min-w-[160px]" />
                <!-- Date filter -->
                <input v-model="slotDateFilter" type="date"
                  class="rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-indigo-600 transition-colors" />
                <button v-if="slotDateFilter || slotPartnerFilter !== null || slotTeacherFilter !== null"
                  @click="slotDateFilter = ''; slotPartnerFilter = null; slotTeacherFilter = null"
                  class="w-8 h-8 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  title="Reset Filters">
                  <i class="pi pi-filter-slash text-xs"></i>
                </button>
              </div>
            </div>

            <div v-if="loadingSlots" class="flex justify-center py-12">
              <i class="pi pi-spin pi-spinner text-indigo-600 text-2xl"></i>
            </div>
            <DataTable v-else :value="slots" dataKey="id"
              class="p-datatable-sm text-sm" responsiveLayout="scroll"
              emptyMessage="No slots found. Generate some slots using the form above.">

              <Column header="Partner Allocation" style="min-width:160px">
                <template #body="{ data }">
                  <span v-if="data.partner_name && data.partner_name !== 'عام'"
                    class="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 text-[11px] font-bold border border-sky-200">
                    {{ data.partner_name }}
                  </span>
                  <span v-else class="text-slate-500 text-xs font-semibold">🌐 Global (All Partners)</span>
                </template>
              </Column>

              <Column header="Assigned Teacher" style="min-width:160px">
                <template #body="{ data }">
                  <div class="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <i class="pi pi-user text-slate-400 text-[11px]"></i>
                    <span>{{ data.teacher_name || 'Any Teacher' }}</span>
                  </div>
                </template>
              </Column>

              <Column header="Date" style="min-width:120px">
                <template #body="{ data }">
                  <span class="font-mono font-black text-slate-700 text-xs">{{ data.slot_date }}</span>
                </template>
              </Column>

              <Column header="Time Window" style="min-width:130px">
                <template #body="{ data }">
                  <span class="font-mono text-slate-600 text-xs">{{ data.start_time }} – {{ data.end_time }}</span>
                </template>
              </Column>

              <Column header="Capacity" style="min-width:120px">
                <template #body="{ data }">
                  <div class="flex items-center gap-3">
                    <div class="flex-1 max-w-[60px] h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div class="h-full rounded-full transition-all"
                        :class="data.booked_count >= data.capacity ? 'bg-rose-400' : data.booked_count > 0 ? 'bg-amber-400' : 'bg-emerald-400'"
                        :style="`width:${data.capacity > 0 ? (data.booked_count / data.capacity * 100) : 0}%`">
                      </div>
                    </div>
                    <span class="text-xs font-black text-slate-600">{{ data.booked_count }}/{{ data.capacity }}</span>
                  </div>
                </template>
              </Column>

              <Column header="Status" style="min-width:100px">
                <template #body="{ data }">
                  <Tag :severity="data.is_active ? 'success' : 'secondary'"
                    :value="data.is_active ? 'Active' : 'Inactive'"
                    class="text-[10px] font-black uppercase tracking-wider" />
                </template>
              </Column>

              <Column header="" style="width:60px" :exportable="false">
                <template #body="{ data }">
                  <Button icon="pi pi-trash" severity="danger" text rounded size="small"
                    :disabled="data.booked_count > 0"
                    :title="data.booked_count > 0 ? 'Cannot delete a booked slot' : 'Delete slot'"
                    @click="removeSlot(data)" />
                </template>
              </Column>
            </DataTable>
          </template>
        </Card>
      </section>

      <!-- ════════════════════════════════════════════════════════════════════ -->
      <!-- TAB 4: TEACHER AVAILABILITY                                          -->
      <!-- ════════════════════════════════════════════════════════════════════ -->
      <section v-else-if="tab === 'availability'" class="space-y-6">

        <!-- Form Card -->
        <Card class="border border-slate-200/80 shadow-sm rounded-3xl overflow-hidden bg-white">
          <template #content>
            <div class="pb-4 border-b border-slate-100 mb-5">
              <h2 class="text-base font-black text-slate-800">Add Teacher Availability</h2>
              <p class="text-xs text-slate-500 mt-0.5">Define days and working hours when a teacher can administer live assessments.</p>
            </div>
            <form @submit.prevent="addAvailability" class="grid gap-4 md:grid-cols-5 items-end">
              <div class="space-y-1.5 md:col-span-2">
                <label class="text-[10px] font-black text-slate-500 uppercase tracking-wider">Teacher</label>
                <Select v-model="avForm.teacher_id" :options="teachers"
                  optionValue="id" placeholder="Select Teacher" class="w-full text-xs" required>
                  <template #option="{ option }">{{ option.first_name }} {{ option.last_name }}</template>
                  <template #value="{ value }">
                    <span v-if="value">{{ teachers.find(t => t.id === value)?.first_name }} {{ teachers.find(t => t.id === value)?.last_name }}</span>
                    <span v-else class="text-slate-400">Select Teacher</span>
                  </template>
                </Select>
              </div>
              <div class="space-y-1.5">
                <label class="text-[10px] font-black text-slate-500 uppercase tracking-wider">Day of Week</label>
                <Select v-model="avForm.day_of_week" :options="dayOptions"
                  optionLabel="label" optionValue="value" class="w-full text-xs" />
              </div>
              <div class="space-y-1.5">
                <label class="text-[10px] font-black text-slate-500 uppercase tracking-wider">Start Time</label>
                <input v-model="avForm.start_time" type="time" required
                  class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-600 transition-colors font-mono" />
              </div>
              <div class="space-y-1.5">
                <label class="text-[10px] font-black text-slate-500 uppercase tracking-wider">End Time</label>
                <input v-model="avForm.end_time" type="time" required
                  class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-600 transition-colors font-mono" />
              </div>
              <Button type="submit" label="Add Slot" icon="pi pi-plus"
                :loading="savingAvail"
                class="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white border-none text-xs font-black tracking-wider uppercase shadow-md shadow-indigo-600/20 hover:-translate-y-0.5 transition-all" />
            </form>
          </template>
        </Card>

        <!-- Availability Cards -->
        <div v-if="loadingAvail" class="flex justify-center py-16">
          <i class="pi pi-spin pi-spinner text-indigo-600 text-3xl"></i>
        </div>

        <div v-else-if="!availabilities.length"
          class="bg-white rounded-3xl border border-dashed border-slate-200 p-16 text-center">
          <div class="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
            <i class="pi pi-calendar-times text-2xl"></i>
          </div>
          <h3 class="text-sm font-black text-slate-600">No availability schedules defined yet</h3>
          <p class="text-xs text-slate-400 mt-1">Add teacher availability above to start scheduling sessions.</p>
        </div>

        <div v-else class="space-y-4">
          <Card v-for="group in availabilities" :key="group.teacher_id"
            class="border border-slate-200/80 shadow-sm rounded-3xl overflow-hidden bg-white">
            <template #content>
              <div class="flex items-center gap-3 mb-4">
                <div class="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <i class="pi pi-user text-sm"></i>
                </div>
                <div>
                  <p class="font-black text-slate-800 text-sm">{{ group.teacher_name }}</p>
                  <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {{ group.availabilities.length }} active slot{{ group.availabilities.length !== 1 ? 's' : '' }}
                  </p>
                </div>
              </div>
              <div class="flex flex-wrap gap-2">
                <div v-for="item in group.availabilities" :key="item.id"
                  class="group/chip flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2 text-xs hover:border-rose-300 hover:bg-rose-50/50 transition-all cursor-default">
                  <i class="pi pi-clock text-slate-400 text-[10px]"></i>
                  <span class="font-black text-slate-700 capitalize">{{ item.day_of_week }}</span>
                  <span class="text-slate-300">·</span>
                  <span class="font-mono text-slate-600">{{ item.start_time }} – {{ item.end_time }}</span>
                  <button @click="removeAvailability(item.id)"
                    class="opacity-0 group-hover/chip:opacity-100 ml-1 text-rose-500 hover:text-rose-700 transition-all cursor-pointer"
                    title="Remove availability">
                    <i class="pi pi-times text-[10px]"></i>
                  </button>
                </div>
              </div>
            </template>
          </Card>
        </div>
      </section>

      <!-- ════════════════════════════════════════════════════════════════════ -->
      <!-- TAB 5: BOOKINGS                                                       -->
      <!-- ════════════════════════════════════════════════════════════════════ -->
      <section v-else-if="tab === 'bookings'" class="space-y-6">

        <!-- Stats Grid -->
        <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div v-for="item in [
            { key: 'total',     label: 'Total Bookings', icon: 'pi-list',           bg: 'bg-slate-100',   color: 'text-slate-700' },
            { key: 'scheduled', label: 'Scheduled',      icon: 'pi-calendar-clock', bg: 'bg-sky-50',      color: 'text-sky-600'   },
            { key: 'completed', label: 'Completed',      icon: 'pi-check-circle',   bg: 'bg-emerald-50',  color: 'text-emerald-600'},
            { key: 'cancelled', label: 'Cancelled',      icon: 'pi-times-circle',   bg: 'bg-rose-50',     color: 'text-rose-600'  },
          ]" :key="item.key"
            class="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 flex items-center gap-4">
            <div class="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" :class="item.bg">
              <i :class="['pi text-lg', item.icon, item.color]"></i>
            </div>
            <div>
              <p class="text-2xl font-black text-slate-800">{{ bookingStats[item.key] }}</p>
              <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider mt-0.5">{{ item.label }}</p>
            </div>
          </div>
        </div>

        <!-- Filter Bar -->
        <div class="flex flex-wrap items-center gap-3 bg-white rounded-3xl border border-slate-200/80 shadow-sm px-5 py-4">
          <i class="pi pi-filter text-slate-400 text-sm shrink-0"></i>
          <Select v-model="bookingFilters.status" :options="statusOptions"
            optionLabel="label" optionValue="value"
            placeholder="All Statuses" class="text-xs min-w-[160px]" />
          <input v-model="bookingFilters.date" type="date"
            class="rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-indigo-600 transition-colors" />
          <button v-if="bookingFilters.status || bookingFilters.date"
            @click="bookingFilters.status = null; bookingFilters.date = ''"
            class="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">
            <i class="pi pi-filter-slash text-xs"></i> Reset Filters
          </button>
        </div>

        <!-- Bookings DataTable -->
        <Card class="border border-slate-200/80 shadow-sm rounded-3xl overflow-hidden bg-white">
          <template #content>
            <div v-if="loadingBookings" class="flex justify-center py-16">
              <i class="pi pi-spin pi-spinner text-indigo-600 text-3xl"></i>
            </div>
            <DataTable v-else :value="bookings" dataKey="id"
              class="p-datatable-sm text-sm" responsiveLayout="scroll"
              emptyMessage="No bookings found.">

              <!-- Student -->
              <Column header="Candidate" style="min-width:200px">
                <template #body="{ data }">
                  <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black text-xs shrink-0">
                      {{ (data.student_name || data.student_code || '?').charAt(0).toUpperCase() }}
                    </div>
                    <div>
                      <p class="font-black text-slate-800 text-xs leading-tight">{{ data.student_name || '—' }}</p>
                      <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{{ data.student_code }}</p>
                    </div>
                  </div>
                </template>
              </Column>

              <!-- Slot -->
              <Column header="Scheduled Slot" style="min-width:170px">
                <template #body="{ data }">
                  <p class="font-mono font-black text-slate-700 text-xs">{{ data.slot_date || '—' }}</p>
                  <p class="text-[10px] text-slate-400 mt-0.5">{{ data.start_time }} – {{ data.end_time }}</p>
                </template>
              </Column>

              <!-- Assign Teacher -->
              <Column header="Assigned Examiner" style="min-width:200px">
                <template #body="{ data }">
                  <select :value="data.teacher_id || ''"
                    @change="assignTeacher(data, $event.target.value)"
                    class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-600 transition-colors">
                    <option value="">— Unassigned —</option>
                    <option v-for="t in teachers" :key="t.id" :value="t.id">
                      {{ t.first_name }} {{ t.last_name }}
                    </option>
                  </select>
                </template>
              </Column>

              <!-- Status -->
              <Column header="Status" style="min-width:160px">
                <template #body="{ data }">
                  <select :value="data.status"
                    @change="updateStatus(data, $event.target.value)"
                    class="w-full rounded-xl border px-3 py-2 text-xs font-bold outline-none transition-colors"
                    :class="{
                      'border-sky-200 bg-sky-50 text-sky-700':       data.status === 'scheduled',
                      'border-amber-200 bg-amber-50 text-amber-700': data.status === 'in_progress',
                      'border-emerald-200 bg-emerald-50 text-emerald-700': data.status === 'completed',
                      'border-rose-200 bg-rose-50 text-rose-700':    ['cancelled','no_show'].includes(data.status),
                      'border-slate-200 bg-slate-50 text-slate-600': !['scheduled','in_progress','completed','cancelled','no_show'].includes(data.status),
                    }">
                    <option v-for="s in statusValues" :key="s" :value="s">{{ statusLabels[s] }}</option>
                  </select>
                </template>
              </Column>

              <!-- Reschedules -->
              <Column header="Reschedules" style="min-width:110px">
                <template #body="{ data }">
                  <span class="text-xs font-black text-slate-500">{{ data.reschedule_count ?? 0 }}×</span>
                </template>
              </Column>
            </DataTable>

            <!-- Pagination -->
            <div v-if="bLastPage > 1" class="flex items-center justify-between mt-5 pt-4 border-t border-slate-100">
              <Button label="Previous" icon="pi pi-chevron-left" severity="secondary" outlined size="small"
                :disabled="!canPrev" @click="changePage(-1)" />
              <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Page {{ bPage }} of {{ bLastPage }}
              </span>
              <Button label="Next" icon="pi pi-chevron-right" iconPos="right" severity="secondary" outlined size="small"
                :disabled="!canNext" @click="changePage(1)" />
            </div>
          </template>
        </Card>
      </section>

      <!-- ── Partner Custom Settings Dialog ─────────────────────────────────── -->
      <Dialog v-model:visible="showPartnerModal" modal
        :header="`Live Speaking Settings — ${editingPartnerSettings?.partner_name || 'Partner'}`"
        :style="{ width: '520px' }"
        :closable="true">
        <div v-if="editingPartnerSettings" class="space-y-4 pt-2">
          <div class="space-y-1">
            <label class="text-[10px] font-black text-slate-500 uppercase tracking-wider">Session Duration (minutes)</label>
            <InputNumber v-model="editingPartnerSettings.slot_duration_minutes" :min="5" :max="120" showButtons class="w-full" />
            <p class="text-[10px] text-slate-400">Interview duration in minutes for candidates of this partner.</p>
          </div>
          <div class="space-y-1">
            <label class="text-[10px] font-black text-slate-500 uppercase tracking-wider">Buffer Between Slots (minutes)</label>
            <InputNumber v-model="editingPartnerSettings.buffer_minutes" :min="0" :max="60" showButtons class="w-full" />
            <p class="text-[10px] text-slate-400">Rest gap between consecutive test sessions.</p>
          </div>
          <div class="space-y-1">
            <label class="text-[10px] font-black text-slate-500 uppercase tracking-wider">Booking Cut-off (hours before)</label>
            <InputNumber v-model="editingPartnerSettings.cutoff_hours" :min="0" :max="72" showButtons class="w-full" />
            <p class="text-[10px] text-slate-400">Minimum hours prior to session start required for booking.</p>
          </div>
          <div class="space-y-1">
            <label class="text-[10px] font-black text-slate-500 uppercase tracking-wider">Max Reschedules Allowed</label>
            <InputNumber v-model="editingPartnerSettings.max_reschedules" :min="0" :max="10" showButtons class="w-full" />
            <p class="text-[10px] text-slate-400">Maximum times a candidate can reschedule their booked slot.</p>
          </div>
          <div class="flex items-center justify-between rounded-2xl bg-slate-50 border border-slate-200/80 p-4 mt-3">
            <div>
              <span class="text-xs font-bold text-slate-800">Enable Live Speaking for this Partner</span>
              <p class="text-[10px] text-slate-400 mt-0.5">Activate or deactivate live assessment booking for this institution.</p>
            </div>
            <ToggleSwitch v-model="editingPartnerSettings.is_enabled" />
          </div>
        </div>
        <template #footer>
          <div class="flex justify-end gap-2 pt-3">
            <Button label="Cancel" severity="secondary" text @click="showPartnerModal = false" />
            <Button label="Save Partner Settings" icon="pi pi-check" :loading="savingPartnerSettings"
              class="bg-indigo-600 hover:bg-indigo-700 text-white border-none text-xs font-bold px-5 py-2.5 rounded-xl shadow-md shadow-indigo-600/20"
              @click="savePartnerCustomSettings" />
          </div>
        </template>
      </Dialog>

    </div>
  </AdminLayout>
</template>

<style scoped>
.toast-enter-active, .toast-leave-active { transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.toast-enter-from, .toast-leave-to       { opacity: 0; transform: translateY(-8px); }

:deep(.p-datatable .p-datatable-thead > tr > th) {
    background: #F8FAFC;
    color: #64748B;
    font-size: 10px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 12px 16px;
    border-bottom: 2px solid #F1F5F9;
}
:deep(.p-datatable .p-datatable-tbody > tr) { border-bottom: 1px solid #F8FAFC; }
:deep(.p-datatable .p-datatable-tbody > tr:hover) { background: #F8FAFC; }
:deep(.p-datatable .p-datatable-tbody > tr > td) { padding: 12px 16px; vertical-align: middle; }
:deep(.p-card .p-card-content) { padding: 1.5rem; }
</style>
