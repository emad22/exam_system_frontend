import ExcelJS from 'exceljs';

export const getCoreCefrLevel = (val) => {
    if (!val || val <= 0) return 'A1.1';

    if (val >= 801) return 'C1.2';
    if (val >= 701) return 'C1.1';
    if (val >= 668) return 'B2.2';
    if (val >= 634) return 'B2.1';
    if (val >= 601) return 'B1.2';
    if (val >= 501) return 'B1.1';
    if (val >= 401) return 'A2.2';
    if (val >= 301) return 'A2.1';
    if (val >= 201) return 'A1.2';

    return 'A1.1';
};


export const getCoreActflLevel = (val) => {
    if (!val || val <= 0) return 'Novice Low';

    if (val >= 801) return 'Superior';
    if (val >= 701) return 'Advanced High';
    if (val >= 668) return 'Advanced Mid+';
    if (val >= 634) return 'Advanced Mid';
    if (val >= 601) return 'Advanced Low';
    if (val >= 501) return 'Intermediate High';
    if (val >= 401) return 'Intermediate Mid';
    if (val >= 301) return 'Intermediate Low';
    if (val >= 201) return 'Novice High';
    if (val >= 101) return 'Novice Mid';

    return 'Novice Low';
};


export const getProductiveCefrLevel = (val) => {
    if (!val || val <= 0) return 'A1.1';

    if (val >= 801) return 'C2';
    if (val >= 701) return 'C1.2';
    if (val >= 668) return 'C1.1';
    if (val >= 634) return 'B2.2';
    if (val >= 601) return 'B2.1';
    if (val >= 501) return 'B1.2';
    if (val >= 401) return 'B1.1';
    if (val >= 301) return 'A2.2';
    if (val >= 201) return 'A2.1';
    if (val >= 101) return 'A1.2';

    return 'A1.1';
};


export const getProductiveActflLevel = (val) => {
    if (!val || val <= 0) return 'Novice Low';

    if (val >= 801) return 'Superior';
    if (val >= 701) return 'Advanced High';
    if (val >= 668) return 'Advanced Mid+';
    if (val >= 634) return 'Advanced Mid';
    if (val >= 601) return 'Advanced Low';
    if (val >= 501) return 'Intermediate High';
    if (val >= 401) return 'Intermediate Mid';
    if (val >= 301) return 'Intermediate Low';
    if (val >= 201) return 'Novice High';
    if (val >= 101) return 'Novice Mid';

    return 'Novice Low';
};

export const getSkillScore900 = (attempt, skillKey) => {
    if (!attempt || !attempt.attempt_skills) return 0;
    const skillResult = attempt.attempt_skills.find(as => {
        const name = (as.skill?.name || '').toLowerCase();
        if (skillKey === 'listening') return name.includes('listen') || name.includes('list');
        if (skillKey === 'reading') return name.includes('read');
        if (skillKey === 'structure') return name.includes('struct') || name.includes('struc') || name.includes('gram');
        if (skillKey === 'writing') return name.includes('writ');
        if (skillKey === 'speaking') return name.includes('speak');
        return false;
    });

    if (!skillResult || skillResult.score === null || skillResult.score === undefined) {
        return 0;
    }

    const num = Number(skillResult.score);
    if (num <= 0) return 0;

    if (num <= 100) {
        return (num / 100) * 900;
    }
    return num;
};

const skillMap = {
    'listening': 'Listening',
    'list': 'Listening',
    'reading': 'Reading',
    'read': 'Reading',
    'structure': 'Structure',
    'struct': 'Structure',
    'grammar': 'Structure',
    'gram': 'Structure',
    'writing': 'Writing',
    'writting': 'Writing',
    'writ': 'Writing',
    'speaking': 'Speaking',
    'speak': 'Speaking'
};

export const getSkillDisplayName = (name) => {
    if (!name) return 'Unknown Skill';
    const lowerName = name.toLowerCase();
    const matchedKey = Object.keys(skillMap).find(key => lowerName.includes(key));
    return matchedKey ? skillMap[matchedKey] : name;
};

export const isFullyCompleted = (attempt) => {
    return attempt.status === 'completed';
};

export const getStatusLabel = (attempt) => {
    return (attempt.status || '').toUpperCase();
};

