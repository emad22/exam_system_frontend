import { createRouter, createWebHistory } from 'vue-router';
import { authStorage } from '@/services/authStorage';
import { PROCTORING_ENABLED } from '@/config/features';

const adminRoutes = [
  {
    path: '/admin',
    name: 'admin',
    component: () => import('@/views/admin/AdminDashboard.vue'),
    meta: { title: 'Admin Command Center' }
  },
  {
    path: '/admin/packages',
    name: 'admin.packages.index',
    component: () => import('@/views/admin/Packages/index.vue'),
    meta: { title: 'Package Management' }
  },
  {
    path: '/admin/packages/create',
    name: 'admin.packages.create',
    component: () => import('@/views/admin/Packages/create.vue')
  },
  {
    path: '/admin/packages/:id/edit',
    name: 'admin.packages.edit',
    component: () => import('@/views/admin/Packages/edit.vue')
  },
  {
    path: '/admin/students',
    name: 'admin.students',
    component: () => import('@/views/admin/Students/index.vue'),
    meta: { title: 'Student Registry' }
  },
  {
    path: '/admin/students/create',
    name: 'admin.students.create',
    component: () => import('@/views/admin/Students/create.vue')
  },
  {
    path: '/admin/students/batch',
    name: 'admin.students.batch',
    component: () => import('@/views/admin/Students/batch.vue')
  },
  {
    path: '/admin/students/:id/edit',
    name: 'admin.students.edit',
    component: () => import('@/views/admin/Students/edit.vue')
  },
  {
    path: '/admin/students/:id/show',
    name: 'admin.students.show',
    component: () => import('@/views/admin/Students/show.vue')
  },
  {
    path: '/admin/exams',
    name: 'admin.exams',
    component: () => import('@/views/admin/Exams/index.vue'),
    meta: { title: 'Assessment Templates' }
  },
  {
    path: '/admin/partners',
    name: 'admin.partners',
    component: () => import('@/views/admin/Partners/index.vue')
  },
  {
    path: '/admin/partners/create',
    name: 'admin.partners.create',
    component: () => import('@/views/admin/Partners/create.vue')
  },
  {
    path: '/admin/exams/import',
    name: 'admin.exams.import',
    component: () => import('@/views/admin/Exams/import.vue')
  },
  {
    path: '/admin/exams/create',
    name: 'admin.exams.create',
    component: () => import('@/views/admin/Exams/create.vue'),
    meta: { title: 'Initialize Assessment' }
  },
  {
    path: '/admin/exams/:id/edit',
    name: 'admin.exams.edit',
    component: () => import('@/views/admin/Exams/create.vue'),
    props: true
  },
  {
    path: '/admin/exam-categories',
    name: 'admin.exams.categories',
    component: () => import('@/views/admin/ExamCategories/index.vue')
  },
  {
    path: '/admin/exam-categories/create',
    name: 'admin.exams.categories.create',
    component: () => import('@/views/admin/ExamCategories/create.vue')
  },
  {
    path: '/admin/exam-categories/:id/edit',
    name: 'admin.exams.categories.edit',
    component: () => import('@/views/admin/ExamCategories/edit.vue')
  },
  {
    path: '/admin/questions',
    name: 'admin.questions',
    component: () => import('@/views/admin/Questions/index.vue'),
    meta: { title: 'Central Bank Query' }
  },
  {
    path: '/admin/questions/create',
    name: 'admin.questions.create',
    component: () => import('@/views/admin/Questions/create.vue')
  },
  {
    path: '/admin/questions/:id/edit',
    name: 'admin.questions.edit',
    component: () => import('@/views/admin/Questions/edit.vue'),
    props: true
  },
  {
    path: '/admin/skills',
    name: 'admin.skills',
    component: () => import('@/views/admin/Skills/index.vue')
  },
  {
    path: '/admin/skills/create',
    name: 'admin.skills.create',
    component: () => import('@/views/admin/Skills/create.vue')
  },
  {
    path: '/admin/skills/:id/edit',
    name: 'admin.skills.edit',
    component: () => import('@/views/admin/Skills/edit.vue')
  },
  {
    path: '/admin/levels',
    name: 'admin.levels',
    component: () => import('@/views/admin/Levels/index.vue')
  },
  {
    path: '/admin/levels/create',
    name: 'admin.levels.create',
    component: () => import('@/views/admin/Levels/create.vue')
  },
  {
    path: '/admin/levels/:id/edit',
    name: 'admin.levels.edit',
    component: () => import('@/views/admin/Levels/edit.vue')
  },
  {
    path: '/admin/skills/:id/levels',
    name: 'admin.skills.levels',
    component: () => import('@/views/admin/Levels/index.vue')
  },
  {
    path: '/admin/reports',
    name: 'admin.reports',
    component: () => import('@/views/admin/AdminReports.vue')
  },
  {
    path: '/admin/reports/:id/show',
    name: 'admin.reports.show',
    component: () => import('@/views/admin/AdminReportShow.vue')
  },
  {
    path: '/admin/grading',
    name: 'admin.grading',
    component: () => import('@/views/admin/Grading/index.vue'),
    meta: { title: 'Manual Grading' }
  },
  {
    path: '/admin/grading/attempt/:id',
    name: 'admin.grading.show',
    component: () => import('@/views/admin/Grading/Show.vue'),
    meta: { title: 'Correction Desk' }
  },
  {
    path: '/admin/payments',
    name: 'admin.payments',
    component: () => import('@/views/admin/AdminPayments.vue')
  },
  {
    path: '/admin/system-requirements',
    name: 'admin.system-requirements',
    component: () => import('@/views/admin/SystemRequirements/index.vue')
  },
  {
    path: '/admin/system-requirements/create',
    name: 'admin.system-requirements.create',
    component: () => import('@/views/admin/SystemRequirements/create.vue')
  },
  {
    path: '/admin/system-requirements/:id/edit',
    name: 'admin.system-requirements.edit',
    component: () => import('@/views/admin/SystemRequirements/edit.vue')
  },
  {
    path: '/admin/staff',
    name: 'admin.staff',
    component: () => import('@/views/admin/Staff/index.vue')
  },
  {
    path: '/admin/staff/create',
    name: 'admin.staff.create',
    component: () => import('@/views/admin/Staff/create.vue')
  },
  {
    path: '/admin/staff/:id/edit',
    name: 'admin.staff.edit',
    component: () => import('@/views/admin/Staff/create.vue'),
    props: true
  },
  {
    path: '/admin/partners/:id/edit',
    name: 'admin.partners.edit',
    component: () => import('@/views/admin/Partners/edit.vue')
  },
  {
    path: '/admin/partners/:id/show',
    name: 'admin.partners.show',
    component: () => import('@/views/admin/Partners/show.vue')
  },
  {
    path: '/admin/certificates',
    name: 'admin.certificates',
    component: () => import('@/views/admin/Certificates/index.vue'),
    meta: { title: 'Issued Certificates' }
  },
  {
    path: '/admin/certificates/templates',
    name: 'admin.certificates.templates',
    component: () => import('@/views/admin/Certificates/Templates.vue'),
    meta: { title: 'Certificate Templates' }
  },
  {
    path: '/admin/certificates/templates/create',
    name: 'admin.certificates.templates.create',
    component: () => import('@/views/admin/Certificates/create.vue'),
    meta: { title: 'Create Certificate Template' }
  },
  {
    path: '/admin/certificates/templates/:id/edit',
    name: 'admin.certificates.templates.edit',
    component: () => import('@/views/admin/Certificates/edit.vue'),
    props: true,
    meta: { title: 'Edit Certificate Template' }
  },
  {
    path: '/admin/profile',
    name: 'admin.profile',
    component: () => import('@/views/ProfileView.vue'),
    meta: { title: 'Security & Identity' }
  },
  {
    path: '/admin/activity-logs',
    name: 'admin.logs',
    component: () => import('@/views/admin/ActivityLogs/index.vue'),
    meta: { title: 'System Activity Logs' }
  },
  {
    path: '/admin/proctoring',
    name: 'admin.proctoring',
    component: () => import('@/views/admin/Proctoring/index.vue'),
    meta: { title: 'Proctoring Management' }
  },
  {
    path: '/admin/proctoring/student/:studentId',
    name: 'admin.proctoring.student',
    component: () => import('@/views/admin/Proctoring/Student.vue'),
    meta: { title: 'Student Proctoring Profile' }
  },
  {
    path: '/admin/proctoring/:id',
    name: 'admin.proctoring.show',
    component: () => import('@/views/admin/Proctoring/Show.vue'),
    meta: { title: 'Session Details' }
  },
];

