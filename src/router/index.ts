import { createRouter, createWebHistory } from 'vue-router';
import { authStorage } from '@/services/authStorage';


import DashboardView from '@/views/student/DashboardView.vue'
import LoginView from '@/views/LoginView.vue'
import AdminDashboard from '@/views/admin/AdminDashboard.vue'
import Students from '@/views/student/Students.vue'

import ExamView from '@/views/student/ExamView.vue'
import ResultView from '@/views/student/ResultView.vue'
import ParentPortal from '@/views/student/ParentPortal.vue'

import AdminStudents from '@/views/admin/Students/index.vue'
import AdminStudentCreate from '@/views/admin/Students/create.vue'
import AdminStudentsBatch from '@/views/admin/Students/batch.vue'
import AdminStudentEdit from '@/views/admin/Students/edit.vue'
import AdminStudentShow from '@/views/admin/Students/show.vue'

import AdminExams from '@/views/admin/Exams/index.vue'
import AdminExamCreate from '@/views/admin/Exams/create.vue'
import AdminExamImport from '@/views/admin/Exams/import.vue'
import AdminExamCategoriesIndex from '@/views/admin/ExamCategories/index.vue'
import AdminExamCategoriesCreate from '@/views/admin/ExamCategories/create.vue'
import AdminExamCategoriesEdit from '@/views/admin/ExamCategories/edit.vue'

import AdminQuestions from '@/views/admin/Questions/index.vue'
import AdminQuestionCreate from '@/views/admin/Questions/create.vue'
import AdminQuestionEdit from '@/views/admin/Questions/edit.vue'

import AdminSkills from '@/views/admin/Skills/index.vue'
import AdminSkillCreate from '@/views/admin/Skills/create.vue'

import AdminReports from '@/views/admin/AdminReports.vue'
import AdminReportShow from '@/views/admin/AdminReportShow.vue'

import AdminPayments from '@/views/admin/AdminPayments.vue'


import AdminStaff from '@/views/admin/Staff/index.vue'
import AdminStaffCreate from '@/views/admin/Staff/create.vue'


import AdminLevels from '@/views/admin/Levels/index.vue'
import AdminLevelCreate from '@/views/admin/Levels/create.vue'
import AdminLevelEdit from '@/views/admin/Levels/edit.vue'

import AdminPartners from '@/views/admin/Partners/index.vue'
import AdminPartnerCreate from '@/views/admin/Partners/create.vue'
import AdminPartnerEdit from '@/views/admin/Partners/edit.vue'
import AdminPartnerShow from '@/views/admin/Partners/show.vue'
import AdminPackagesIndex from '@/views/admin/Packages/index.vue'
import AdminPackagesCreate from '@/views/admin/Packages/create.vue'
import AdminPackagesEdit from '@/views/admin/Packages/edit.vue'
import AdminSystemRequirements from '@/views/admin/SystemRequirements/index.vue'
import AdminSystemRequirementsCreate from '@/views/admin/SystemRequirements/create.vue'
import AdminSystemRequirementsEdit from '@/views/admin/SystemRequirements/edit.vue'
import PublicRegisterWizard from '@/views/student/PublicRegisterWizard.vue'
import ProfileView from '@/views/ProfileView.vue'
import AdminActivityLogs from '@/views/admin/ActivityLogs/index.vue'

import PartnerDashboard from '@/views/partner/Dashboard.vue'
import PartnerReports from '@/views/partner/Reports/index.vue'
import PartnerReportShow from '@/views/partner/Reports/show.vue'