/**
 * Export exam attempts and scores in Excel with centered & colored skill headers.
 */
export const exportGradesToExcel = async (attempts, { fileNamePrefix = 'Exam_Grades' } = {}) => {
    if (!attempts || attempts.length === 0) {
        throw new Error('No reports to export.');
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Grades', {
        views: [{ showGridLines: true }]
    });

    // Row 1: Group headers
    const row1 = worksheet.addRow([
        '', '', '', '', '',
        'Listening', '', '',
        'Reading', '', '',
        'Structure', '', '',
        'Writing', '', '',
        'Speaking', '', '',
        'Total', '', ''
    ]);

    // Row 2: Sub-headers
    const row2 = worksheet.addRow([
        '#',
        'Name',
        'Email',
        'username',
        'Status',
        'Listening Score',
        'CEFR Level',
        'ACTFL Level',
        'Reading Score',
        'CEFR Level',
        'ACTFL Level',
        'Structure Score',
        'CEFR Level',
        'ACTFL Level',
        'Writing Score',
        'CEFR Level',
        'ACTFL Level',
        'Speaking Score',
        'CEFR Level',
        'ACTFL Level',
        'Total Score',
        'CEFR Level',
        'ACTFL Level'
    ]);

    row1.height = 30;
    row2.height = 24;

    // Skill definitions with distinct, vibrant colors
    const skillGroups = [
        { cols: ['F', 'G', 'H'], name: 'Listening', bgHeader: '2563EB', bgSub: 'EFF6FF', textSub: '1D4ED8' }, // Blue
        { cols: ['I', 'J', 'K'], name: 'Reading', bgHeader: '0284C7', bgSub: 'F0F9FF', textSub: '0369A1' }, // Sky
        { cols: ['L', 'M', 'N'], name: 'Structure', bgHeader: '059669', bgSub: 'ECFDF5', textSub: '047857' }, // Emerald
        { cols: ['O', 'P', 'Q'], name: 'Writing', bgHeader: 'D97706', bgSub: 'FFFBEB', textSub: 'B45309' }, // Amber
        { cols: ['R', 'S', 'T'], name: 'Speaking', bgHeader: '7C3AED', bgSub: 'F5F3FF', textSub: '6D28D9' }, // Purple
        { cols: ['U', 'V', 'W'], name: 'Total', bgHeader: '0F172A', bgSub: 'F8FAFC', textSub: '0F172A' }, // Slate Navy
    ];

    const thinBorder = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };

    // Format top Row 1 blank info headers (Cols A..E)
    ['A', 'B', 'C', 'D', 'E'].forEach(col => {
        const cell = worksheet.getCell(`${col}1`);
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8FAFC' }
        };
        cell.border = thinBorder;
    });

    // Merge and format top group headers (Row 1, Cols F..W)
    skillGroups.forEach(group => {
        const startCol = group.cols[0];
        const endCol = group.cols[group.cols.length - 1];
        worksheet.mergeCells(`${startCol}1:${endCol}1`);
        const masterCell = worksheet.getCell(`${startCol}1`);
        masterCell.value = group.name;

        group.cols.forEach(col => {
            const cell = worksheet.getCell(`${col}1`);
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF' + group.bgHeader }
            };
            cell.font = {
                name: 'Calibri',
                size: 11,
                bold: true,
                color: { argb: 'FFFFFFFF' }
            };
            cell.alignment = {
                horizontal: 'center',
                vertical: 'middle'
            };
            cell.border = thinBorder;
        });
    });

    // Format info subheaders (Cols A..E in Row 2)
    ['A', 'B', 'C', 'D', 'E'].forEach(col => {
        const cell = worksheet.getCell(`${col}2`);
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF1F5F9' }
        };
        cell.font = {
            name: 'Calibri',
            size: 10,
            bold: true,
            color: { argb: 'FF1E293B' }
        };
        cell.alignment = {
            horizontal: (col === 'A' || col === 'E') ? 'center' : 'left',
            vertical: 'middle'
        };
        cell.border = thinBorder;
    });

    // Format skill subheaders (Cols F..W in Row 2)
    skillGroups.forEach(group => {
        group.cols.forEach(col => {
            const cell = worksheet.getCell(`${col}2`);
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF' + group.bgSub }
            };
            cell.font = {
                name: 'Calibri',
                size: 10,
                bold: true,
                color: { argb: 'FF' + group.textSub }
            };
            cell.alignment = {
                horizontal: 'center',
                vertical: 'middle'
            };
            cell.border = thinBorder;
        });
    });

    // Add Data Rows
    attempts.forEach((attempt, index) => {
        const student = attempt.student;
        const user = student?.user || attempt.user;
        const studentName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || '—';
        const email = user?.email || '—';
        const username = user?.username || student?.student_code || '—';
        const status = getStatusLabel(attempt);

        // 1. Listening (Core)
        const listVal = getSkillScore900(attempt, 'listening');
        const listScoreDisplay = listVal > 0 ? `${listVal.toFixed(1)}/900` : 0;
        const listCefr = getCoreCefrLevel(listVal);
        const listActfl = getCoreActflLevel(listVal);

        // 2. Reading (Core)
        const readVal = getSkillScore900(attempt, 'reading');
        const readScoreDisplay = readVal > 0 ? `${readVal.toFixed(1)}/900` : 0;
        const readCefr = getCoreCefrLevel(readVal);
        const readActfl = getCoreActflLevel(readVal);

        // 3. Structure (Core)
        const structVal = getSkillScore900(attempt, 'structure');
        const structScoreDisplay = structVal > 0 ? `${structVal.toFixed(1)}/900` : 0;
        const structCefr = getCoreCefrLevel(structVal);
        const structActfl = getCoreActflLevel(structVal);

        // 4. Writing (Productive)
        const writVal = getSkillScore900(attempt, 'writing');
        const writScoreDisplay = writVal > 0 ? Math.round(writVal) : 0;
        const writCefr = getProductiveCefrLevel(writVal);
        const writActfl = getProductiveActflLevel(writVal);

        // 5. Speaking (Productive)
        const speakVal = getSkillScore900(attempt, 'speaking');
        const speakScoreDisplay = speakVal > 0 ? Math.round(speakVal) : 0;
        const speakCefr = getProductiveCefrLevel(speakVal);
        const speakActfl = getProductiveActflLevel(speakVal);

        // 6. Total (Average of Core Skills: Listening, Reading, Structure)
        const coreTotalVal = (listVal + readVal + structVal) / 3;
        const totalScoreDisplay = coreTotalVal > 0 ? `${coreTotalVal.toFixed(1)}/900` : 0;
        const totalCefr = getCoreCefrLevel(coreTotalVal);
        const totalActfl = getCoreActflLevel(coreTotalVal);

        const dataRow = worksheet.addRow([
            index + 1,
            studentName,
            email,
            username,
            status,
            listScoreDisplay,
            listCefr,
            listActfl,
            readScoreDisplay,
            readCefr,
            readActfl,
            structScoreDisplay,
            structCefr,
            structActfl,
            writScoreDisplay,
            writCefr,
            writActfl,
            speakScoreDisplay,
            speakCefr,
            speakActfl,
            totalScoreDisplay,
            totalCefr,
            totalActfl
        ]);

        dataRow.height = 20;

        // Apply alignment & borders to each cell in data row
        dataRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            cell.font = { name: 'Calibri', size: 10 };
            cell.border = {
                bottom: { style: 'thin', color: { argb: 'FFF1F5F9' } },
                right: { style: 'thin', color: { argb: 'FFF1F5F9' } }
            };

            // Alignments: Name, Email, Username left-aligned; rest centered
            if (colNumber === 2 || colNumber === 3 || colNumber === 4) {
                cell.alignment = { horizontal: 'left', vertical: 'middle' };
            } else {
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
            }

            // Status styling
            if (colNumber === 5) {
                cell.font = {
                    name: 'Calibri',
                    size: 9,
                    bold: true,
                    color: { argb: status === 'COMPLETED' ? 'FF059669' : 'FFD97706' }
                };
            }
        });
    });

    // Column widths
    const columnWidths = [
        6,   // #
        28,  // Name
        38,  // Email
        15,  // username
        14,  // Status
        16,  // Listening Score
        13,  // CEFR Level
        18,  // ACTFL Level
        16,  // Reading Score
        13,  // CEFR Level
        18,  // ACTFL Level
        16,  // Structure Score
        13,  // CEFR Level
        18,  // ACTFL Level
        15,  // Writing Score
        13,  // CEFR Level
        18,  // ACTFL Level
        16,  // Speaking Score
        13,  // CEFR Level
        18,  // ACTFL Level
        16,  // Total Score
        13,  // CEFR Level
        18   // ACTFL Level
    ];

    columnWidths.forEach((w, idx) => {
        worksheet.getColumn(idx + 1).width = w;
    });

    // Generate buffer & trigger download in browser
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    const dateStamp = new Date().toISOString().slice(0, 10);
    anchor.download = `${fileNamePrefix}_${dateStamp}.xlsx`;
    anchor.click();
    window.URL.revokeObjectURL(url);
};

