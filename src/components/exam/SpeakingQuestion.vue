<script setup>
import { ref, watch, onUnmounted } from 'vue';
import AudioRecorder from '@/components/AudioRecorder.vue';

const props = defineProps({
    question: {
        type: Object,
        required: true
    },
    answer: {
        type: Object,
        required: true
    },
    disabled: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['update:answer']);

const activeMode = ref('record'); // 'record' or 'upload'
const fileInput = ref(null);
const audioRecorderRef = ref(null);
const uploadedFileName = ref('');
const uploadedFileSize = ref('');
const uploadedAudioUrl = ref(null);

const handleRecording = (blob) => {
    emit('update:answer', { ...props.answer, recorded_file: blob, is_media_uploaded: false });
};

const triggerFileInput = () => {
    if (fileInput.value) fileInput.value.click();
};

const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    uploadedFileName.value = file.name;
    uploadedFileSize.value = formatFileSize(file.size);

    if (uploadedAudioUrl.value) {
        URL.revokeObjectURL(uploadedAudioUrl.value);
    }
    uploadedAudioUrl.value = URL.createObjectURL(file);

    emit('update:answer', { ...props.answer, recorded_file: file, is_media_uploaded: false });
};

const clearUploadedFile = () => {
    if (uploadedAudioUrl.value) {
        URL.revokeObjectURL(uploadedAudioUrl.value);
        uploadedAudioUrl.value = null;
    }
    uploadedFileName.value = '';
    uploadedFileSize.value = '';
    if (fileInput.value) {
        fileInput.value.value = '';
    }
    emit('update:answer', { ...props.answer, recorded_file: null, is_media_uploaded: false });
};

const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

watch(() => props.answer.recorded_file, (newVal) => {
    if (!newVal) {
        if (uploadedAudioUrl.value) {
            URL.revokeObjectURL(uploadedAudioUrl.value);
            uploadedAudioUrl.value = null;
        }
        uploadedFileName.value = '';
        uploadedFileSize.value = '';
    }
});

watch(() => props.question.id, (newQuestionId) => {
    // Reset local upload states
    if (uploadedAudioUrl.value) {
        URL.revokeObjectURL(uploadedAudioUrl.value);
        uploadedAudioUrl.value = null;
    }
    uploadedFileName.value = '';
    uploadedFileSize.value = '';
    if (fileInput.value) {
        fileInput.value.value = '';
    }

    // Load state from props.answer.recorded_file if exists
    const file = props.answer.recorded_file;
    if (file) {
        if (file instanceof File && file.name && file.name !== 'voice.webm') {
            activeMode.value = 'upload';
            uploadedFileName.value = file.name;
            uploadedFileSize.value = formatFileSize(file.size);
            uploadedAudioUrl.value = URL.createObjectURL(file);
        } else {
            activeMode.value = 'record';
        }
    } else {
        activeMode.value = 'record';
    }
}, { immediate: true });

onUnmounted(() => {
    if (uploadedAudioUrl.value) {
        URL.revokeObjectURL(uploadedAudioUrl.value);
    }
});
</script>

