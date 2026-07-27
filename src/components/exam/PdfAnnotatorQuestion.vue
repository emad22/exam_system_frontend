<script setup>
import { ref, onMounted, watch, nextTick, markRaw } from 'vue';
import VirtualKeyboard from '@/components/VirtualKeyboard.vue';
import axios from 'axios';
import api from '@/services/api';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, rgb } from 'pdf-lib';

// Set worker source for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;

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

// State variables
const loading = ref(true);
const errorMsg = ref('');
const pdfDoc = ref(null);
const totalPages = ref(0);
const currentPage = ref(1);
const zoomScale = ref(1.6); // Default baseline scale

// Active tool: 'pen' | 'text' | 'eraser'
const activeTool = ref('text');
const strokeColor = ref('#2563eb'); // Default blue
const strokeWidth = ref(3);
const fontSize = ref(24);

// Refs for canvases
const containerRef = ref(null);
const pageCanvases = ref([]); // Array of { pageNum, pdfCanvas, drawCanvas, ctx, strokes: [], texts: [] }

// Raw PDF ArrayBuffer for pdf-lib compiling
let rawPdfBuffer = null;

// Preset colors
const availableColors = ['#000000', '#2563eb', '#dc2626', '#16a34a', '#9333ea', '#ea580c'];

onMounted(async () => {
    await loadPdf();
});

watch(() => props.question?.pdf_url || props.question?.media_url, async () => {
    await loadPdf();
});

const loadPdf = async () => {
    const pdfUrl = props.question?.pdf_url || props.question?.media_url;
    const qId = props.question?.id;

    if (!pdfUrl && !qId) {
        errorMsg.value = 'لا يوجد ملف PDF متاح لهذا السؤال.';
        loading.value = false;
        return;
    }

    try {
        loading.value = true;
        errorMsg.value = '';

        // Try direct pdfUrl via axios first, fallback to API stream endpoint if CORS blocks direct static URL
        try {
            if (pdfUrl) {
                const response = await axios.get(pdfUrl, { responseType: 'arraybuffer' });
                rawPdfBuffer = response.data;
            } else {
                throw new Error('No pdfUrl available');
            }
        } catch (fetchErr) {
            if (qId) {
                const apiRes = await api.get(`/questions/${qId}/pdf`, { responseType: 'arraybuffer' });
                rawPdfBuffer = apiRes.data;
            } else {
                throw fetchErr;
            }
        }

        // Load document into PDF.js and markRaw to prevent Vue Proxy private field errors
        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(rawPdfBuffer.slice(0)) });
        const loadedPdf = await loadingTask.promise;
        pdfDoc.value = markRaw(loadedPdf);
        totalPages.value = pdfDoc.value.numPages;

        // Turn off loading spinner first so container DOM layout is measured accurately
        loading.value = false;
        await nextTick();
        await new Promise(r => setTimeout(r, 60));

        await fitToContainerWidth();
        await renderAllPages();
    } catch (err) {
        console.error('Error loading PDF:', err);
        errorMsg.value = 'حدث خطأ أثناء قراءة ملف الـ PDF: ' + (err.response?.data?.message || err.message || 'فشل تحميل الملف');
        loading.value = false;
    }
};

const fitToContainerWidth = async () => {
    if (!containerRef.value || !pdfDoc.value) return;
    try {
        const firstPage = await pdfDoc.value.getPage(1);
        const unscaledViewport = firstPage.getViewport({ scale: 1.0 });
        const containerWidth = containerRef.value.clientWidth > 0
            ? containerRef.value.clientWidth - 40
            : (window.innerWidth > 768 ? 850 : window.innerWidth - 40);

        if (containerWidth > 0 && unscaledViewport.width > 0) {
            const calculatedScale = containerWidth / unscaledViewport.width;
            zoomScale.value = Math.max(1.2, Math.min(calculatedScale, 3.5));
        }
    } catch (e) {
        console.error('Fit width calculation error:', e);
    }
};