/**
 * Export detailed student answers into an Excel (.xlsx) file
 */
export const exportAnswersToExcel = async (attemptsWithAnswers, { fileNamePrefix = 'Student_Answers_Report' } = {}) => {
    if (!attemptsWithAnswers || attemptsWithAnswers.length === 0) {
        throw new Error('No student answers to export.');
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Student Answers', {
        views: [{ showGridLines: true }]
    });

    const headerRow = worksheet.addRow([
        'Attempt #',
        'Student Code',
        'Student Name',
        'Username',
        'Email',
        'Exam',
        'Question #',
        'Skill',
        'Type',
        'Question Text',
        'Correct Answer',
        'Student Answer',
        'Result',
        'Points Awarded',
        'Status'
    ]);

    headerRow.height = 24;
    headerRow.eachCell((cell) => {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF0F172A' }
        };
        cell.font = {
            name: 'Calibri',
            size: 10,
            bold: true,
            color: { argb: 'FFFFFFFF' }
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    attemptsWithAnswers.forEach((attempt, aIdx) => {
        const student = attempt.student;
        const user = student?.user || attempt.user;
        const studentName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || '—';
        const answers = attempt.answers || [];

        if (answers.length === 0) {
            worksheet.addRow([
                aIdx + 1,
                student?.student_code || '—',
                studentName,
                user?.username || '—',
                user?.email || '—',
                attempt.exam?.title || '—',
                '—', '—', '—',
                'No answers recorded for this attempt',
                '—', '—', '—', '—',
                getStatusLabel(attempt)
            ]);
            return;
        }

        answers.forEach((ans, qIdx) => {
            const question = ans.question || {};
            const cleanQuestionText = question.content
                ? String(question.content).replace(/<[^>]*>/g, '').trim()
                : '—';

            let studentAnswerText = '—';
            if (ans.option?.option_text) {
                studentAnswerText = ans.option.option_text;
            } else if (ans.text_answer) {
                studentAnswerText = String(ans.text_answer).replace(/<[^>]*>/g, '').trim();
            } else if (ans.option_id) {
                studentAnswerText = `Option #${ans.option_id}`;
            }

            let correctAnswerText = '—';
            if (question.options && question.options.length) {
                const correct = question.options.filter(o => o.is_correct).map(o => o.option_text);
                if (correct.length) correctAnswerText = correct.join(' / ');
            }

            worksheet.addRow([
                aIdx + 1,
                student?.student_code || '—',
                studentName,
                user?.username || '—',
                user?.email || '—',
                attempt.exam?.title || '—',
                qIdx + 1,
                getSkillDisplayName(question.skill?.name),
                question.type || '—',
                cleanQuestionText,
                correctAnswerText,
                studentAnswerText,
                ans.is_correct ? 'Correct (صحيح)' : 'Incorrect (خطأ)',
                ans.points_awarded ?? 0,
                getStatusLabel(attempt)
            ]);
        });
    });

    const widths = [10, 15, 25, 14, 28, 22, 10, 14, 12, 40, 25, 25, 14, 14, 14];
    widths.forEach((w, idx) => {
        worksheet.getColumn(idx + 1).width = w;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    const dateStamp = new Date().toISOString().slice(0, 10);
    anchor.download = `${fileNamePrefix}_${dateStamp}.xlsx`;
    anchor.click();
    window.URL.revokeObjectURL(url);
};
