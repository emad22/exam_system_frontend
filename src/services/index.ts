// Auth
export { authService } from './auth'
export { certificatesService } from './certificates'

// Admin
export { studentsService } from './admin/students'
export { questionsService } from './admin/questions'
export { examsService } from './admin/exams'
export { skillsService, levelsService } from './admin/skills'
export { reportsService } from './admin/reports'
export { gradingService } from './admin/grading'
export { partnersService } from './admin/partners'
export { staffService } from './admin/staff'
export { certificatesService as adminCertificatesService } from './admin/certificates'
export { adminProctoringService } from './admin/proctoring'
export {
  dashboardService,
  notificationsService,
  activityLogsService,
  packagesService,
  examCategoriesService,
  systemRequirementsService,
  rubricsService,
  cefrActflService,
  languagesService,
  passagesService,
} from './admin/misc'

// Exam
export { attemptsService } from './exam/attempts'

// Partner
export { partnerService } from './partner/reports'
