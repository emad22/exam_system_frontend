import { createRouter, createWebHistory } from 'vue-router'

import DashboardView from '@/views/student/DashboardView.vue'
import LoginView from '@/views/LoginView.vue'
import AdminDashboard from '@/views/admin/AdminDashboard.vue'
import Students from '@/views/student/Students.vue'

import ExamView from '@/views/student/ExamView.vue'
import ResultView from '@/views/student/ResultView.vue'
import ParentPortal from '@/views/student/ParentPortal.vue'
import AdminStudents from '@/views/admin/AdminStudents.vue'
import AdminStudentCreate from '@/views/admin/AdminStudentCreate.vue'
import AdminStudentsBatch from '@/views/admin/AdminStudentsBatch.vue'
import AdminExams from '@/views/admin/AdminExams.vue'
import AdminExamCreate from '@/views/admin/AdminExamCreate.vue'
import AdminExamImport from '@/views/admin/AdminExamImport.vue'
import AdminQuestions from '@/views/admin/AdminQuestions.vue'
import AdminQuestionCreate from '@/views/admin/AdminQuestionCreate.vue'
import AdminQuestionEdit from '@/views/admin/AdminQuestionEdit.vue'
import AdminSkills from '@/views/admin/AdminSkills.vue'
import AdminSkillCreate from '@/views/admin/AdminSkillCreate.vue'
import AdminReports from '@/views/admin/AdminReports.vue'
import AdminPayments from '@/views/admin/AdminPayments.vue'
import AdminStaff from '@/views/admin/AdminStaff.vue'
import AdminLevels from '@/views/admin/AdminLevels.vue'
import AdminPartners from '@/views/admin/AdminPartners.vue'
import AdminPartnerCreate from '@/views/admin/AdminPartnerCreate.vue'
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
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router