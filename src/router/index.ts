import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { authStorage } from '@/services/authStorage';
import { PROCTORING_ENABLED } from '@/config/features';

const adminRoutes: RouteRecordRaw[] = [
  {
    path: '/admin',
    name: 'admin',
    component: () => import('@/views/admin/AdminDashboard.vue'),
    meta: { title: 'Admin Command Center', roles: ['admin', 'teacher', 'demo'] }
  },
  {
    path: '/admin/packages',
    name: 'admin.packages.index',
    component: () => import('@/views/admin/Packages/index.vue'),
    meta: { title: 'Package Management', roles: ['admin', 'demo'] }
  },
  {
    path: '/admin/packages/create',
    name: 'admin.packages.create',
    component: () => import('@/views/admin/Packages/create.vue'),
    meta: { title: 'Create Package', roles: ['admin', 'demo'] }
  },
  {
    path: '/admin/packages/:id/edit',
    name: 'admin.packages.edit',
    component: () => import('@/views/admin/Packages/edit.vue'),
    meta: { title: 'Edit Package', roles: ['admin', 'demo'] }
  },
  {
    path: '/admin/students',
    name: 'admin.students',
    component: () => import('@/views/admin/Students/index.vue'),
    meta: { title: 'Student Registry', roles: ['admin', 'demo'] }
  },
  {
    path: '/admin/students/create',
    name: 'admin.students.create',
    component: () => import('@/views/admin/Students/create.vue'),
    meta: { title: 'Add Student', roles: ['admin', 'demo'] }
  },
  {
    path: '/admin/students/batch',
    name: 'admin.students.batch',
    component: () => import('@/views/admin/Students/batch.vue'),
    meta: { title: 'Batch Student Import', roles: ['admin', 'demo'] }
  },
  {
    path: '/admin/students/:id/edit',
    name: 'admin.students.edit',
    component: () => import('@/views/admin/Students/edit.vue'),
    meta: { title: 'Edit Student', roles: ['admin', 'demo'] }
  },
  {
    path: '/admin/students/:id/show',
    name: 'admin.students.show',
    component: () => import('@/views/admin/Students/show.vue'),
    meta: { title: 'Student Profile', roles: ['admin', 'demo'] }
  },
  {
    path: '/admin/exams',
    name: 'admin.exams',
    component: () => import('@/views/admin/Exams/index.vue'),
    meta: { title: 'Assessment Templates', roles: ['admin', 'demo'] }
  },
  {
    path: '/admin/partners',
    name: 'admin.partners',
    component: () => import('@/views/admin/Partners/index.vue'),
    meta: { title: 'Partners Registry', roles: ['admin', 'demo'] }
  },
  {
    path: '/admin/partners/create',
    name: 'admin.partners.create',
    component: () => import('@/views/admin/Partners/create.vue'),
    meta: { title: 'Create Partner', roles: ['admin', 'demo'] }
  },
  {
    path: '/admin/exams/import',
    name: 'admin.exams.import',
    component: () => import('@/views/admin/Exams/import.vue'),
    meta: { title: 'Import Exam', roles: ['admin', 'demo'] }
  },
  {
    path: '/admin/exams/create',
    name: 'admin.exams.create',
    component: () => import('@/views/admin/Exams/create.vue'),
    meta: { title: 'Initialize Assessment', roles: ['admin', 'demo'] }
  },
  {
    path: '/admin/exams/:id/edit',
    name: 'admin.exams.edit',
    component: () => import('@/views/admin/Exams/create.vue'),
    props: true,
    meta: { title: 'Edit Assessment', roles: ['admin', 'demo'] }
  },
  {
    path: '/admin/exam-categories',
    name: 'admin.exams.categories',
    component: () => import('@/views/admin/ExamCategories/index.vue'),
    meta: { title: 'Exam Categories', roles: ['admin', 'demo'] }
  },
  {
    path: '/admin/exam-categories/create',
    name: 'admin.exams.categories.create',
    component: () => import('@/views/admin/ExamCategories/create.vue'),
    meta: { title: 'Create Category', roles: ['admin', 'demo'] }
  },
  {
    path: '/admin/exam-categories/:id/edit',
    name: 'admin.exams.categories.edit',
    component: () => import('@/views/admin/ExamCategories/edit.vue'),
    meta: { title: 'Edit Category', roles: ['admin', 'demo'] }
  },
  {
    path: '/admin/questions',
    name: 'admin.questions',
    component: () => import('@/views/admin/Questions/index.vue'),
    meta: { title: 'Central Bank Query', roles: ['admin', 'teacher', 'demo'] }
  },
  {
    path: '/admin/questions/create',
    name: 'admin.questions.create',
    component: () => import('@/views/admin/Questions/create.vue'),
    meta: { title: 'Create Question', roles: ['admin', 'teacher', 'demo'] }
  },
  {
    path: '/admin/questions/:id/edit',
    name: 'admin.questions.edit',
    component: () => import('@/views/admin/Questions/edit.vue'),
    props: true,
    meta: { title: 'Edit Question', roles: ['admin', 'teacher', 'demo'] }
  },
  {
    path: '/admin/skills',
    name: 'admin.skills',
    component: () => import('@/views/admin/Skills/index.vue'),
    meta: { title: 'Skills Overview', roles: ['admin', 'demo'] }
  },
  {
    path: '/admin/skills/create',
    name: 'admin.skills.create',
    component: () => import('@/views/admin/Skills/create.vue'),
    meta: { title: 'Create Skill', roles: ['admin', 'demo'] }
  },
  {
    path: '/admin/skills/:id/edit',
    name: 'admin.skills.edit',
    component: () => import('@/views/admin/Skills/edit.vue'),
    meta: { title: 'Edit Skill', roles: ['admin', 'demo'] }
  },
  {
    path: '/admin/levels',
    name: 'admin.levels',
    component: () => import('@/views/admin/Levels/index.vue'),
    meta: { title: 'Levels Overview', roles: ['admin', 'demo'] }
  },
  {
    path: '/admin/levels/create',
    name: 'admin.levels.create',
    component: () => import('@/views/admin/Levels/create.vue'),
    meta: { title: 'Create Level', roles: ['admin', 'demo'] }
  },
  {
    path: '/admin/levels/:id/edit',
    name: 'admin.levels.edit',
    component: () => import('@/views/admin/Levels/edit.vue'),
    meta: { title: 'Edit Level', roles: ['admin', 'demo'] }
  },
  {
    path: '/admin/skills/:id/levels',
    name: 'admin.skills.levels',
    component: () => import('@/views/admin/Levels/index.vue'),
    meta: { title: 'Skill Levels', roles: ['admin', 'demo'] }
  },
  {
    path: '/admin/reports',
    name: 'admin.reports',
    component: () => import('@/views/admin/AdminReports.vue'),
    meta: { title: 'Student Reports', roles: ['admin', 'teacher', 'demo'] }
  },
  {
    path: '/admin/reports/:id/show',
    name: 'admin.reports.show',
    component: () => import('@/views/admin/AdminReportShow.vue'),
    meta: { title: 'Report Details', roles: ['admin', 'teacher', 'demo'] }
  },
  {
    path: '/admin/grading',
    name: 'admin.grading',
    component: () => import('@/views/admin/Grading/index.vue'),
    meta: { title: 'Manual Grading', roles: ['admin', 'teacher', 'demo'] }
  },
  {
    path: '/admin/grading/attempt/:id',
    name: 'admin.grading.show',
    component: () => import('@/views/admin/Grading/Show.vue'),
    meta: { title: 'Correction Desk', roles: ['admin', 'teacher', 'demo'] }
  },
  {
    path: '/admin/payments',
    name: 'admin.payments',
    component: () => import('@/views/admin/AdminPayments.vue'),
    meta: { title: 'Payments Management', roles: ['admin', 'demo'] }
  },
  {
    path: '/admin/system-requirements',
    name: 'admin.system-requirements',
    component: () => import('@/views/admin/SystemRequirements/index.vue'),
    meta: { title: 'System Requirements', roles: ['admin', 'demo'] }
  },
  {
    path: '/admin/system-requirements/create',
    name: 'admin.system-requirements.create',
    component: () => import('@/views/admin/SystemRequirements/create.vue'),
    meta: { title: 'Create System Requirement', roles: ['admin', 'demo'] }
  },
  {
    path: '/admin/system-requirements/:id/edit',
    name: 'admin.system-requirements.edit',
    component: () => import('@/views/admin/SystemRequirements/edit.vue'),
    meta: { title: 'Edit System Requirement', roles: ['admin', 'demo'] }
  },
  {
    path: '/admin/staff',
    name: 'admin.staff',
    component: () => import('@/views/admin/Staff/index.vue'),
    meta: { title: 'Staff & Roles', roles: ['admin', 'demo'] }
  },
  {
    path: '/admin/staff/create',
    name: 'admin.staff.create',
    component: () => import('@/views/admin/Staff/create.vue'),
    meta: { title: 'Create Staff', roles: ['admin', 'demo'] }
  },
  {
    path: '/admin/staff/:id/edit',
    name: 'admin.staff.edit',
    component: () => import('@/views/admin/Staff/create.vue'),
    props: true,
    meta: { title: 'Edit Staff', roles: ['admin', 'demo'] }
  },
  {
    path: '/admin/partners/:id/edit',
    name: 'admin.partners.edit',
    component: () => import('@/views/admin/Partners/edit.vue'),
    meta: { title: 'Edit Partner', roles: ['admin', 'demo'] }
  },
  {
    path: '/admin/partners/:id/show',
    name: 'admin.partners.show',
    component: () => import('@/views/admin/Partners/show.vue'),
    meta: { title: 'Partner Details', roles: ['admin', 'demo'] }
  },
  {
    path: '/admin/certificates',
    name: 'admin.certificates',
    component: () => import('@/views/admin/Certificates/index.vue'),
    meta: { title: 'Issued Certificates', roles: ['admin', 'demo'] }
  },
  {
    path: '/admin/certificates/templates',
    name: 'admin.certificates.templates',
    component: () => import('@/views/admin/Certificates/Templates.vue'),
    meta: { title: 'Certificate Templates', roles: ['admin', 'demo'] }
  },
  {
    path: '/admin/certificates/templates/create',
    name: 'admin.certificates.templates.create',
    component: () => import('@/views/admin/Certificates/create.vue'),
    meta: { title: 'Create Certificate Template', roles: ['admin', 'demo'] }
  },
  {
    path: '/admin/certificates/templates/:id/edit',
    name: 'admin.certificates.templates.edit',
    component: () => import('@/views/admin/Certificates/edit.vue'),
    props: true,
    meta: { title: 'Edit Certificate Template', roles: ['admin', 'demo'] }
  },
  {
    path: '/admin/profile',
    name: 'admin.profile',
    component: () => import('@/views/ProfileView.vue'),
    meta: { title: 'Security & Identity', roles: ['admin', 'teacher', 'demo'] }
  },
  {
    path: '/admin/activity-logs',
    name: 'admin.logs',
    component: () => import('@/views/admin/ActivityLogs/index.vue'),
    meta: { title: 'System Activity Logs', roles: ['admin', 'demo'] }
  },
  {
    path: '/admin/proctoring',
    name: 'admin.proctoring',
    component: () => import('@/views/admin/Proctoring/index.vue'),
    meta: { title: 'Proctoring Management', roles: ['admin', 'demo'] }
  },
  {
    path: '/admin/proctoring/student/:studentId',
    name: 'admin.proctoring.student',
    component: () => import('@/views/admin/Proctoring/Student.vue'),
    meta: { title: 'Student Proctoring Profile', roles: ['admin', 'demo'] }
  },
  {
    path: '/admin/proctoring/:id',
    name: 'admin.proctoring.show',
    component: () => import('@/views/admin/Proctoring/Show.vue'),
    meta: { title: 'Session Details', roles: ['admin', 'demo'] }
  },
  {
    path: '/admin/cefr-actfl-thresholds',
    name: 'admin.cefr-actfl-thresholds',
    component: () => import('@/views/admin/CefrActflThresholds/index.vue'),
    meta: { title: 'CEFR & ACTFL Thresholds', roles: ['admin', 'demo'] }
  },
  {
    path: '/admin/rubrics',
    name: 'admin.rubrics',
    component: () => import('@/views/admin/Rubrics/index.vue'),
    meta: { title: 'Writing Rubrics & Criteria', roles: ['admin', 'demo'] }
  },
  {
    path: '/admin/live-speaking',
    name: 'admin.live-speaking',
    component: () => import('@/views/admin/AdminLiveSpeakingView.vue'),
    meta: { title: 'Live Speaking Management', roles: ['admin', 'demo'] }
  },
];

