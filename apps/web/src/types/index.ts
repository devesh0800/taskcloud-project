export type Role = 'STUDENT' | 'TEACHER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  avatarUrl?: string | null;
  teacherId?: string | null;
  department?: string | null;
  studentId?: string | null;
  course?: string | null;
  semester?: string | null;
  section?: string | null;
  isActive?: boolean;
  emailVerified?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface ApiHealthResponse {
  success: boolean;
  service: string;
  status: string;
  timestamp: string;
  version: string;
  environment: string;
  system: {
    uptimeSeconds: number;
    memoryMB: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
    };
  };
  storage: {
    driver: string;
    uploadDir: string;
    maxFileSizeMB: string;
  };
  database: {
    provider: string;
    status: string;
  };
}

export interface TeacherDashboardStats {
  totalStudents: number;
  totalClasses: number;
  totalAssignments: number;
  pendingSubmissions: number;
  evaluatedSubmissions: number;
}

export interface StudentDashboardStats {
  totalAssignments: number;
  pendingAssignments: number;
  submittedAssignments: number;
  evaluatedAssignments: number;
  averageMarks: number;
}

export interface AdminDashboardStats {
  totalUsers: number;
  totalTeachers: number;
  totalStudents: number;
  totalClasses: number;
  totalAssignments: number;
  totalSubmissions: number;
  evaluatedSubmissions: number;
  submissionRate: number;
}
