import { createRouter, createWebHistory } from 'vue-router'

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

import AdminPartners from '@/views/admin/Partners/index.vue'
import AdminPartnerCreate from '@/views/admin/Partners/create.vue'
import AdminPartnerEdit from '@/views/admin/Partners/edit.vue'
import AdminPartnerShow from '@/views/admin/Partners/show.vue'
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
    path: '/admin/skills/:id/levels',
    name: 'admin.levels',
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
    path: '/admin/Partners/:id/edit',
    name: 'admin.partners.edit',
    component: AdminPartnerEdit
  },
  {
    path: '/admin/Partners/:id/show',
    name: 'admin.partners.show',
    component: AdminPartnerShow
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router