const resetFitWidth = async () => {
    await fitToContainerWidth();
    await renderAllPages();
};

const renderAllPages = async () => {
    if (!pdfDoc.value) return;
    pageCanvases.value = [];

    for (let pageNum = 1; pageNum <= totalPages.value; pageNum++) {
        await renderPage(pageNum);
    }
};

const renderPage = async (pageNum) => {
    const page = await pdfDoc.value.getPage(pageNum);
    const viewport = page.getViewport({ scale: zoomScale.value });

    const pdfCanvas = document.getElementById(`pdf-page-canvas-${pageNum}`);
    const drawCanvas = document.getElementById(`draw-page-canvas-${pageNum}`);
    if (!pdfCanvas || !drawCanvas) return;

    pdfCanvas.width = viewport.width;
    pdfCanvas.height = viewport.height;
    drawCanvas.width = viewport.width;
    drawCanvas.height = viewport.height;

    const pdfCtx = pdfCanvas.getContext('2d');
    const drawCtx = drawCanvas.getContext('2d');

    // Render PDF page onto pdfCanvas
    await page.render({ canvasContext: pdfCtx, viewport }).promise;

    // Track state for this page
    const pageState = {
        pageNum,
        viewportWidth: viewport.width,
        viewportHeight: viewport.height,
        originalWidth: page.view[2] - page.view[0],
        originalHeight: page.view[3] - page.view[1],
        drawCanvas,
        ctx: drawCtx,
        strokes: [], // { color, width, points: [{x, y}] }
        texts: [],   // { text, x, y, color, size }
        isDrawing: false,
        currentStroke: null
    };

    pageCanvases.value.push(pageState);
    initCanvasEvents(pageState);
};

const initCanvasEvents = (pageState) => {
    const canvas = pageState.drawCanvas;
    let isDrawing = false;
    let currentStroke = null;

    const getPos = (e) => {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    };

    const startDraw = (e) => {
        if (props.disabled) return;
        const pos = getPos(e);

        if (activeTool.value === 'pen') {
            isDrawing = true;
            currentStroke = {
                color: strokeColor.value,
                width: strokeWidth.value,
                points: [pos]
            };
            pageState.strokes.push(currentStroke);
            redrawPage(pageState);
        } else if (activeTool.value === 'text') {
            addTextInput(pageState, pos);
        } else if (activeTool.value === 'eraser') {
            eraseAt(pageState, pos);
        }
    };

    const drawMove = (e) => {
        if (!isDrawing || activeTool.value !== 'pen' || props.disabled) return;
        const pos = getPos(e);
        currentStroke.points.push(pos);
        redrawPage(pageState);
    };

    const stopDraw = () => {
        if (isDrawing) {
            isDrawing = false;
            currentStroke = null;
            saveAnswerState();
        }
    };

    canvas.onmousedown = startDraw;
    canvas.onmousemove = drawMove;
    canvas.onmouseup = stopDraw;
    canvas.onmouseleave = stopDraw;

    // Touch support
    canvas.ontouchstart = (e) => { e.preventDefault(); startDraw(e); };
    canvas.ontouchmove = (e) => { e.preventDefault(); drawMove(e); };
    canvas.ontouchend = (e) => { e.preventDefault(); stopDraw(); };
};

const redrawPage = (pageState) => {
    const ctx = pageState.ctx;
    ctx.clearRect(0, 0, pageState.viewportWidth, pageState.viewportHeight);

    // Draw all strokes
    pageState.strokes.forEach(stroke => {
        if (!stroke.points || stroke.points.length === 0) return;
        ctx.beginPath();
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
            ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
    });

    // Draw all texts
    pageState.texts.forEach(txt => {
        ctx.font = `${txt.size}px Arial, sans-serif`;
        ctx.fillStyle = txt.color;
        ctx.fillText(txt.text, txt.x, txt.y);
    });
};

