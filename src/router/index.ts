import { createRouter, createWebHistory } from 'vue-router';
import api from '@/services/api';

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


const routes = [
  {
    path: '/',
    redirect: '/login' // 👈 ده اللي هيوديه على login
  },
  {
    path: '/login',
    name: 'login',
    component: LoginView
  },
  {
    path: '/register',
    name: 'register',
    component: PublicRegisterWizard
  },
  {
    path: '/parent',
    name: 'parent',
    component: ParentPortal
  },

  {
    path: '/dashboard',
    name: 'dashboard',
    component: DashboardView
  },
  {
    path: '/admin',
    name: 'admin',
    component: AdminDashboard
  },
  {
    path: '/admin/packages',
    name: 'admin.packages.index',
    component: AdminPackagesIndex
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
    component: AdminStudents
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
    component: AdminExams
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
    component: AdminExamCreate
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
    component: AdminQuestions
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
    path: '/exam/:id',
    name: 'exam',
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
    path: '/admin/partners/:id/edit',
    name: 'admin.partners.edit',
    component: AdminPartnerEdit
  },
  {
    path: '/admin/partners/:id/show',
    name: 'admin.partners.show',
    component: AdminPartnerShow
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Global Navigation Guard
// router.beforeEach(async (to) => {
//   const publicPages = ['/login', '/register'];

//   try {
//     await api.get('/api/user');

//     if (publicPages.includes(to.path)) {
//       return '/admin';
//     }

//   } catch {
//     if (!publicPages.includes(to.path)) {
//       return '/login';
//     }
//   }
// });

export default router
