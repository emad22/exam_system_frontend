<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue';
import InputNumber from 'primevue/inputnumber';
import Checkbox from 'primevue/checkbox';
import Button from 'primevue/button';

const props = defineProps({
    modelValue: { type: [File, Object], default: null }, // the file
    initialUrl: { type: String, default: null },
    width: { type: Number, default: null },
    height: { type: Number, default: null },
    label: { type: String, default: 'Attach Image' },
    icon: { type: String, default: 'pi-image' },
    accept: { type: String, default: 'image/*' }
});

const emit = defineEmits(['update:modelValue', 'update:width', 'update:height', 'clear']);

const fileInput = ref(null);
const previewUrl = ref(props.initialUrl);
const localWidth = ref(props.width || 0);
const localHeight = ref(props.height || 0);
const lockAspect = ref(true);
const aspectRatio = ref(1);

// Custom Drag state
const isDragging = ref(false);
let startX = 0;
let startY = 0;
let startWidth = 0;
let startHeight = 0;

// Update local when props change
watch(() => props.initialUrl, (newVal) => {
    previewUrl.value = newVal;
});
watch(() => props.width, (newVal) => {
    if (newVal && newVal !== localWidth.value && !isDragging.value) {
        localWidth.value = newVal;
    }
});
watch(() => props.height, (newVal) => {
    if (newVal && newVal !== localHeight.value && !isDragging.value) {
        localHeight.value = newVal;
    }
});

const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    emit('update:modelValue', file);
    
    // Revoke old URL if it was a blob
    if (previewUrl.value && previewUrl.value.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl.value);
    }
    
    previewUrl.value = URL.createObjectURL(file);
    
    // Read image dimensions
    const img = new Image();
    img.onload = () => {
        localWidth.value = img.width;
        localHeight.value = img.height;
        aspectRatio.value = img.width / img.height;
        emit('update:width', localWidth.value);
        emit('update:height', localHeight.value);
    };
    img.src = previewUrl.value;
};

const triggerInput = () => {
    fileInput.value?.click();
};

const clear = () => {
    emit('update:modelValue', null);
    emit('update:width', null);
    emit('update:height', null);
    emit('clear');
    if (previewUrl.value && previewUrl.value.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl.value);
    }
    previewUrl.value = null;
    localWidth.value = 0;
    localHeight.value = 0;
    if (fileInput.value) fileInput.value.value = '';
};

// Handle manual input changes
const onWidthChange = (val) => {
    if (!val) return;
    localWidth.value = val;
    if (lockAspect.value && aspectRatio.value) {
        localHeight.value = Math.round(val / aspectRatio.value);
        emit('update:height', localHeight.value);
    }
    emit('update:width', localWidth.value);
};

const onHeightChange = (val) => {
    if (!val) return;
    localHeight.value = val;
    if (lockAspect.value && aspectRatio.value) {
        localWidth.value = Math.round(val * aspectRatio.value);
        emit('update:width', localWidth.value);
    }
    emit('update:height', localHeight.value);
};

// Drag Resizing Logic
const startResize = (e) => {
    isDragging.value = true;
    startX = e.clientX;
    startY = e.clientY;
    startWidth = localWidth.value;
    startHeight = localHeight.value;
    document.addEventListener('mousemove', onResize);
    document.addEventListener('mouseup', stopResize);
    e.preventDefault();
};

const onResize = (e) => {
    if (!isDragging.value) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    let newW = Math.max(10, startWidth + dx);
    let newH = Math.max(10, startHeight + dy);

    if (lockAspect.value && aspectRatio.value) {
        // Use the dimension that changed the most
        if (Math.abs(dx) > Math.abs(dy)) {
            newH = Math.round(newW / aspectRatio.value);
        } else {
            newW = Math.round(newH * aspectRatio.value);
        }
    }

    localWidth.value = newW;
    localHeight.value = newH;
};

const stopResize = () => {
    isDragging.value = false;
    document.removeEventListener('mousemove', onResize);
    document.removeEventListener('mouseup', stopResize);
    emit('update:width', localWidth.value);
    emit('update:height', localHeight.value);
};