const addTextInput = (pageState, pos) => {
    pendingPageState.value = pageState;
    pendingPos.value = pos;
    pendingText.value = '';
    showTextModal.value = true;
};

const confirmAddText = () => {
    if (!pendingText.value.trim() || !pendingPageState.value || !pendingPos.value) return;

    pendingPageState.value.texts.push({
        text: pendingText.value.trim(),
        x: pendingPos.value.x,
        y: pendingPos.value.y,
        color: strokeColor.value,
        size: fontSize.value
    });

    redrawPage(pendingPageState.value);
    saveAnswerState();

    showTextModal.value = false;
    pendingText.value = '';
    pendingPageState.value = null;
    pendingPos.value = null;
};

// Text Modal State
const showTextModal = ref(false);
const pendingText = ref('');
const pendingPageState = ref(null);
const pendingPos = ref(null);
const showKeyboard = ref(true);
const keyboardLayout = ref('arabic');

const eraseAt = (pageState, pos) => {
    const threshold = 15; // pixels
    // Remove strokes near pos
    pageState.strokes = pageState.strokes.filter(stroke => {
        return !stroke.points.some(p => Math.hypot(p.x - pos.x, p.y - pos.y) < threshold);
    });

    // Remove texts near pos
    pageState.texts = pageState.texts.filter(txt => {
        return Math.hypot(txt.x - pos.x, txt.y - pos.y) > threshold * 2;
    });

    redrawPage(pageState);
    saveAnswerState();
};

const clearPage = (pageState) => {
    if (confirm('Are you sure you want to clear all drawings and text on this page?')) {
        pageState.strokes = [];
        pageState.texts = [];
        redrawPage(pageState);
        saveAnswerState();
    }
};

const undoLastAction = (pageState) => {
    if (pageState.texts.length > 0) {
        pageState.texts.pop();
    } else if (pageState.strokes.length > 0) {
        pageState.strokes.pop();
    }
    redrawPage(pageState);
    saveAnswerState();
};

const setZoom = async (newScale) => {
    if (newScale < 0.6 || newScale > 3.5) return;
    zoomScale.value = newScale;
    await renderAllPages();
};

// Generate compiled PDF file and emit to parent
const saveAnswerState = async () => {
    if (!rawPdfBuffer) return;

    try {
        // Create an export PDF using pdf-lib or render canvas to PNG image overlays
        const pdfDocExport = await PDFDocument.load(rawPdfBuffer);
        const pages = pdfDocExport.getPages();

        for (const pageState of pageCanvases.value) {
            const pageIndex = pageState.pageNum - 1;
            if (!pages[pageIndex]) continue;

            const pdfPage = pages[pageIndex];
            const { width, height } = pdfPage.getSize();

            // Export drawCanvas to PNG Data URL
            const dataUrl = pageState.drawCanvas.toDataURL('image/png');
            if (dataUrl && dataUrl !== 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==') {
                const pngImage = await pdfDocExport.embedPng(dataUrl);
                pdfPage.drawImage(pngImage, {
                    x: 0,
                    y: 0,
                    width,
                    height
                });
            }
        }

        const pdfBytes = await pdfDocExport.save();
        const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
        const pdfFile = new File([pdfBlob], `answer_q${props.question.id}.pdf`, { type: 'application/pdf' });

        emit('update:answer', {
            ...props.answer,
            text_answer: 'PDF_ANNOTATED',
            pdf_file: pdfFile,
            pdf_annotations: pageCanvases.value.map(p => ({
                page: p.pageNum,
                strokeCount: p.strokes.length,
                textCount: p.texts.length
            }))
        });
    } catch (err) {
        console.error('Error generating PDF answer file:', err);
    }
};
</script>