const adminRoutes = [
  {
    path: '/admin',
    name: 'admin',
    component: AdminDashboard,
    meta: { title: 'Admin Command Center' }
  },
  {
    path: '/admin/packages',
    name: 'admin.packages.index',
    component: AdminPackagesIndex,
    meta: { title: 'Package Management' }
  },
  {
    path: '/admin/packages/create',
    name: 'admin.packages.create',
    component: AdminPackagesCreate
  },
  {
    path: '/admin/packages/:id/edit',
    name: 'admin.packages.edit',
    component: AdminPackagesEdit
  },
  {
    path: '/admin/students',
    name: 'admin.students',
    component: AdminStudents,
    meta: { title: 'Student Registry' }
  },
  {
    path: '/admin/students/create',
    name: 'admin.students.create',
    component: AdminStudentCreate
  },
  {
    path: '/admin/students/batch',
    name: 'admin.students.batch',
    component: AdminStudentsBatch
  },
  {
    path: '/admin/students/:id/edit',
    name: 'admin.students.edit',
    component: AdminStudentEdit
  },
  {
    path: '/admin/students/:id/show',
    name: 'admin.students.show',
    component: AdminStudentShow
  },
  {
    path: '/admin/exams',
    name: 'admin.exams',
    component: AdminExams,
    meta: { title: 'Assessment Templates' }
  },
  {
    path: '/admin/partners',
    name: 'admin.partners',
    component: AdminPartners
  },
  {
    path: '/admin/partners/create',
    name: 'admin.partners.create',
    component: AdminPartnerCreate
  },
  {
    path: '/admin/exams/import',
    name: 'admin.exams.import',
    component: AdminExamImport
  },
  {
    path: '/admin/exams/create',
    name: 'admin.exams.create',
    component: AdminExamCreate,
    meta: { title: 'Initialize Assessment' }
  },
  {
    path: '/admin/exams/:id/edit',
    name: 'admin.exams.edit',
    component: AdminExamCreate,
    props: true
  },
  {
    path: '/admin/exam-categories',
    name: 'admin.exams.categories',
    component: AdminExamCategoriesIndex
  },
  {
    path: '/admin/exam-categories/create',
    name: 'admin.exams.categories.create',
    component: AdminExamCategoriesCreate
  },
  {
    path: '/admin/exam-categories/:id/edit',
    name: 'admin.exams.categories.edit',
    component: AdminExamCategoriesEdit
  },
  {
    path: '/admin/questions',
    name: 'admin.questions',
    component: AdminQuestions,
    meta: { title: 'Central Bank Query' }
  },
  {
    path: '/admin/questions/create',
    name: 'admin.questions.create',
    component: AdminQuestionCreate
  },
  {
    path: '/admin/questions/:id/edit',
    name: 'admin.questions.edit',
    component: AdminQuestionEdit,
    props: true
  },
  {
    path: '/admin/skills',
    name: 'admin.skills',
    component: AdminSkills
  },
  {
    path: '/admin/skills/create',
    name: 'admin.skills.create',
    component: AdminSkillCreate
  },
  {
    path: '/admin/levels',
    name: 'admin.levels',
    component: AdminLevels
  },
  {
    path: '/admin/levels/create',
    name: 'admin.levels.create',
    component: AdminLevelCreate
  },
  {
    path: '/admin/levels/:id/edit',
    name: 'admin.levels.edit',
    component: AdminLevelEdit
  },
  {
    path: '/admin/skills/:id/levels',
    name: 'admin.skills.levels',
    component: AdminLevels
  },
  {
    path: '/admin/reports',
    name: 'admin.reports',
    component: AdminReports
  },
  {
    path: '/admin/reports/:id/show',
    name: 'admin.reports.show',
    component: AdminReportShow
  },
  {
    path: '/admin/grading',
    name: 'admin.grading',
    component: () => import('@/views/admin/Grading/index.vue'),
    meta: { title: 'Manual Grading' }
  },
  {
    path: '/admin/grading/:id',
    name: 'admin.grading.show',
    component: () => import('@/views/admin/Grading/Show.vue'),
    meta: { title: 'Correction Desk' }
  },
  {
    path: '/admin/payments',
    name: 'admin.payments',
    component: AdminPayments
  },
  {
    path: '/admin/system-requirements',
    name: 'admin.system-requirements',
    component: AdminSystemRequirements
  },
  {
    path: '/admin/system-requirements/create',
    name: 'admin.system-requirements.create',
    component: AdminSystemRequirementsCreate
  },
  {
    path: '/admin/system-requirements/:id/edit',
    name: 'admin.system-requirements.edit',
    component: AdminSystemRequirementsEdit
  },
  {
    path: '/admin/staff',
    name: 'admin.staff',
    component: AdminStaff
  },
  {
    path: '/admin/staff/create',
    name: 'admin.staff.create',
    component: AdminStaffCreate
  },
  {
    path: '/admin/staff/:id/edit',
    name: 'admin.staff.edit',
    component: AdminStaffCreate,
    props: true
  },
  {
    path: '/admin/partners/:id/edit',
    name: 'admin.partners.edit',
    component: AdminPartnerEdit
  },
  {
    path: '/admin/partners/:id/show',
    name: 'admin.partners.show',
    component: AdminPartnerShow
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
    path: '/admin/profile',
    name: 'admin.profile',
    component: ProfileView,
    meta: { title: 'Security & Identity' }
  },
  {
    path: '/admin/activity-logs',
    name: 'admin.logs',
    component: AdminActivityLogs,
    meta: { title: 'System Activity Logs' }
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
    component: PartnerDashboard,
    meta: { title: 'Partner Dashboard' }
  },
  {
    path: '/partner/reports',
    name: 'partner.reports',
    component: PartnerReports,
    meta: { title: 'Student Reports' }
  },
  {
    path: '/partner/reports/:id/show',
    name: 'partner.reports.show',
    component: PartnerReportShow,
    meta: { title: 'Report Details' }
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
    component: LoginView,
    meta: { title: 'Login ALPT' }
  },
  {
    path: '/register',
    name: 'register',
    component: PublicRegisterWizard,
    meta: { title: 'Student Registration' }
  },
  {
    path: '/parent',
    name: 'parent',
    component: ParentPortal
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
    component: DashboardView,
    meta: { title: 'Student Dashboard' }
  },
  {
    path: '/exam/:id',
    name: 'exam',
    component: ExamView
  },
  {
    path: '/exam/setup/:examId/:skillId/:levelId?',
    name: 'exam.setup',
    component: ExamView
  },
  {
    path: '/exam/:id/result',
    name: 'result',
    component: ResultView
  },
  {
    path: '/students',
    component: Students
  },
  {
    path: '/profile',
    name: 'profile',
    component: ProfileView,
    meta: { title: 'My Profile' }
  },
  {
    path: '/requirements',
    name: 'requirements',
    component: () => import('@/views/student/RequirementsView.vue'),
    meta: { title: 'System Requirements' }
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
    if (role === 'student') return '/dashboard';
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

  // Student path protection (optional, but good for consistency)
  if (to.path === '/dashboard' && (role === 'admin' || role === 'teacher' || role === 'partner')) {
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