<template>
    <div class="space-y-6 py-2">
        <!-- Main Area Container -->
        <div
            class="bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/30 relative overflow-hidden flex flex-col gap-6">

            <!-- Content / Instruction if any -->
            <div v-if="question.content" class=" max-w-3xl w-full mx-auto ql-content">
                <div class="text-lg font-bold text-slate-800 leading-relaxed" v-html="question.content"></div>
            </div>

            <!-- Premium Mode Switcher (Tabs) -->
            <div v-if="!disabled"
                class="flex justify-center w-full max-w-sm mx-auto bg-slate-50 p-1.5 rounded-2xl border border-slate-100 shadow-inner">
                <button @click="activeMode = 'record'" type="button" :class="[
                    'flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-black transition-all duration-300',
                    activeMode === 'record'
                        ? 'bg-white text-brand-primary shadow-sm scale-[1.02]'
                        : 'text-slate-500 hover:text-slate-800'
                ]">
                    <i class="pi pi-microphone"></i>
                    <span>Record Audio</span>
                </button>
                <button @click="activeMode = 'upload'" type="button" :class="[
                    'flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-black transition-all duration-300',
                    activeMode === 'upload'
                        ? 'bg-white text-brand-primary shadow-sm scale-[1.02]'
                        : 'text-slate-500 hover:text-slate-800'
                ]">
                    <i class="pi pi-upload"></i>
                    <span>Upload Audio</span>
                </button>
            </div>

            <!-- Content Area based on mode -->
            <div class="w-full flex justify-center min-h-[220px]">
                <!-- Mode: Record -->
                <div v-if="activeMode === 'record'" class="w-full max-w-md animate-fade">
                    <AudioRecorder ref="audioRecorderRef" @recorded="handleRecording"
                        :initial-audio="props.answer.recorded_file"
                        class="!bg-slate-50/50 !border-2 !border-slate-100/80 !shadow-inner !rounded-[2rem] w-full"
                        :disabled="disabled" />
                </div>

                <!-- Mode: Upload -->
                <div v-else class="w-full max-w-md flex flex-col justify-center animate-fade">
                    <!-- Dropzone -->
                    <div v-if="!props.answer.recorded_file" @click="triggerFileInput"
                        class="border-2 border-dashed border-slate-200 hover:border-brand-primary bg-slate-50/50 hover:bg-brand-primary/5 rounded-[2rem] p-8 text-center cursor-pointer transition-all duration-300 group flex flex-col items-center justify-center gap-4 h-[200px]">
                        <div
                            class="w-16 h-16 rounded-2xl bg-white text-slate-400 group-hover:text-brand-primary group-hover:scale-110 flex items-center justify-center text-2xl shadow-sm border border-slate-100 transition-all duration-300">
                            <i class="pi pi-cloud-upload"></i>
                        </div>
                        <div class="space-y-1">
                            <p class="text-sm font-black text-slate-700">Click here to select Audio File</p>
                            <p class="text-[10px] font-bold text-slate-400 uppercase">Supports MP3, WAV, M4A, WEBM</p>
                        </div>
                        <input type="file" ref="fileInput" accept="audio/*" class="hidden" @change="handleFileUpload"
                            :disabled="disabled" />
                    </div>

                    <!-- Uploaded Preview -->
                    <div v-else
                        class="bg-slate-50 border border-slate-100 rounded-[2rem] p-6 w-full space-y-4 shadow-inner flex flex-col items-center justify-center">
                        <div
                            class="flex items-center gap-4 w-full bg-white p-4 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
                            <div
                                class="w-12 h-12 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center text-xl shrink-0">
                                <i class="pi pi-file-audio"></i>
                            </div>
                            <div class="flex-grow min-w-0 text-right font-sans">
                                <p class="text-xs font-black text-slate-800 truncate" dir="ltr">{{ uploadedFileName }}
                                </p>
                                <p class="text-[9px] font-extrabold text-slate-400 mt-0.5">{{ uploadedFileSize }}</p>
                            </div>
                            <button v-if="!disabled" @click="clearUploadedFile" type="button"
                                class="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 flex items-center justify-center transition-colors shrink-0"
                                title="حذف الملف">
                                <i class="pi pi-trash text-sm"></i>
                            </button>
                        </div>

                        <!-- Audio preview -->
                        <div v-if="uploadedAudioUrl" class="w-full space-y-1.5 pt-2 border-t border-slate-200/50">
                            <span
                                class="text-[9px] font-black text-slate-400 uppercase tracking-widest block text-center italic">معاينة
                                الملف الصوتي المرفوع</span>
                            <audio :src="uploadedAudioUrl" controls class="w-full h-10"></audio>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Subtle Background Decoration -->
            <div class="absolute -top-24 -right-24 w-64 h-64 bg-rose-500/5 rounded-full blur-3xl"></div>
        </div>
    </div>
</template>

<style scoped>
.animate-fade {
    animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(5px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>