<template>
    <div class="flex flex-col bg-slate-900 text-slate-100 rounded-xl border border-slate-800 shadow-xl relative">
        <!-- Toolbar -->
        <div class="bg-slate-800 p-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 select-none sticky top-0 z-10 shrink-0">
            <!-- Tools Selection -->
            <div class="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-lg border border-slate-700">
                <button
                    type="button"
                    @click="activeTool = 'pen'"
                    :class="activeTool === 'pen' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-800'"
                    class="px-3 py-1.5 rounded-md font-medium text-xs flex items-center gap-1.5 transition-all"
                    title="Draw and write by hand"
                >
                    <i class="pi pi-pencil text-sm"></i>
                    <span>Pen</span>
                </button>

                <button
                    type="button"
                    @click="activeTool = 'text'"
                    :class="activeTool === 'text' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-800'"
                    class="px-3 py-1.5 rounded-md font-medium text-xs flex items-center gap-1.5 transition-all"
                    title="Type text on worksheet"
                >
                    <i class="pi pi-file-edit text-sm"></i>
                    <span>Text</span>
                </button>

                <button
                    type="button"
                    @click="activeTool = 'eraser'"
                    :class="activeTool === 'eraser' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-800'"
                    class="px-3 py-1.5 rounded-md font-medium text-xs flex items-center gap-1.5 transition-all"
                    title="Erase drawings and text"
                >
                    <i class="pi pi-eraser text-sm"></i>
                    <span>Eraser</span>
                </button>
            </div>

            <!-- Colors Palette -->
            <div class="flex items-center gap-2">
                <span class="text-xs text-slate-400 font-medium">Color:</span>
                <div class="flex items-center gap-1">
                    <button
                        v-for="color in availableColors"
                        :key="color"
                        type="button"
                        @click="strokeColor = color"
                        :style="{ backgroundColor: color }"
                        :class="strokeColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-800 scale-110' : 'opacity-80 hover:opacity-100'"
                        class="w-6 h-6 rounded-full transition-all border border-white/20"
                    ></button>
                </div>
            </div>

            <!-- Line Width & Font Size -->
            <div class="flex items-center gap-3 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-700">
                <div v-if="activeTool === 'pen'" class="flex items-center gap-2">
                    <span class="text-xs text-slate-400">Width:</span>
                    <select v-model.number="strokeWidth" class="bg-slate-800 text-slate-200 text-xs rounded border border-slate-700 px-1.5 py-1 outline-none">
                        <option :value="2">Fine (2px)</option>
                        <option :value="4">Medium (4px)</option>
                        <option :value="8">Thick (8px)</option>
                    </select>
                </div>

                <div v-if="activeTool === 'text'" class="flex items-center gap-2">
                    <span class="text-xs text-slate-400">Font Size:</span>
                    <select v-model.number="fontSize" class="bg-slate-800 text-slate-200 text-xs rounded border border-slate-700 px-1.5 py-1 outline-none">
                        <option :value="14">Small (14px)</option>
                        <option :value="18">Medium (18px)</option>
                        <option :value="24">Large (24px)</option>
                    </select>
                </div>
            </div>

            <!-- Zoom Controls & Page Actions -->
            <div class="flex items-center gap-2">
                <button type="button" @click="resetFitWidth" class="px-2.5 py-1.5 rounded bg-blue-600/80 hover:bg-blue-600 text-white text-xs flex items-center gap-1.5 font-medium transition-all shadow-sm" title="Fit to container width">
                    <i class="pi pi-arrows-alt text-xs"></i>
                    <span>Fit Width</span>
                </button>
                <button type="button" @click="setZoom(zoomScale - 0.2)" class="p-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-200" title="Zoom Out (-)">
                    <i class="pi pi-minus text-xs"></i>
                </button>
                <span class="text-xs font-mono text-slate-300 min-w-[45px] text-center">{{ Math.round(zoomScale * 100) }}%</span>
                <button type="button" @click="setZoom(zoomScale + 0.2)" class="p-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-200" title="Zoom In (+)">
                    <i class="pi pi-plus text-xs"></i>
                </button>
            </div>
        </div>

        <!-- PDF Viewer Area -->
        <div ref="containerRef" class="p-4 flex flex-col items-center gap-6 bg-slate-950/80" style="min-height: 500px;">
            <div v-if="loading" class="flex flex-col items-center justify-center my-auto p-12 text-slate-400 gap-3">
                <i class="pi pi-spin pi-spinner text-3xl text-blue-500"></i>
                <span>Loading PDF worksheet...</span>
            </div>

            <div v-else-if="errorMsg" class="my-auto p-6 bg-rose-950/50 border border-rose-800 text-rose-300 rounded-xl max-w-md text-center">
                <i class="pi pi-exclamation-triangle text-2xl mb-2 block"></i>
                <span>{{ errorMsg }}</span>
            </div>

            <template v-else>
                <div
                    v-for="pageNum in totalPages"
                    :key="pageNum"
                    class="relative shadow-2xl rounded-lg overflow-hidden border border-slate-700 bg-white"
                >
                    <!-- Bottom PDF Render Canvas -->
                    <canvas :id="`pdf-page-canvas-${pageNum}`" class="block"></canvas>

                    <!-- Overlay Interactive Canvas -->
                    <canvas
                        :id="`draw-page-canvas-${pageNum}`"
                        class="absolute top-0 left-0 cursor-crosshair touch-none"
                    ></canvas>

                    <!-- Page Actions Floating Badge -->
                    <div class="absolute top-3 right-3 flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-full text-xs text-slate-200 border border-slate-700 shadow-md">
                        <span>Page {{ pageNum }} of {{ totalPages }}</span>
                        <button
                            type="button"
                            @click="undoLastAction(pageCanvases[pageNum - 1])"
                            class="ml-2 hover:text-amber-400 transition-colors"
                            title="Undo last action"
                        >
                            <i class="pi pi-undo text-xs"></i>
                        </button>
                        <button
                            type="button"
                            @click="clearPage(pageCanvases[pageNum - 1])"
                            class="hover:text-rose-400 transition-colors"
                            title="Clear page"
                        >
                            <i class="pi pi-trash text-xs"></i>
                        </button>
                    </div>
                </div>
            </template>
        </div>

        <!-- Modern Floating Text Dialog -->
        <div v-if="showTextModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
            <div class="bg-slate-900 border border-slate-700 text-slate-100 rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col">

                <!-- Header -->
                <div class="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-800">
                    <div class="flex items-center gap-2 font-bold text-sm text-slate-200">
                        <i class="pi pi-file-edit text-blue-400 text-base"></i>
                        <span>Add Text Annotation</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <!-- Color & Size indicator -->
                        <span class="text-[10px] text-slate-500 flex items-center gap-1">
                            <span class="inline-block w-3 h-3 rounded-full" :style="{ backgroundColor: strokeColor }"></span>
                            {{ fontSize }}px
                        </span>
                        <button type="button" @click="showTextModal = false" class="text-slate-400 hover:text-white p-1 rounded-lg transition-colors">
                            <i class="pi pi-times"></i>
                        </button>
                    </div>
                </div>

                <!-- Textarea -->
                <div class="px-5 pt-4 space-y-2">
                    <textarea
                        v-model="pendingText"
                        rows="3"
                        :placeholder="keyboardLayout === 'arabic' ? 'اكتب نصك هنا...' : 'Type text or answer here...'"
                        :dir="keyboardLayout === 'arabic' ? 'rtl' : 'ltr'"
                        class="w-full bg-slate-800 border border-slate-700 rounded-xl p-3.5 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all placeholder-slate-500 resize-none"
                        @keydown.ctrl.enter.prevent="confirmAddText"
                        autofocus
                    ></textarea>
                </div>

                <!-- Keyboard Toggle + Keyboard -->
                <div class="px-5 pt-2 pb-4 space-y-2">
                    <!-- Toggle bar -->
                    <div class="flex items-center justify-between">
                        <!-- Language switcher -->
                        <div class="flex items-center gap-1 bg-slate-800 p-0.5 rounded-lg border border-slate-700">
                            <button
                                type="button"
                                @click="keyboardLayout = 'arabic'"
                                :class="keyboardLayout === 'arabic' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'"
                                class="px-3 py-1 text-[11px] font-bold rounded-md transition-all"
                            >عربي</button>
                            <button
                                type="button"
                                @click="keyboardLayout = 'english'"
                                :class="keyboardLayout === 'english' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'"
                                class="px-3 py-1 text-[11px] font-bold rounded-md transition-all"
                            >EN</button>
                        </div>
                        <!-- Show/hide keyboard -->
                        <button
                            type="button"
                            @click="showKeyboard = !showKeyboard"
                            class="text-[11px] font-bold text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
                        >
                            <i :class="showKeyboard ? 'pi pi-chevron-down' : 'pi pi-chevron-up'" class="text-[10px]"></i>
                            {{ showKeyboard ? 'Hide Keyboard' : 'Show Keyboard' }}
                        </button>
                    </div>

                    <!-- Virtual Keyboard (dark themed wrapper) -->
                    <transition name="slide-up">
                        <div v-if="showKeyboard" class="rounded-xl border border-slate-700 bg-slate-800">
                            <VirtualKeyboard
                                v-model="pendingText"
                                :layout="keyboardLayout"
                                class="keyboard-dark"
                            />
                        </div>
                    </transition>
                </div>

                <!-- Actions -->
                <div class="flex items-center justify-between gap-2 px-5 py-3 border-t border-slate-800 bg-slate-900/60">
                    <span class="text-[10px] text-slate-500">Ctrl+Enter to add</span>
                    <div class="flex items-center gap-2">
                        <button
                            type="button"
                            @click="showTextModal = false"
                            class="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            @click="confirmAddText"
                            :disabled="!pendingText.trim()"
                            class="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-xl transition-all shadow-md flex items-center gap-1.5"
                        >
                            <i class="pi pi-check text-xs"></i>
                            <span>Add Text</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.touch-none {
    touch-action: none;
}

