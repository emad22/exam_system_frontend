<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
    acceptedTypes: {
        type: Array,
        default: () => ['audio'] // 'audio', 'image', 'document'
    },
    maxSize: {
        type: Number,
        default: 50 * 1024 * 1024 // 50MB
    },
    disabled: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['file-selected', 'file-removed']);

const uploadedFile = ref(null);
const isDragging = ref(false);

// Map accepted types to file extensions
const acceptedExtensions = {
    audio: ['.mp3', '.wav', '.m4a', '.webm', '.ogg', '.aac', '.flac'],
    image: ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'],
    document: ['.pdf', '.doc', '.docx', '.txt', '.xls', '.xlsx']
};

// Build accept attribute for file input
const acceptAttribute = computed(() => {
    const extensions = [];
    props.acceptedTypes.forEach(type => {
        if (acceptedExtensions[type]) {
            extensions.push(...acceptedExtensions[type]);
        }
    });
    return extensions.join(',');
});

// Format accepted types for display
const displayAcceptedTypes = computed(() => {
    return props.acceptedTypes.map(type => {
        if (type === 'audio') return 'ملفات صوتية (MP3, WAV, WebM...)';
        if (type === 'image') return 'صور (PNG, JPG, JPEG...)';
        if (type === 'document') return 'مستندات (PDF, DOCX, DOC...)';
        return type;
    }).join(' أو ');
});

// Get file icon and preview
const getFileIcon = () => {
    if (!uploadedFile.value) return '';
    const ext = uploadedFile.value.name.split('.').pop().toLowerCase();
    
    if (['mp3', 'wav', 'm4a', 'webm', 'ogg'].includes(ext)) return 'pi-volume-up';
    if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'].includes(ext)) return 'pi-image';
    if (['pdf'].includes(ext)) return 'pi-file-pdf';
    if (['doc', 'docx'].includes(ext)) return 'pi-file-word';
    return 'pi-file';
};

const getFileTypeLabel = () => {
    if (!uploadedFile.value) return '';
    const ext = uploadedFile.value.name.split('.').pop().toLowerCase();
    
    if (['mp3', 'wav', 'm4a', 'webm', 'ogg'].includes(ext)) return 'صوتي';
    if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'].includes(ext)) return 'صورة';
    if (['pdf'].includes(ext)) return 'PDF';
    if (['doc', 'docx'].includes(ext)) return 'وثيقة';
    return 'ملف';
};

const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

const handleDragOver = (e) => {
    if (props.disabled) return;
    e.preventDefault();
    isDragging.value = true;
};

const handleDragLeave = () => {
    isDragging.value = false;
};

const handleDrop = (e) => {
    if (props.disabled) return;
    e.preventDefault();
    isDragging.value = false;
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFileSelect(files[0]);
    }
};

const handleFileInputChange = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
        handleFileSelect(files[0]);
    }
};

const handleFileSelect = (file) => {
    // Validate file size
    if (file.size > props.maxSize) {
        alert(`حجم الملف يتجاوز الحد الأقصى المسموح (${formatFileSize(props.maxSize)})`);
        return;
    }

    // Validate file extension
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    const allowedExts = [];
    props.acceptedTypes.forEach(type => {
        if (acceptedExtensions[type]) {
            allowedExts.push(...acceptedExtensions[type]);
        }
    });

    if (!allowedExts.includes(ext)) {
        alert(`صيغة الملف غير مدعومة. الصيغ المدعومة: ${allowedExts.join(', ')}`);
        return;
    }

    uploadedFile.value = file;
    emit('file-selected', file);
};

const removeFile = () => {
    uploadedFile.value = null;
    emit('file-removed');
};

// Show preview for images
const showImagePreview = () => {
    if (!uploadedFile.value) return false;
    const ext = uploadedFile.value.name.split('.').pop().toLowerCase();
    return ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'].includes(ext);
};

const getImagePreview = () => {
    if (!uploadedFile.value) return '';
    return URL.createObjectURL(uploadedFile.value);
};
</script>

