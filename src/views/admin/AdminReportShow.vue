<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import ProgressSpinner from 'primevue/progressspinner';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import Dialog from 'primevue/dialog';
import { useMediaUrl } from '@/composables/useMediaUrl';

const route = useRoute();
const router = useRouter();
const attemptId = route.params.id;

const selectedAttempt = ref(null);
const loading = ref(true);
const currentUser = ref(null);
let totalLevels = 0;

const modalConfig = ref({
    visible: false,
    title: '',
    message: '',
    type: 'info',
    showCancel: false,
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    onConfirm: null,
    onCancel: null
});

const showModal = (options) => {
    modalConfig.value = {
        visible: true,
        title: options.title || 'Notification',
        message: options.message || '',
        type: options.type || 'info',
        showCancel: options.showCancel || false,
        confirmText: options.confirmText || 'Yes',
        cancelText: options.cancelText || 'Cancel',
        onConfirm: options.onConfirm || null,
        onCancel: options.onCancel || null
    };
};

const handleModalConfirm = () => {
    modalConfig.value.visible = false;
    if (modalConfig.value.onConfirm) modalConfig.value.onConfirm();
};

const handleModalCancel = () => {
    modalConfig.value.visible = false;
    if (modalConfig.value.onCancel) modalConfig.value.onCancel();
};


const getTotalScore = (attempt) => {

    if (!attempt || !attempt.attempt_skills) return 0;
   // alert("************"+ attempt.skills_count);
    totalLevels = 0;
    return attempt.attempt_skills
        .filter(skillResult => {
            const skillName = skillResult.skill?.name?.toLowerCase() || '';

            return (
                skillName.includes('read') ||
                skillName.includes('listen') ||
                skillName.includes('struct')
            );
        })
        .reduce((sum, skillResult) => {
            totalLevels += skillResult.skill?.levels_count || 1;
            return sum + (getCalculatedSkillScore(skillResult) || 0);
        }, 0);
};


const fetchDetails = async () => {
    loading.value = true;
    try {
        const [reportRes, userRes] = await Promise.all([
            api.get(`/admin/reports/${attemptId}`),
            api.get('/user')
        ]);
        selectedAttempt.value = reportRes.data;
        currentUser.value = userRes.data;
    } catch (err) {
        console.error('Failed to load attempt details', err);
    } finally {
        loading.value = false;
    }
};

const voidAttempt = (id) => {
    showModal({
        title: 'Void Attempt',
        message: 'Are you sure you want to void this attempt? The student will be able to retake the exam.',
        type: 'warning',
        showCancel: true,
        confirmText: 'Yes, Void Attempt',
        onConfirm: async () => {
            try {
                await api.post(`/admin/reports/${attemptId}/reset`);
                showModal({
                    title: 'Success',
                    message: 'Attempt voided successfully.',
                    type: 'success',
                    onConfirm: () => {
                        const isTeacher = currentUser.value?.role === 'teacher';
                        router.push({ name: isTeacher ? 'teacher.reports' : 'admin.reports' });
                    }
                });
            } catch (err) {
                showModal({
                    title: 'Error',
                    message: 'Failed to void attempt.',
                    type: 'danger'
                });
            }
        }
    });
};

const resetSkill = (skillId, skillName) => {
    showModal({
        title: 'Reset Skill',
        message: `Are you sure you want to reset the skill: ${skillName}? The student will need to retake this part.`,
        type: 'warning',
        showCancel: true,
        confirmText: 'Yes, Reset Skill',
        onConfirm: async () => {
            try {
                await api.post(`/admin/reports/${attemptId}/skills/${skillId}/reset`);
                showModal({
                    title: 'Success',
                    message: 'Skill Attempt voided successfully.',
                    type: 'success',
                    onConfirm: () => {
                        const isTeacher = currentUser.value?.role === 'teacher';
                        router.push({ name: isTeacher ? 'teacher.reports' : 'admin.reports' });
                    }
                });
            } catch (err) {
                showModal({
                    title: 'Error',
                    message: 'Failed to reset skill.',
                    type: 'danger'
                });
            }
        }
    });
};

const formatTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const formatFullDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString();
};

const calculateDuration = (start, end) => {
    if (!start || !end) return 'N/A';
    const diff = new Date(end) - new Date(start);
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return `${mins}m ${secs}s`;
};

const getCalculatedSkillScore = (skillResult) => {
    if (!skillResult || skillResult.score === null || skillResult.score === undefined) return null;
    const levelsCount = skillResult.skill?.levels_count || 1;
    return Math.round(Number(skillResult.score) * levelsCount);
};

const skillMap = {
    'listening': 'Listening',
    'reading': 'Reading',
    'structure': 'Structure',
    'writing': 'Writing',
    'writting': 'Writing',
    'speaking': 'Speaking'
};

const getSkillDisplayName = (name) => {
    if (!name) return 'Unknown Skill';
    const lowerName = name.toLowerCase();
    const matchedKey = Object.keys(skillMap).find(key => lowerName.includes(key));
    return matchedKey ? skillMap[matchedKey] : name;
};

const sortedAttemptSkills = computed(() => {
    if (!selectedAttempt.value || !selectedAttempt.value.attempt_skills) return [];
    const orderMap = {
            'listening': 1,
            'reading': 2,
            'structure': 3,
            'writing': 4,
            'speaking': 5
        };

    const getOrder = (name) => {
        name = name?.toLowerCase() || '';

        const matchedKey = Object.keys(orderMap).find(key =>
            name.includes(key)
        );

        return orderMap[matchedKey] || 99;
    };

    return [...selectedAttempt.value.attempt_skills].sort((a, b) => {
        const nameA = a.skill?.name;
        const nameB = b.skill?.name;

        return getOrder(nameA) - getOrder(nameB);
    });
});