/* slide-up transition for keyboard */
.slide-up-enter-active,
.slide-up-leave-active {
    transition: all 0.2s ease;
    overflow: hidden;
}
.slide-up-enter-from,
.slide-up-leave-to {
    max-height: 0;
    opacity: 0;
    transform: translateY(-6px);
}
.slide-up-enter-to,
.slide-up-leave-from {
    max-height: 300px;
    opacity: 1;
    transform: translateY(0);
}
</style>

<style>
/* Dark keyboard overrides — applied globally so they penetrate VirtualKeyboard's unscoped styles */
.keyboard-dark .virtual-keyboard-wrapper {
    background-color: #1e293b !important;
    border-color: #334155 !important;
    border-radius: 0.75rem !important;
}
.keyboard-dark .simple-keyboard {
    padding: 8px !important;
}
.keyboard-dark .hg-row {
    flex-wrap: nowrap !important;
    margin-bottom: 4px !important;
}
.keyboard-dark .hg-button {
    background: #334155 !important;
    border-bottom-color: #1e293b !important;
    color: #f1f5f9 !important;
    height: 38px !important;
    min-width: 30px !important;
    font-size: 13px !important;
    flex-shrink: 1 !important;
    flex-grow: 1 !important;
}
.keyboard-dark .hg-button.hg-standardBtn {
    width: auto !important;
}
.keyboard-dark .hg-button.hg-functionBtn {
    background-color: #1e3a5f !important;
    color: #93c5fd !important;
    font-size: 10px !important;
    min-width: 44px !important;
    flex-shrink: 0 !important;
}
.keyboard-dark .hg-button[data-skbtn="{space}"] {
    flex-grow: 4 !important;
}
.keyboard-dark .hg-theme-default .hg-button.hg-activeButton,
.keyboard-dark .hg-button:hover {
    background-color: #2563eb !important;
    color: #fff !important;
    border-bottom-color: #1d4ed8 !important;
}
</style>