<template>
    <div class="file-upload-container">
        <!-- Upload Zone -->
        <div v-if="!uploadedFile"
            @dragover="handleDragOver"
            @dragleave="handleDragLeave"
            @drop="handleDrop"
            :class="[
                'upload-zone',
                isDragging && 'dragging',
                disabled && 'disabled'
            ]">
            
            <div class="upload-content">
                <i class="pi pi-cloud-upload text-4xl text-slate-300 mb-4"></i>
                
                <div class="text-center space-y-2">
                    <p class="text-sm font-bold text-slate-600">
                        اسحب الملف هنا أو انقر للاختيار
                    </p>
                    <p class="text-xs text-slate-400">
                        {{ displayAcceptedTypes }}
                    </p>
                    <p class="text-xs text-slate-400">
                        الحد الأقصى: {{ formatFileSize(maxSize) }}
                    </p>
                </div>

                <input
                    type="file"
                    class="file-input"
                    :accept="acceptAttribute"
                    :disabled="disabled"
                    @change="handleFileInputChange" />
            </div>
        </div>

        <!-- File Preview -->
        <div v-else class="file-preview-container animate-in fade-in zoom-in-95 duration-500">
            <!-- Image Preview -->
            <div v-if="showImagePreview()" class="image-preview mb-4">
                <img :src="getImagePreview()" alt="Preview" class="rounded-lg border border-slate-200 max-h-48 object-cover" />
            </div>

            <!-- File Info Card -->
            <div class="file-info-card">
                <div class="flex items-start gap-3">
                    <div class="file-icon">
                        <i :class="['pi', getFileIcon()]"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="file-name">{{ uploadedFile.name }}</p>
                        <p class="file-details">
                            {{ getFileTypeLabel() }} • {{ formatFileSize(uploadedFile.size) }}
                        </p>
                    </div>
                    <button
                        @click="removeFile"
                        type="button"
                        class="remove-btn"
                        :disabled="disabled">
                        <i class="pi pi-trash"></i>
                    </button>
                </div>
            </div>

            <!-- Audio Player for Audio Files -->
            <div v-if="!showImagePreview()" class="space-y-3 mt-4">
                <audio :src="getImagePreview()" controls class="w-full h-10 rounded-lg border border-slate-200"></audio>
            </div>
        </div>
    </div>
</template>

<style scoped>
.file-upload-container {
    width: 100%;
}

.upload-zone {
    position: relative;
    border: 2px dashed #cbd5e1;
    border-radius: 1.25rem;
    padding: 2.5rem 2rem;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s ease;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
}

.upload-zone:hover {
    border-color: #94a3b8;
    background: linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%);
}

.upload-zone.dragging {
    border-color: #e11d48;
    background-color: rgba(225, 29, 72, 0.05);
    transform: scale(1.01);
}

.upload-zone.disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
}

.upload-content {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.file-input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
}

.file-preview-container {
    width: 100%;
}

.image-preview {
    display: flex;
    justify-content: center;
    width: 100%;
}

.file-info-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 1rem;
    padding: 1rem;
    display: flex;
    align-items: flex-start;
    gap: 1rem;
}

.file-icon {
    min-width: 2.5rem;
    width: 2.5rem;
    height: 2.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
    color: #e11d48;
    font-size: 1.25rem;
}

.file-name {
    font-size: 0.875rem;
    font-weight: 600;
    color: #1e293b;
    word-break: break-word;
    margin: 0;
}

.file-details {
    font-size: 0.75rem;
    color: #64748b;
    margin: 0.25rem 0 0 0;
}

.remove-btn {
    min-width: 2rem;
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #fee2e2;
    border: none;
    border-radius: 0.375rem;
    color: #dc2626;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.875rem;
    flex-shrink: 0;
}

.remove-btn:hover:not(:disabled) {
    background: #fecaca;
    color: #991b1b;
}

.remove-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.animate-in {
    animation: slideUp 0.3s ease-out;
}

.fade-in {
    animation: fadeIn 0.3s ease-out;
}

.zoom-in-95 {
    animation: zoomIn 0.3s ease-out;
}

.duration-500 {
    animation-duration: 0.5s;
}

@keyframes slideUp {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes fadeIn {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}

@keyframes zoomIn {
    from {
        opacity: 0;
        transform: scale(0.95);
    }
    to {
        opacity: 1;
        transform: scale(1);
    }
}
</style>