const parseJson = (str) => {
    try {
        const val = JSON.parse(str);
        return Array.isArray(val) ? val : (val && typeof val === 'object' ? Object.values(val) : [str]);
    } catch (e) {
        return [str];
    }
};

const getCorrectOptions = (question) => {
    if (!question || !question.options) return [];
    if (question.type === 'matching') {
        return question.options.filter(o => o.option_text.includes('|')).map(o => {
            const parts = o.option_text.split('|');
            return `${parts[0].trim()} → ${parts[1]?.trim()}`;
        });
    }
    if (question.type === 'ordering') {
        return [...question.options]
            .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || a.id - b.id)
            .map(o => o.option_text);
    }
    return question.options
        .filter(o => o.is_correct)
        .sort((a, b) => a.id - b.id)
        .map(o => o.option_text);
};

const getMatchingPairs = (answer) => {
    if (!answer || answer.question?.type !== 'matching') return [];
    
    const options = answer.question.options || [];
    const correctPairs = options
        .filter(o => o.option_text.includes('|'))
        .map(o => {
            const parts = o.option_text.split('|');
            return {
                id: o.id,
                source: parts[0].trim(),
                target: parts[1]?.trim()
            };
        });

    let studentAnswers = {};
    try {
        const raw = answer.text_answer || '{}';
        studentAnswers = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (e) {
        console.error('Failed to parse matching answer', e);
    }

    return correctPairs.map(pair => {
        const studentTarget = studentAnswers[pair.id] || null;
        const isCorrect = normalizeString(studentTarget) === normalizeString(pair.target);
        return {
            ...pair,
            studentTarget,
            isCorrect
        };
    });
};

const getStudentParts = (answer) => {
    if (!answer) return [];
    return parseJson(answer.text_answer);
};

const normalizeString = (str) => {
    if (!str) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = str;
    let clean = tmp.textContent || tmp.innerText || '';
    
    // Replace non-breaking spaces with regular spaces
    clean = clean.replace(/\u00a0/g, ' ');
    
    // Strip Arabic Tashkeel (diacritics) for robust matching
    // Range: \u064B to \u0652
    clean = clean.replace(/[\u064B-\u0652]/g, '');
    
    return clean.trim().toLowerCase();
};

const isPartCorrect = (answer, correctVal, pIdx) => {
    const studentParts = getStudentParts(answer);
    if (!studentParts || studentParts.length === 0) return false;

    const normalizedStudentPart = normalizeString(studentParts[pIdx] || '');
    
    // Split correctVal by | to handle alternative answers
    const acceptedValues = correctVal.split('|').map(v => normalizeString(v));

    if (['word_selection', 'click_word', 'highlight'].includes(answer.question?.type)) {
        // For selection types, we check if the correct option is in the student's selected list
        const normalizedCorrect = normalizeString(correctVal);
        const normalizedStudentParts = studentParts.map(s => normalizeString(s));
        return normalizedStudentParts.includes(normalizedCorrect);
    }

    // For fill_blank and others, check if the student's answer matches any accepted alternative
    return acceptedValues.includes(normalizedStudentPart);
};

const { resolveUrl } = useMediaUrl();

const exportSkillToPdf = (skillId) => {
    if (!selectedAttempt.value) return;
    
    const skillResult = selectedAttempt.value.attempt_skills.find(s => s.skill_id === skillId);
    if (!skillResult) return;

    // Create a hidden iframe for printing
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;

    // Prepare parameters dynamically from Vue state
    const studentName = `${selectedAttempt.value.student?.user?.first_name || 'Student'} ${selectedAttempt.value.student?.user?.last_name || ''}`;
    const studentCode = selectedAttempt.value.student?.student_code || 'N/A';
    const finishedAt = selectedAttempt.value.finished_at ? new Date(selectedAttempt.value.finished_at).toLocaleString() : 'N/A';
    const skillName = getSkillDisplayName(skillResult.skill?.name);
    
    // Get attempts level movement logs for this skill
    const levelLogs = (selectedAttempt.value.attempt_levels || []).filter(l => l.skill_id === skillId);
    
    // Get answers related to this skill
    const skillAnswers = (selectedAttempt.value.answers || []).filter(a => a.question?.skill_id === skillId);

    // Styling
    const printStyle = `
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800;900&display=swap');
        
        @page { 
            size: A4 portrait; 
            margin: 20mm 15mm 20mm 15mm; 
        }
        
        body { 
            background: white !important; 
            color: #0f172a !important;
            font-family: 'Outfit', system-ui, sans-serif !important; 
            padding: 0 !important; 
            margin: 0 !important;
            line-height: 1.5;
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important;
        }

        .header-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 18px;
            margin-bottom: 25px;
        }

        .header-logo {
            font-size: 22px;
            font-weight: 900;
            color: #1e1b4b;
            letter-spacing: -0.02em;
            text-transform: uppercase;
        }

        .header-subtitle {
            font-size: 9px;
            font-weight: 700;
            color: #4f46e5;
            letter-spacing: 0.15em;
            text-transform: uppercase;
            margin-top: 2px;
        }

        .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px 20px;
            font-size: 11px;
            color: #475569;
            line-height: 1.4;
        }

        .info-item strong {
            color: #0f172a;
            font-weight: 600;
        }

        /* Metrics grid */
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin-bottom: 30px;
        }

        .metric-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 14px;
            padding: 16px;
            text-align: center;
            page-break-inside: avoid;
        }

        .metric-label {
            font-size: 9px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            margin-bottom: 4px;
        }

        .metric-value {
            font-size: 18px;
            font-weight: 800;
            color: #1e293b;
        }

        .metric-value.highlight {
            color: #10b981;
        }

        /* Progression Timeline */
        .section-title {
            font-size: 12px;
            font-weight: 800;
            color: #1e293b;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            margin-bottom: 15px;
            border-left: 3px solid #4f46e5;
            padding-left: 8px;
            margin-top: 25px;
        }

        .timeline-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 35px;
            page-break-inside: avoid;
        }

        .timeline-card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 12px 15px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .timeline-level {
            font-size: 9px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
        }

        .timeline-score {
            font-size: 16px;
            font-weight: 800;
        }

        .timeline-score.passed { color: #059669; }
        .timeline-score.failed { color: #dc2626; }

        .timeline-badge {
            width: 22px;
            height: 22px;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: 700;
        }
        .timeline-badge.passed { background: #d1fae5; color: #065f46; }
        .timeline-badge.failed { background: #fee2e2; color: #991b1b; }

        /* Report Table Styling */
        .report-table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-top: 15px !important;
            font-size: 11px !important;
        }

        .report-table th {
            background-color: #1e1b4b !important;
            color: white !important;
            font-weight: 800 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.05em !important;
            padding: 12px 10px !important;
            border: 1px solid #1e1b4b !important;
            font-size: 9px !important;
        }

        .report-table td {
            padding: 10px 12px !important;
            border: 1px solid #e2e8f0 !important;
            vertical-align: top !important;
            color: #334155 !important;
            line-height: 1.4 !important;
        }

        .report-table tr:nth-child(even) {
            background-color: #f8fafc !important;
        }

        .report-table tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
        }

        .qa-content-table {
            font-size: 11px !important;
            font-weight: 500 !important;
            color: #334155 !important;
            line-height: 1.5 !important;
        }

        .qa-content-table p {
            margin: 0 0 6px 0 !important;
        }
        
        .qa-content-table p:last-child {
            margin: 0 !important;
        }

        .qa-type-tag {
            background: #f1f5f9;
            color: #475569;
            font-size: 8px;
            font-weight: 700;
            padding: 3px 6px;
            border-radius: 4px;
            text-transform: uppercase;
            letter-spacing: 0.03em;
            display: inline-block;
        }

        /* Specific styles for lists inside cells */
        .cell-pair-list {
            margin: 0 !important;
            padding: 0 !important;
            list-style: none !important;
        }
        
        .cell-pair-item {
            margin-bottom: 4px !important;
            font-size: 10px !important;
            line-height: 1.3 !important;
        }
        
        .cell-pair-item:last-child {
            margin-bottom: 0 !important;
        }
    `;

    // 1. Metrics Card Calculations
    const calculatedScore = getCalculatedSkillScore(skillResult) !== null ? getCalculatedSkillScore(skillResult) : 0;
    const maxScore = (skillResult.skill?.levels_count || 1) * 100;
    const durationStr = calculateDuration(skillResult.started_at, skillResult.finished_at);
    const warnings = skillResult.cheat_warnings || 0;
    
    let metricsHtml = `
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-label">Assessment Domain</div>
                <div class="metric-value" style="color: #4f46e5;">${skillName}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Domain Score</div>
                <div class="metric-value highlight">${calculatedScore} <span style="font-size: 11px; color: #64748b; font-weight: 400;">/ ${maxScore}</span></div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Peak Tier Reached</div>
                <div class="metric-value">Level ${skillResult.max_level_reached || 1}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Integrity Warnings</div>
                <div class="metric-value" style="color: ${warnings > 0 ? '#dc2626' : '#10b981'};">${warnings}</div>
            </div>
        </div>
    `;

    // 2. Build Timeline Progression History
    let timelineHtml = '';
    if (levelLogs.length > 0) {
        timelineHtml = `
            <div class="section-title">Tier Progression History</div>
            <div class="timeline-grid">
        `;
        levelLogs.forEach(log => {
            const isPass = log.status === 'passed';
            timelineHtml += `
                <div class="timeline-card">
                    <div>
                        <div class="timeline-level">Level ${log.level_number}</div>
                        <div class="timeline-score ${isPass ? 'passed' : 'failed'}">${log.score}%</div>
                    </div>
                    <div class="timeline-badge ${isPass ? 'passed' : 'failed'}">
                        ${isPass ? '✓' : '✗'}
                    </div>
                </div>
            `;
        });
        timelineHtml += `</div>`;
    }

    // 3. Build Detailed Q&A Response Log Table
    let qaHtml = `
        <div class="section-title">Detailed Response Log & Performance Analysis</div>
        <table class="report-table">
            <thead>
                <tr>
                    <th style="width: 5%; text-align: center;">No.</th>
                    <th style="width: 12%;">Type</th>
                    <th style="width: 43%;">Question</th>
                    <th style="width: 17%;">Candidate Answer</th>
                    <th style="width: 17%;">Correct Answer</th>
                    <th style="width: 6%; text-align: center;">Score</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    skillAnswers.forEach((ans, idx) => {
        const isCorrect = ans.is_correct;
        const qType = ans.question?.type || 'Standard';
        
        // Clean HTML tags and entities in question text
        let qContent = ans.question?.content || '';
        qContent = qContent.replace(/&nbsp;/g, ' ').trim();

        let studentAnsCell = '';
        let correctAnsCell = '';

        // Generate custom HTML elements based on Question type
        if (qType === 'matching') {
            const pairs = getMatchingPairs(ans);
            let sPairs = [];
            let cPairs = [];
            pairs.forEach(pair => {
                const color = pair.isCorrect ? '#059669' : '#dc2626';
                sPairs.push(`
                    <li class="cell-pair-item" style="color: ${color};">
                        <strong>${pair.source}</strong> ➔ ${pair.studentTarget || '—'}
                    </li>
                `);
                cPairs.push(`
                    <li class="cell-pair-item" style="color: #059669;">
                        <strong>${pair.source}</strong> ➔ ${pair.target}
                    </li>
                `);
            });
            studentAnsCell = `<ul class="cell-pair-list">${sPairs.join('')}</ul>`;
            correctAnsCell = `<ul class="cell-pair-list">${cPairs.join('')}</ul>`;
        } else if (qType === 'ordering') {
            const studentParts = getStudentParts(ans);
            const correctOptions = getCorrectOptions(ans.question);
            const color = isCorrect ? '#059669' : '#dc2626';
            studentAnsCell = `<div style="color: ${color}; font-weight: 600; line-height: 1.4;">${studentParts.join(' ➔ ') || '—'}</div>`;
            correctAnsCell = `<div style="color: #059669; font-weight: 600; line-height: 1.4;">${correctOptions.join(' ➔ ')}</div>`;
        } else {
            // Standard questions (MCQ, Fill Blanks, Highlights, etc.)
            let studentAnswerDisplay = '';
            let correctAnswerDisplay = '';
            
            if (qType === 'fill_blank') {
                const parts = getStudentParts(ans);
                studentAnswerDisplay = parts.length > 0 ? parts.join(', ') : '—';
                correctAnswerDisplay = getCorrectOptions(ans.question).join(', ');
            } else if (['word_selection', 'click_word', 'highlight'].includes(qType)) {
                const parts = getStudentParts(ans);
                studentAnswerDisplay = parts.length > 0 ? parts.join(', ') : '—';
                correctAnswerDisplay = getCorrectOptions(ans.question).join(', ');
            } else if (qType === 'speaking') {
                studentAnswerDisplay = 'Audio Answer Submitted';
                correctAnswerDisplay = 'N/A';
            } else {
                studentAnswerDisplay = ans.text_answer || (ans.option?.option_text) || '—';
                const correctOpt = getCorrectOptions(ans.question);
                correctAnswerDisplay = correctOpt.length > 0 ? correctOpt.join(', ') : '—';
            }

            const color = isCorrect ? '#059669' : '#dc2626';
            studentAnsCell = `<span style="color: ${color}; font-weight: 600;">${studentAnswerDisplay}</span>`;
            correctAnsCell = `<span style="color: #059669; font-weight: 600;">${correctAnswerDisplay}</span>`;
        }

        qaHtml += `
            <tr>
                <td style="text-align: center; font-weight: 800;">${idx + 1}</td>
                <td><span class="qa-type-tag">${qType}</span></td>
                <td><div class="qa-content-table">${qContent}</div></td>
                <td>${studentAnsCell}</td>
                <td>${correctAnsCell}</td>
                <td style="text-align: center; font-weight: 800; color: ${isCorrect ? '#059669' : '#dc2626'}; font-style: italic;">
                    ${isCorrect ? `+${ans.points_awarded || 10}` : '0'}
                </td>
            </tr>
        `;
    });
    
    qaHtml += `
            </tbody>
        </table>
    `;

    // 4. Construct complete DOM body inside iframe
    doc.body.innerHTML = `
        <style>${printStyle}</style>
        <div style="padding: 0 10px;">
            <!-- Premium Header Banner -->
            <div class="header-container">
                <div>
                    <div class="header-logo">Performance Insights Profile</div>
                    <div class="header-subtitle">Official Assessment Metrics Report</div>
                </div>
                <div class="info-grid">
                    <div class="info-item"><strong>Candidate Name:</strong> ${studentName}</div>
                    <div class="info-item" style="text-align: right;"><strong>Student ID:</strong> ${studentCode}</div>
                    <div class="info-item"><strong>Evaluation Date:</strong> ${finishedAt}</div>
                    <div class="info-item" style="text-align: right;"><strong>Total Time Spent:</strong> ${durationStr}</div>
                </div>
            </div>
            
            <!-- Metrics Cards -->
            ${metricsHtml}
            
            <!-- Timeline Cards -->
            ${timelineHtml}
            
            <!-- Response Log Table -->
            ${qaHtml}
        </div>
    `;

    // Give it a moment to render fonts cleanly, then open print dialogue
    setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => {
            document.body.removeChild(iframe);
        }, 1000);
    }, 1200);
};

onMounted(fetchDetails);
</script>

<template>
    <AdminLayout>
        <div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 mt-6 px-4 md:px-12">

            <!-- Header -->
            <div
                class="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6 md:space-y-0">
                <div class="flex items-center gap-4">
                    <Button icon="pi pi-arrow-left" text severity="secondary" @click="router.back()"
                        class="rounded-xl bg-slate-50" />
                    <div>
                        <h1 class="text-3xl font-black text-slate-800 tracking-tight lowercase first-letter:uppercase">
                            Student Journey Matrix</h1>
                        <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">Detailed level
                            movement & response timeline</p>
                    </div>
                </div>
                <div class="flex items-center space-x-3" v-if="selectedAttempt && currentUser?.role === 'admin'">
                    <Button label="Reset / Retry" severity="danger" outlined size="small"
                        class="text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-xl"
                        @click="voidAttempt(selectedAttempt)" />
                </div>
            </div>

            <div v-if="loading" class="flex flex-col items-center justify-center py-40">
                <ProgressSpinner />
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-8">Fetching Identity
                    Data...</p>
            </div>

            <div v-else-if="selectedAttempt" class="space-y-12">
                <!-- Summary Card -->
                <div
                    class="bg-slate-900 rounded-[2.5rem] p-10 text-white grid grid-cols-1 md:grid-cols-3 gap-12 border border-slate-800 shadow-2xl relative overflow-hidden">
                    <div class="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
                        <i class="pi pi-chart-bar text-9xl"></i>
                    </div>

                    <div class="space-y-2">
                        <p class="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-1">Candidate
                            Profile</p>
                        <p class="text-2xl font-black uppercase tracking-tight">
                            {{ selectedAttempt.student?.user?.first_name || selectedAttempt.user?.first_name || 'DEMO'
                            }}
                            {{ selectedAttempt.student?.user?.last_name || selectedAttempt.user?.last_name || 'USER' }}
                        </p>
                        <p class="text-[10px] font-bold text-slate-400 tracking-widest">{{
                            selectedAttempt.student?.student_code || 'STAFF_ACCOUNT' }}</p>
                    </div>

                    <div class="space-y-2">
                        <p class="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-1">Efficiency
                            Index</p>
                        <div class="flex items-baseline gap-2">
                            <span class="text-5xl font-black italic tracking-tighter text-brand-primary">
                                {{ Math.round(Number(getTotalScore(selectedAttempt)) / selectedAttempt.skills_count ,2) }}</span>
                             <span class="text-xl font-black text-slate-500"> / {{   Number(selectedAttempt.total_levels* 100 / selectedAttempt.skills_count , 2)}} </span>
                            
                        </div>
                        <div class="flex items-baseline gap-2 mt-2">
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-2">Total Score:</span>
                            <span class="text-lg font-black text-emerald-400">{{selectedAttempt.overall_score }}</span>
                            <span class="text-xl font-black text-slate-500">%</span>
                        </div>
                    </div>

                    <div class="space-y-2">
                        <p class="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-1">Execution
                            Metrics</p>
                        <p class="text-xs font-black uppercase tracking-wider">{{ selectedAttempt.finished_at ? new
                            Date(selectedAttempt.finished_at).toLocaleString() : 'N/A' }}</p>
                        <div class="mt-2 flex items-center gap-2">
                            <Tag :value="selectedAttempt.status"
                                :severity="selectedAttempt.status === 'completed' ? 'success' : 'warning'"
                                class="text-[9px] font-black uppercase px-3" />
                        </div>
                    </div>
                </div>

                <!-- Skills Tabs -->
                <Tabs v-if="sortedAttemptSkills.length" :value="sortedAttemptSkills[0].skill_id.toString()">
                    <TabList class="bg-transparent border-none mb-8 overflow-x-auto hide-scrollbar">
                        <Tab v-for="skillResult in sortedAttemptSkills" :key="skillResult.id"
                            :value="skillResult.skill_id.toString()" class="mr-4 group shrink-0">
                            <div
                                class="flex items-center space-x-3 px-6 py-3 rounded-2xl transition-all group-aria-selected:bg-brand-primary group-aria-selected:text-white group-aria-selected:shadow-lg group-aria-selected:shadow-indigo-200/50 bg-white border border-slate-100 hover:border-slate-200">
                                <span
                                    class="w-6 h-6 rounded-lg bg-indigo-50/50 text-indigo-500 group-aria-selected:bg-white/20 group-aria-selected:text-white flex items-center justify-center font-black text-[10px]">{{
                                    skillResult.skill?.short_code || 'S' }}</span>
                                <span class="text-[11px] font-black uppercase tracking-widest">{{
                                    getSkillDisplayName(skillResult.skill?.name) }}</span>
                            </div>
                        </Tab>
                    </TabList>

                    <TabPanels class="bg-transparent p-0">
                        <TabPanel v-for="skillResult in sortedAttemptSkills" :key="skillResult.id"
                            :value="skillResult.skill_id.toString()">

                            <div class="space-y-10" :id="'skill-report-' + skillResult.skill_id">
                                <!-- Skill Summary Card -->
                                <div
                                    class="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm space-y-8 relative overflow-hidden group">
                                    <div
                                        class="absolute top-0 right-0 p-8 opacity-5 text-8xl pointer-events-none group-hover:scale-110 transition-transform duration-700">
                                        <i class="pi pi-verified"></i>
                                    </div>
                                    <div class="flex items-center justify-between relative z-10">
                                        <div class="flex items-center space-x-4">
                                            <div
                                                class="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center font-black text-lg border border-indigo-100">
                                                {{ skillResult.skill?.short_code || 'S' }}</div>
                                            <div>
                                                <h4
                                                    class="text-base font-black text-slate-800 uppercase tracking-wider">
                                                    {{ getSkillDisplayName(skillResult.skill?.name) }}</h4>
                                                <p
                                                    class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                                    Skill Domain Assessment</p>
                                            </div>
                                        </div>
                                        <div class="flex items-center space-x-6">
                                            <div
                                                class="flex items-center gap-8 mr-6 border-r border-slate-100 pr-8 py-2">
                                                <div class="text-right">
                                                    <p
                                                        class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                                        Started At</p>
                                                    <p class="text-[11px] font-black text-slate-700">{{
                                                        formatTime(skillResult.started_at) }}</p>
                                                </div>
                                                <div class="text-right">
                                                    <p
                                                        class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                                        Finished At</p>
                                                    <p class="text-[11px] font-black text-slate-700">{{
                                                        formatTime(skillResult.finished_at) }}</p>
                                                </div>
                                                <div class="text-right">
                                                    <p
                                                        class="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">
                                                        Duration</p>
                                                    <p class="text-[11px] font-black text-indigo-600">{{
                                                        calculateDuration(skillResult.started_at,
                                                        skillResult.finished_at) }}</p>
                                                </div>
                                            </div>
                                                <div class="text-right border-l border-slate-100 pl-6 ml-2">
                                                    <div class="text-3xl font-black text-emerald-600 italic">
                                                        {{ getCalculatedSkillScore(skillResult) !== null ? getCalculatedSkillScore(skillResult) : 0 }}
                                                        <span
                                                            class="text-lg text-emerald-400">{{ '/' + ((skillResult.skill?.levels_count || 1) * 100) }}</span>
                                                    </div>
                                                    <p
                                                        class="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                        Skill Score</p>
                                                </div>

                                                

                                            <div class="text-right border-l border-slate-100 pl-6 ml-2">
                                                <div class="text-3xl font-black text-slate-800 italic">{{
                                                    skillResult.max_level_reached }}</div>
                                                <p
                                                    class="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                    Peak Tier Reached</p>
                                            </div>

                                            <div v-if="skillResult.cheat_warnings > 0"
                                                class="text-right border-l border-slate-100 pl-6 ml-2">
                                                <div class="text-3xl font-black text-rose-600 italic">{{
                                                    skillResult.cheat_warnings }}</div>
                                                <p
                                                    class="text-[9px] font-black text-rose-400 uppercase tracking-widest">
                                                    Skill Warnings</p>
                                            </div>
                                            <div class="flex items-center gap-2 ml-6 pl-6 border-l border-slate-100">
                                                    <Button v-if="currentUser?.role === 'admin'" label=""
                                                        icon="pi pi-refresh" severity="danger" outlined size="small"
                                                        class="text-[9px] font-black uppercase tracking-widest px-3 py-2 rounded-xl"
                                                        @click="resetSkill(skillResult.skill_id, getSkillDisplayName(skillResult.skill?.name))" />
                                                    
                                                    <Button label="" icon="pi pi-file-pdf" severity="help" size="small"
                                                        class="text-[9px] font-black uppercase tracking-widest px-3 py-2 rounded-xl bg-indigo-600 border-none"
                                                        @click="exportSkillToPdf(skillResult.skill_id)" />
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Movement Timeline -->
                                    <div
                                        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-4 border-t border-slate-50 relative z-10">
                                        <div v-for="log in (selectedAttempt.attempt_levels || []).filter(l => l.skill_id === skillResult.skill_id)"
                                            :key="log.id"
                                            class="bg-slate-50 border border-slate-100 rounded-2xl p-6 flex justify-between items-center transition-all hover:bg-white hover:shadow-md">
                                            <div>
                                                <p
                                                    class="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                                                    Level {{ log.level_number }}</p>
                                                <div class="flex items-baseline gap-1">
                                                    <span class="text-xl font-black italic"
                                                        :class="log.status === 'passed' ? 'text-emerald-600' : 'text-rose-600'">{{
                                                        log.score }}</span>
                                                    <span class="text-[10px] font-black text-slate-400">%</span>
                                                </div>
                                            </div>
                                            <div :class="log.status === 'passed' ? 'text-emerald-500 bg-emerald-100/50 border-emerald-100' : 'text-rose-500 bg-rose-100/50 border-rose-100'"
                                                class="w-10 h-10 rounded-xl flex items-center justify-center text-sm border shadow-sm">
                                                <i :class="log.status === 'passed' ? 'pi pi-check' : 'pi pi-times'"></i>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Detailed Response Timeline for this Skill -->
                                <div class="space-y-6 pt-6">
                                    <div class="flex items-center gap-6">
                                        <h4
                                            class="text-sm font-black text-slate-800 uppercase tracking-[0.2em] flex items-center">
                                            <i class="pi pi-list mr-3 text-indigo-500"></i> Detailed Response Timeline
                                        </h4>
                                        <div class="flex-1 h-px bg-slate-100"></div>
                                        <span
                                            class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] bg-white px-4 py-2 rounded-full border border-slate-100 shadow-sm">
                                            {{(selectedAttempt.answers || []).filter(a => a.question?.skill_id ===
                                            skillResult.skill_id).length }} Questions
                                        </span>
                                    </div>

                                    <div class="grid grid-cols-1 gap-6">
                                        <div v-for="(answer, idx) in (selectedAttempt.answers || []).filter(a => a.question?.skill_id === skillResult.skill_id)"
                                            :key="answer.id"
                                            class="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm hover:shadow-xl transition-all duration-500 group">
                                            <div class="flex flex-col md:flex-row items-start gap-8">
                                                <div class="w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center font-black text-lg transition-transform group-hover:scale-110"
                                                    :class="answer.is_correct ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-lg shadow-emerald-50' : 'bg-rose-50 text-rose-600 border border-rose-100 shadow-lg shadow-rose-50'">
                                                    {{ idx + 1 }}
                                                </div>
                                                <div class="grow space-y-6 w-full">
                                                    <div
                                                        class="flex flex-col md:flex-row justify-between items-start gap-4">
                                                        <div class="space-y-3">
                                                            <div class="flex items-center gap-3 flex-wrap">
                                                                <Tag :value="answer.question?.type" severity="secondary"
                                                                    class="text-[9px] font-black uppercase px-3 py-1 rounded-lg" />
                                                                <div v-if="answer.question?.passage"
                                                                    class="flex items-center gap-2 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">
                                                                    <i
                                                                        class="pi pi-file text-[10px] text-indigo-500"></i>
                                                                    <span
                                                                        class="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Context:
                                                                        {{ answer.question.passage.title }}</span>
                                                                </div>
                                                            </div>
                                                            <div class="text-base font-bold text-slate-700 leading-relaxed max-w-3xl"
                                                                v-html="answer.question?.content"></div>
                                                        </div>
                                                        <div
                                                            class="text-right flex-shrink-0 bg-slate-50 p-4 rounded-2xl border border-slate-100 min-w-[140px]">
                                                            <div class="text-3xl font-black italic tracking-tighter"
                                                                :class="answer.is_correct ? 'text-emerald-600' : 'text-rose-600'">
                                                                +{{ answer.points_awarded }}
                                                            </div>
                                                            <div
                                                                class="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                                                Efficiency Points</div>
                                                        </div>
                                                    </div>

                                                    <!-- Comparison -->
                                                    <div class="grid grid-cols-1 gap-6 pt-6 border-t border-slate-50">
                                                        <!-- Multi-part Answer Layout (Drag-Drop, etc) -->
                                                        <!-- Matching Answer Layout -->
                                                        <div v-if="answer.question?.type === 'matching'" class="space-y-4">
                                                            <p class="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Matching Pairs Evaluation</p>
                                                            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                                <div v-for="pair in getMatchingPairs(answer)" :key="pair.id"
                                                                    class="p-4 rounded-2xl border flex flex-col gap-2 transition-all"
                                                                    :class="pair.isCorrect ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'">
                                                                    <div class="flex justify-between items-start">
                                                                        <span class="text-[8px] font-black uppercase tracking-wider" :class="pair.isCorrect ? 'text-emerald-400' : 'text-rose-400'">
                                                                            {{ pair.source }}
                                                                        </span>
                                                                        <i :class="pair.isCorrect ? 'pi pi-check-circle text-emerald-500' : 'pi pi-times-circle text-rose-500'"></i>
                                                                    </div>
                                                                    <div class="space-y-1">
                                                                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Student Matched:</p>
                                                                        <p class="text-xs font-black" :class="pair.isCorrect ? 'text-emerald-700' : 'text-rose-700'">
                                                                            {{ pair.studentTarget || '—' }}
                                                                        </p>
                                                                    </div>
                                                                    <div v-if="!pair.isCorrect" class="pt-1 border-t border-rose-100 mt-1">
                                                                        <p class="text-[10px] font-bold text-emerald-400 uppercase tracking-tighter">Correct Target:</p>
                                                                        <p class="text-xs font-black text-emerald-700">{{ pair.target }}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <!-- Ordering Answer Layout -->
                                                        <div v-else-if="answer.question?.type === 'ordering'" class="space-y-4">
                                                            <p class="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Sentence Construction Evaluation</p>
                                                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                                <div class="p-6 rounded-3xl bg-slate-50 border border-slate-100 relative overflow-hidden">
                                                                    <div class="absolute top-0 right-0 p-4 opacity-5 text-4xl">
                                                                        <i class="pi pi-user"></i>
                                                                    </div>
                                                                    <p class="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-3">Student Answer</p>
                                                                    <div class="text-sm font-black flex items-center gap-2" :class="answer.is_correct ? 'text-emerald-700' : 'text-rose-700'">
                                                                        <span dir="auto">{{ getStudentParts(answer).join(' ') || '—' }}</span>
                                                                        <i v-if="answer.is_correct" class="pi pi-check-circle text-emerald-500"></i>
                                                                        <i v-else class="pi pi-times-circle text-rose-500"></i>
                                                                    </div>
                                                                </div>
                                                                <div v-if="!answer.is_correct" class="p-6 rounded-3xl bg-emerald-50/50 border border-emerald-100 relative overflow-hidden">
                                                                    <div class="absolute top-0 right-0 p-4 opacity-10 text-4xl text-emerald-500">
                                                                        <i class="pi pi-key"></i>
                                                                    </div>
                                                                    <p class="text-[9px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-3">Correct Answer</p>
                                                                    <div class="text-sm font-black text-emerald-800" dir="auto">
                                                                        {{ getCorrectOptions(answer.question).join(' ') }}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <!-- Multi-part Answer Layout (Drag-Drop, Fill-Blank, etc) -->
                                                        <div v-else-if="['drag_drop', 'fill_blank', 'word_selection', 'click_word', 'highlight'].includes(answer.question?.type)"
                                                            class="space-y-4">
                                                            <p
                                                                class="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">
                                                                Detailed Evaluation</p>
                                                            <div
                                                                class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                                <div v-for="(correctVal, pIdx) in getCorrectOptions(answer.question)"
                                                                    :key="pIdx"
                                                                    class="p-4 rounded-2xl border flex flex-col gap-2 transition-all"
                                                                    :class="isPartCorrect(answer, correctVal, pIdx) ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'">
                                                                    <div class="flex justify-between items-start">
                                                                        <span
                                                                            class="text-[8px] font-black uppercase tracking-wider"
                                                                            :class="isPartCorrect(answer, correctVal, pIdx) ? 'text-emerald-400' : 'text-rose-400'">
                                                                            Part {{ pIdx + 1 }}
                                                                        </span>
                                                                        <i
                                                                            :class="isPartCorrect(answer, correctVal, pIdx) ? 'pi pi-check-circle text-emerald-500' : 'pi pi-times-circle text-rose-500'"></i>
                                                                    </div>
                                                                    <div class="space-y-1">
                                                                        <p
                                                                            class="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                                                            Student:</p>
                                                                        <p class="text-xs font-black"
                                                                            :class="isPartCorrect(answer, correctVal, pIdx) ? 'text-emerald-700' : 'text-rose-700'">
                                                                            {{ ['word_selection', 'click_word', 'highlight'].includes(answer.question?.type) 
                                                                                ? (isPartCorrect(answer, correctVal, pIdx) ? correctVal : (getStudentParts(answer)[0] || '—'))
                                                                                : (getStudentParts(answer)[pIdx] || '—') }}
                                                                        </p>
                                                                    </div>
                                                                    <div v-if="!isPartCorrect(answer, correctVal, pIdx)"
                                                                        class="pt-1 border-t border-rose-100 mt-1">
                                                                        <p
                                                                            class="text-[10px] font-bold text-emerald-400 uppercase tracking-tighter">
                                                                            Correct:</p>
                                                                        <p class="text-xs font-black text-emerald-700">
                                                                            {{ correctVal }}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <!-- Simple Answer Layout (MCQ, Short Answer) -->
                                                        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                            <div
                                                                class="p-6 rounded-3xl bg-slate-50 border border-slate-100 relative overflow-hidden">
                                                                <div
                                                                    class="absolute top-0 right-0 p-4 opacity-5 text-4xl">
                                                                    <i class="pi pi-user"></i>
                                                                </div>
                                                                <p
                                                                    class="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-3">
                                                                    Student Input</p>
                                                                <div class="text-sm font-black"
                                                                    :class="answer.is_correct ? 'text-emerald-700' : 'text-rose-700'">
                                                                    <template
                                                                        v-if="answer.question?.type === 'speaking'">
                                                                        <audio v-if="answer.media_answer"
                                                                            :src="resolveUrl(answer.media_answer)"
                                                                            controls class="h-8"></audio>
                                                                        <span v-else>No recording</span>
                                                                    </template>
                                                                    <template v-else>
                                                                        {{ answer.option?.option_text ||
                                                                        answer.text_answer || '—' }}
                                                                    </template>
                                                                    <i v-if="answer.is_correct"
                                                                        class="pi pi-check-circle ml-2"></i>
                                                                    <i v-else class="pi pi-times-circle ml-2"></i>
                                                                </div>
                                                                
                                                                <!-- Word Count Badge for Writing/Short Answer -->
                                                                <div v-if="['writing', 'short_answer'].includes(answer.question?.type) && answer.word_count !== null" 
                                                                    class="mt-4 pt-4 border-t border-slate-200 flex items-center gap-2">
                                                                    <i class="pi pi-align-right text-slate-400"></i>
                                                                    <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest">عدد الكلمات:</span>
                                                                    <span class="text-lg font-black text-brand-primary">{{ answer.word_count }}</span>
                                                                </div>
                                                            </div>
                                                            <div v-if="!answer.is_correct && answer.question?.type !== 'speaking'"
                                                                class="p-6 rounded-3xl bg-emerald-50/50 border border-emerald-100 relative overflow-hidden">
                                                                <div
                                                                    class="absolute top-0 right-0 p-4 opacity-10 text-4xl text-emerald-500">
                                                                    <i class="pi pi-key"></i>
                                                                </div>
                                                                <p
                                                                    class="text-[9px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-3">
                                                                    System Key</p>
                                                                <div class="text-sm font-black text-emerald-800">
                                                                    {{answer.question?.options?.find(o =>
                                                                    o.is_correct)?.option_text || '—' }}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div v-if="!((selectedAttempt.answers || []).filter(a => a.question?.skill_id === skillResult.skill_id).length)"
                                            class="bg-slate-50 rounded-[2rem] p-12 text-center border border-dashed border-slate-200">
                                            <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                                                No questions answered for this skill</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </TabPanel>
                    </TabPanels>
                </Tabs>
            </div>
        </div>

        <!-- Custom Beautiful Modal -->
        <Dialog v-model:visible="modalConfig.visible" modal :closable="false" :style="{ width: '450px' }" class="rounded-[2rem] overflow-hidden border-0 shadow-2xl">
            <template #header>
                <div class="flex items-center gap-4 px-2 pt-2" :class="{
                    'text-emerald-500': modalConfig.type === 'success',
                    'text-rose-500': modalConfig.type === 'danger',
                    'text-amber-500': modalConfig.type === 'warning',
                    'text-indigo-500': modalConfig.type === 'info'
                }">
                    <div class="w-12 h-12 rounded-2xl flex items-center justify-center border shadow-sm" :class="{
                        'bg-emerald-50 border-emerald-100 text-emerald-600': modalConfig.type === 'success',
                        'bg-rose-50 border-rose-100 text-rose-600': modalConfig.type === 'danger',
                        'bg-amber-50 border-amber-100 text-amber-600': modalConfig.type === 'warning',
                        'bg-indigo-50 border-indigo-100 text-indigo-600': modalConfig.type === 'info'
                    }">
                        <i class="text-2xl" :class="{
                            'pi pi-check-circle': modalConfig.type === 'success',
                            'pi pi-times-circle': modalConfig.type === 'danger',
                            'pi pi-exclamation-triangle': modalConfig.type === 'warning',
                            'pi pi-info-circle': modalConfig.type === 'info'
                        }"></i>
                    </div>
                    <h3 class="font-black text-2xl tracking-tight text-slate-800">{{ modalConfig.title }}</h3>
                </div>
            </template>
            <div class="px-2 py-4 text-slate-600 font-medium leading-relaxed text-base">
                {{ modalConfig.message }}
            </div>
            <template #footer>
                <div class="flex justify-end gap-3 w-full px-2 pb-2 mt-4">
                    <Button v-if="modalConfig.showCancel" :label="modalConfig.cancelText" text severity="secondary" @click="handleModalCancel" class="font-bold px-6 py-3 rounded-xl hover:bg-slate-100" />
                    <Button :label="modalConfig.confirmText" @click="handleModalConfirm" 
                        class="font-black px-6 py-3 rounded-xl border-none shadow-md hover:shadow-lg transition-all"
                        :class="{
                            'bg-emerald-500 hover:bg-emerald-600 text-white': modalConfig.type === 'success',
                            'bg-rose-500 hover:bg-rose-600 text-white': modalConfig.type === 'danger',
                            'bg-amber-500 hover:bg-amber-600 text-white': modalConfig.type === 'warning',
                            'bg-indigo-500 hover:bg-indigo-600 text-white': modalConfig.type === 'info'
                        }"
                    />
                </div>
            </template>
        </Dialog>
    </AdminLayout>
</template>

<style scoped>
.animate-in {
    animation-duration: 0.8s;
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}

:deep(.p-tab) {
    padding: 0;
    border: none;
    background: transparent;
}

:deep(.p-tab-list) {
    border: none;
}

:deep(.p-tabpanels) {
    padding: 0;
}

.hide-scrollbar::-webkit-scrollbar {
    display: none;
}

.hide-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
}
</style>