onMounted(() => {
    if (props.initialUrl && (!localWidth.value || !localHeight.value)) {
        const img = new Image();
        img.onload = () => {
            if (!localWidth.value) localWidth.value = img.width;
            if (!localHeight.value) localHeight.value = img.height;
            aspectRatio.value = img.width / img.height;
            emit('update:width', localWidth.value);
            emit('update:height', localHeight.value);
        };
        img.src = props.initialUrl;
    } else if (localWidth.value && localHeight.value) {
        aspectRatio.value = localWidth.value / localHeight.value;
    }
});

onUnmounted(() => {
    if (isDragging.value) {
        document.removeEventListener('mousemove', onResize);
        document.removeEventListener('mouseup', stopResize);
    }
    if (previewUrl.value && previewUrl.value.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl.value);
    }
});
</script>

<template>
    <div class="relative group border-2 border-dashed rounded-3xl p-4 transition-all"
        :class="previewUrl ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-100 bg-slate-50/30 hover:border-brand-primary'">
        
        <div v-if="!previewUrl" @click="triggerInput" class="flex items-center gap-4 cursor-pointer py-2">
            <div class="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-slate-400 group-hover:text-brand-primary transition-colors">
                <i :class="['pi text-xl', icon]"></i>
            </div>
            <div class="flex flex-col">
                <span class="text-xs font-black text-slate-600 uppercase tracking-wide">{{ label }}</span>
                <span class="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">JPG, PNG, GIF up to 5MB</span>
            </div>
        </div>

        <div v-else class="flex flex-col gap-4">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <span class="text-xs font-black text-emerald-600 uppercase tracking-widest">Image Linked</span>
                </div>
                <Button icon="pi pi-trash" text severity="danger" size="small" @click="clear" />
            </div>
            
            <div class="flex flex-col md:flex-row gap-6 items-start">
                <!-- Resizable Preview Area -->
                <div class="border border-slate-200 rounded-xl overflow-hidden bg-slate-100 relative max-w-full overflow-x-auto" >
                    <div class="relative bg-white/50" :style="{ width: localWidth + 'px', height: localHeight + 'px', minWidth: '50px', minHeight: '50px' }">
                        <img :src="previewUrl" class="w-full h-full pointer-events-none" :class="lockAspect ? 'object-contain' : 'object-fill'" />
                        <!-- Custom drag handle -->
                        <div 
                            @mousedown="startResize"
                            class="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize bg-emerald-500/80 hover:bg-emerald-600 transition-colors flex items-center justify-center rounded-tl-lg shadow-sm" style="z-index: 10;">
                            <i class="pi pi-arrows-alt text-[10px] text-white rotate-45"></i>
                        </div>
                    </div>
                </div>

                <!-- Controls -->
                <div class="flex flex-col gap-4 flex-1 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm w-full md:w-auto">
                    <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dimensions (px)</span>
                    
                    <div class="flex gap-4 items-end">
                        <div class="flex flex-col gap-2">
                            <label class="text-[9px] font-bold text-slate-500 uppercase">Width</label>
                            <InputNumber :modelValue="localWidth" @update:modelValue="onWidthChange" :min="10" :max="2000" inputClass="w-20 text-xs font-mono" />
                        </div>
                        <div class="flex flex-col gap-2">
                            <label class="text-[9px] font-bold text-slate-500 uppercase">Height</label>
                            <InputNumber :modelValue="localHeight" @update:modelValue="onHeightChange" :min="10" :max="2000" inputClass="w-20 text-xs font-mono" />
                        </div>
                    </div>

                    <div class="flex items-center gap-2 mt-2">
                        <Checkbox v-model="lockAspect" :binary="true" inputId="lockAspect" />
                        <label for="lockAspect" class="text-[10px] font-bold text-slate-600 uppercase cursor-pointer select-none">Lock Aspect Ratio</label>
                    </div>
                </div>
            </div>
        </div>

        <input type="file" ref="fileInput" class="hidden" @change="handleFileChange" :accept="accept" />
    </div>
</template>