// Explicitly derive Teacher routes ONLY for routes authorized for teachers
const teacherRoutes: RouteRecordRaw[] = adminRoutes
  .filter(route => (route.meta?.roles as string[] | undefined)?.includes('teacher'))
  .map(route => ({
    ...route,
    path: route.path.replace(/^\/admin/, '/teacher'),
    name: route.name ? (route.name === 'admin' ? 'teacher' : (route.name as string).replace(/^admin\./, 'teacher.')) : undefined,
    meta: {
      ...route.meta,
      roles: ['teacher', 'admin', 'demo']
    }
  }));

const partnerRoutes: RouteRecordRaw[] = [
  {
    path: '/partner',
    name: 'partner',
    component: () => import('@/views/partner/Dashboard.vue'),
    meta: { title: 'Partner Dashboard', roles: ['partner', 'admin', 'demo'] }
  },
  {
    path: '/partner/students',
    name: 'partner.students',
    component: () => import('@/views/partner/Students/index.vue'),
    meta: { title: 'Student Directory', roles: ['partner', 'admin', 'demo'] }
  },
  {
    path: '/partner/reports',
    name: 'partner.reports',
    component: () => import('@/views/partner/Reports/index.vue'),
    meta: { title: 'Student Reports', roles: ['partner', 'admin', 'demo'] }
  },
  {
    path: '/partner/reports/:id/show',
    redirect: '/partner/reports'
  },
  {
    path: '/partner/certificates',
    name: 'partner.certificates',
    component: () => import('@/views/partner/Certificates.vue'),
    meta: { title: 'Student Certificates', roles: ['partner', 'admin', 'demo'] }
  },
  {
    path: '/partner/live-speaking',
    name: 'partner.live-speaking',
    component: () => import('@/views/partner/LiveSpeakingView.vue'),
    meta: { title: 'Live Speaking Bookings', roles: ['partner', 'admin', 'demo'] }
  }
];

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { title: 'Login ALPT' }
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/views/student/PublicRegisterWizard.vue'),
    meta: { title: 'Student Registration' }
  },
  {
    path: '/parent',
    name: 'parent',
    component: () => import('@/views/student/ParentPortal.vue')
  },
  {
    path: '/verify-certificate/:code',
    name: 'certificate.verify',
    component: () => import('@/views/PublicCertificateVerify.vue'),
    meta: { title: 'Certificate Verification' }
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('@/views/student/DashboardView.vue'),
    meta: { title: 'Student Dashboard', roles: ['student', 'admin', 'demo'] }
  },
  {
    path: '/exam/:id',
    name: 'exam',
    component: () => import('@/views/student/ExamView.vue'),
    meta: { roles: ['student', 'admin', 'demo'] }
  },
  {
    path: '/exam/setup/:examId/:skillId/:levelId?',
    name: 'exam.setup',
    component: () => import('@/views/student/ExamView.vue'),
    meta: { roles: ['student', 'admin', 'demo'] }
  },
  {
    path: '/exam/:id/result',
    name: 'result',
    component: () => import('@/views/student/ResultView.vue'),
    meta: { roles: ['student', 'admin', 'demo'] }
  },
  {
    path: '/students',
    component: () => import('@/views/student/Students.vue'),
    meta: { roles: ['admin', 'demo'] }
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('@/views/ProfileView.vue'),
    meta: { title: 'My Profile' }
  },
  {
    path: '/requirements',
    name: 'requirements',
    component: () => import('@/views/student/RequirementsView.vue'),
    meta: { title: 'System Requirements' }
  },
  {
    path: '/proctoring-requirements',
    name: 'proctoring-requirements',
    component: () => import('@/views/student/ProctoringRequirementsView.vue'),
    meta: { title: 'Proctoring System Check' }
  },
  {
    path: '/skill-selection',
    name: 'skill-selection',
    component: () => import('@/views/student/SkillSelectionView.vue'),
    meta: { title: 'Select Skill', roles: ['student', 'admin', 'demo'] }
  },
  {
    path: '/instructions/:examId/:skillId/:levelId?',
    name: 'exam.instructions',
    component: () => import('@/views/student/InstructionsView.vue'),
    meta: { title: 'Exam Instructions', roles: ['student', 'admin', 'demo'] }
  },
  ...adminRoutes,
  ...teacherRoutes,
  ...partnerRoutes
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach((to) => {
  const publicPages = ['/login', '/register', '/parent', '/requirements', '/proctoring-requirements'];
  const isPublicVerification = to.path.startsWith('/verify-certificate/');
  const authRequired = !publicPages.includes(to.path) && !isPublicVerification;
  const token = authStorage.getToken();
  const role = authStorage.getRole();

  if (authRequired && !token) {
    return '/login';
  }

  // Redirect authenticated users away from login page
  if (to.path === '/login' && token) {
    if (role === 'teacher') return '/teacher';
    if (role === 'student') return '/skill-selection';
    if (role === 'partner') return '/partner';
    return '/admin';
  }

  // Block proctoring routes when feature is disabled
  if (!PROCTORING_ENABLED && (to.path.startsWith('/admin/proctoring') || to.path.startsWith('/teacher/proctoring'))) {
    return to.path.startsWith('/teacher') ? '/teacher' : '/admin';
  }

  // Role-based protection via meta.roles
  const allowedRoles = to.meta?.roles as string[] | undefined;
  if (allowedRoles && Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    if (!allowedRoles.includes(role || '')) {
      if (role === 'teacher') return '/teacher';
      if (role === 'partner') return '/partner';
      if (role === 'student') return '/skill-selection';
      return '/admin';
    }
  }

  // Generic portal redirects
  if (to.path === '/dashboard') {
    if (role === 'student') return '/skill-selection';
    if (role === 'admin') return '/admin';
    if (role === 'teacher') return '/teacher';
    if (role === 'partner') return '/partner';
  }

  return true;
});

router.afterEach((to) => {
  const baseTitle = 'Arab Academy';
  const pageTitle = to.meta.title || (to.name as string)?.split('.').pop() || 'System';
  document.title = `${pageTitle.toString()} | ${baseTitle}`;
});

export default router;