// Map Admin routes to Teacher routes
const teacherRoutes = adminRoutes.map(route => ({
  ...route,
  path: route.path.replace('/admin', '/teacher'),
  name: route.name ? (route.name === 'admin' ? 'teacher' : route.name.replace('admin.', 'teacher.')) : undefined
}));

const partnerRoutes = [
  {
    path: '/partner',
    name: 'partner',
    component: () => import('@/views/partner/Dashboard.vue'),
    meta: { title: 'Partner Dashboard' }
  },
  {
    path: '/partner/reports',
    name: 'partner.reports',
    component: () => import('@/views/partner/Reports/index.vue'),
    meta: { title: 'Student Reports' }
  },
  {
    path: '/partner/reports/:id/show',
    name: 'partner.reports.show',
    component: () => import('@/views/partner/Reports/show.vue'),
    meta: { title: 'Report Details' }
  },
  {
    path: '/partner/certificates',
    name: 'partner.certificates',
    component: () => import('@/views/partner/Certificates.vue'),
    meta: { title: 'Student Certificates' }
  }
];

const routes = [
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
    meta: { title: 'Student Dashboard' }
  },
  {
    path: '/exam/:id',
    name: 'exam',
    component: () => import('@/views/student/ExamView.vue')
  },
  {
    path: '/exam/setup/:examId/:skillId/:levelId?',
    name: 'exam.setup',
    component: () => import('@/views/student/ExamView.vue')
  },
  {
    path: '/exam/:id/result',
    name: 'result',
    component: () => import('@/views/student/ResultView.vue')
  },
  {
    path: '/students',
    component: () => import('@/views/student/Students.vue')
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
    meta: { title: 'Select Skill' }
  },
  {
    path: '/instructions/:examId/:skillId/:levelId?',
    name: 'exam.instructions',
    component: () => import('@/views/student/InstructionsView.vue'),
    meta: { title: 'Exam Instructions' }
  },
  ...adminRoutes,
  ...teacherRoutes,
  ...partnerRoutes
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to) => {
  const publicPages = ['/login', '/register'];
  const isPublicVerification = to.path.startsWith('/verify-certificate/');
  const authRequired = !publicPages.includes(to.path) && !isPublicVerification;
  const token = authStorage.getToken();
  const role = authStorage.getRole();

  if (authRequired && !token) {
    return '/login';
  }

  // Redirect authenticated users away from public pages
  if (to.path === '/login' && token) {
    if (role === 'teacher') return '/teacher';
    if (role === 'student') return '/skill-selection';
    if (role === 'partner') return '/partner';
    return '/admin';
  }

  // Administrative path protection
  if (to.path.startsWith('/admin')) {
    if (role !== 'admin' && role !== 'demo') {
      if (role === 'teacher') return '/teacher';
      if (role === 'partner') return '/partner';
      return '/dashboard';
    }
  }

  // Teacher path protection
  if (to.path.startsWith('/teacher')) {
    if (role !== 'teacher' && role !== 'admin' && role !== 'demo') {
      return '/dashboard';
    }
  }

  // Partner path protection
  if (to.path.startsWith('/partner')) {
    if (role !== 'partner' && role !== 'admin' && role !== 'demo') {
      return '/dashboard';
    }
  }

  // Block proctoring routes when feature is disabled
  if (!PROCTORING_ENABLED && (to.path.startsWith('/admin/proctoring') || to.path.startsWith('/teacher/proctoring'))) {
    return to.path.startsWith('/teacher') ? '/teacher' : '/admin';
  }

  // Student path protection (optional, but good for consistency)
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

export default router
