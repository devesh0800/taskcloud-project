'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { DashboardSkeleton } from '@/components/dashboard/LoadingSkeleton';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/axios';
import {
  Users,
  BookOpen,
  FileText,
  Clock,
  CheckCircle2,
  Plus,
  ArrowRight,
  Inbox,
  AlertCircle,
  BarChart3,
  Search,
  ExternalLink,
  GraduationCap,
  Calendar,
} from 'lucide-react';

function TeacherDashboardContent() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [classesList, setClassesList] = useState<any[]>([]);
  const [assignmentsList, setAssignmentsList] = useState<any[]>([]);
  const [submissionsList, setSubmissionsList] = useState<any[]>([]);
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Load Dashboard Data
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const [dashRes, classesRes, assignRes, subRes] = await Promise.all([
          api.get('/teacher/dashboard'),
          api.get('/teacher/classes'),
          api.get('/teacher/assignments'),
          api.get('/teacher/submissions'),
        ]);

        if (dashRes.data.success) {
          setDashboardData(dashRes.data.data);
        }
        if (classesRes.data.success) {
          setClassesList(classesRes.data.data);
        }
        if (assignRes.data.success) {
          setAssignmentsList(assignRes.data.data);
        }
        if (subRes.data.success) {
          setSubmissionsList(subRes.data.data);
        }
      } catch (err: any) {
        console.error('Failed to load teacher dashboard:', err);
        setError(err.response?.data?.error?.message || 'Failed to connect to database server.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Lazy load analytics or students when tab switches
  useEffect(() => {
    if (activeTab === 'students' && studentsList.length === 0) {
      api.get('/teacher/students').then((res) => {
        if (res.data.success) setStudentsList(res.data.data);
      });
    } else if (activeTab === 'analytics' && !analyticsData) {
      api.get('/teacher/analytics').then((res) => {
        if (res.data.success) setAnalyticsData(res.data.data);
      });
    }
  }, [activeTab, studentsList.length, analyticsData]);

  const stats = dashboardData?.stats || {
    totalStudents: 0,
    totalClasses: 0,
    totalAssignments: 0,
    pendingSubmissions: 0,
    evaluatedSubmissions: 0,
  };

  return (
    <ProtectedRoute allowedRoles={['TEACHER', 'ADMIN']}>
      <DashboardLayout
        currentTab={activeTab}
        onSelectTab={setActiveTab}
        title={
          activeTab === 'overview'
            ? 'Teacher Overview'
            : activeTab === 'classes'
            ? 'My Classes'
            : activeTab === 'assignments'
            ? 'Assignments'
            : activeTab === 'submissions'
            ? 'Submissions & Evaluations'
            : activeTab === 'students'
            ? 'Enrolled Students'
            : 'Performance Analytics'
        }
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
      >
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {loading ? (
          <DashboardSkeleton />
        ) : (
          <>
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* 5 Statistics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <StatCard
                    title="Total Students"
                    value={stats.totalStudents}
                    subtitle="Enrolled in your classes"
                    icon={Users}
                    iconColor="text-blue-600"
                    iconBg="bg-blue-50"
                  />
                  <StatCard
                    title="Active Classes"
                    value={stats.totalClasses}
                    subtitle="Created courses"
                    icon={BookOpen}
                    iconColor="text-indigo-600"
                    iconBg="bg-indigo-50"
                  />
                  <StatCard
                    title="Assignments"
                    value={stats.totalAssignments}
                    subtitle="Created coursework"
                    icon={FileText}
                    iconColor="text-emerald-600"
                    iconBg="bg-emerald-50"
                  />
                  <StatCard
                    title="Pending Review"
                    value={stats.pendingSubmissions}
                    subtitle="Awaiting evaluation"
                    icon={Clock}
                    iconColor="text-amber-600"
                    iconBg="bg-amber-50"
                  />
                  <StatCard
                    title="Evaluated"
                    value={stats.evaluatedSubmissions}
                    subtitle="Graded submissions"
                    icon={CheckCircle2}
                    iconColor="text-purple-600"
                    iconBg="bg-purple-50"
                  />
                </div>

                {/* Quick Action Strip */}
                <div className="p-5 rounded-2xl bg-gradient-to-r from-[#172554] to-[#1E3A8A] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold">Manage Your Academic Courses</h3>
                    <p className="text-xs text-blue-200">
                      Create new classes, publish assignments, and grade student submissions in real time.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={() => setActiveTab('classes')}
                      variant="outline"
                      className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-semibold rounded-xl"
                    >
                      View All Classes
                    </Button>
                    <Button
                      onClick={() => setActiveTab('assignments')}
                      className="bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-semibold rounded-xl gap-1.5"
                    >
                      <Plus className="w-4 h-4" /> New Assignment
                    </Button>
                  </div>
                </div>

                {/* Main 2-Column Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column (2 Cols): Recent Assignments */}
                  <div className="lg:col-span-2 space-y-6">
                    <Card className="rounded-2xl border-slate-100 shadow-sm overflow-hidden">
                      <CardHeader className="p-5 border-b border-slate-100 flex flex-row items-center justify-between bg-white">
                        <div>
                          <CardTitle className="text-base font-bold text-[#0F172A]">
                            Recent Assignments
                          </CardTitle>
                          <p className="text-xs text-slate-400">Latest active assignments and submission stats</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveTab('assignments')}
                          className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-semibold gap-1"
                        >
                          View All <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </CardHeader>
                      <CardContent className="p-0">
                        {assignmentsList.length === 0 ? (
                          <div className="p-6">
                            <EmptyState
                              icon={FileText}
                              title="No Assignments Created Yet"
                              description="Create your first assignment to share tasks and collect student submissions."
                              actionLabel="Create Assignment"
                              onAction={() => setActiveTab('assignments')}
                            />
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-100">
                            {assignmentsList.slice(0, 5).map((assignment) => (
                              <div
                                key={assignment.id}
                                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-bold text-slate-800">{assignment.title}</h4>
                                    <StatusBadge status={assignment.status} />
                                  </div>
                                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                                    <span>Class: <strong className="text-slate-700">{assignment.className}</strong></span>
                                    <span>Max Marks: <strong className="text-slate-700">{assignment.totalMarks}</strong></span>
                                    <span>Due: <strong className="text-slate-700">{new Date(assignment.deadline).toLocaleDateString()}</strong></span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                  <div className="text-right sm:block">
                                    <p className="text-xs font-bold text-slate-800">
                                      {assignment.submissionCount} Submissions
                                    </p>
                                    <p className="text-[10px] text-slate-400">
                                      {assignment.evaluatedCount} Evaluated
                                    </p>
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setActiveTab('submissions')}
                                    className="text-xs rounded-xl"
                                  >
                                    Review
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Classes Grid Overview */}
                    <Card className="rounded-2xl border-slate-100 shadow-sm overflow-hidden">
                      <CardHeader className="p-5 border-b border-slate-100 flex flex-row items-center justify-between bg-white">
                        <div>
                          <CardTitle className="text-base font-bold text-[#0F172A]">
                            My Classes
                          </CardTitle>
                          <p className="text-xs text-slate-400">Active class groups and student enrollment</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveTab('classes')}
                          className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-semibold gap-1"
                        >
                          Manage Classes <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </CardHeader>
                      <CardContent className="p-5">
                        {classesList.length === 0 ? (
                          <EmptyState
                            icon={BookOpen}
                            title="No Classes Found"
                            description="Create a classroom to generate a unique code and enroll students."
                            actionLabel="Create Class"
                            onAction={() => setActiveTab('classes')}
                          />
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {classesList.slice(0, 4).map((c) => (
                              <div
                                key={c.id}
                                className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-400 hover:shadow-sm transition-all"
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <h4 className="text-sm font-bold text-slate-900">{c.name}</h4>
                                    <p className="text-xs text-slate-500 line-clamp-1">{c.description || 'No description'}</p>
                                  </div>
                                  <Badge className="bg-blue-50 text-blue-700 border-blue-200 font-mono text-[11px]">
                                    {c.classCode}
                                  </Badge>
                                </div>
                                <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 mt-2">
                                  <span>{c.studentCount} Students</span>
                                  <span>{c.assignmentCount} Assignments</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Right Column (1 Col): Pending Evaluations & Quick Tips */}
                  <div className="space-y-6">
                    {/* Pending Evaluations List */}
                    <Card className="rounded-2xl border-slate-100 shadow-sm overflow-hidden">
                      <CardHeader className="p-5 border-b border-slate-100 bg-white">
                        <CardTitle className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                          <Clock className="w-4 h-4 text-amber-500" /> Pending Evaluations
                        </CardTitle>
                        <p className="text-xs text-slate-400">Submissions awaiting your review</p>
                      </CardHeader>
                      <CardContent className="p-0">
                        {dashboardData?.pendingEvaluations?.length === 0 ? (
                          <div className="p-6 text-center text-slate-400">
                            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                            <p className="text-xs font-semibold text-slate-700">All Caught Up!</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">No pending submissions to evaluate right now.</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-100">
                            {dashboardData?.pendingEvaluations?.slice(0, 5).map((sub: any) => (
                              <div key={sub.id} className="p-4 hover:bg-slate-50 transition-colors">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <p className="text-xs font-bold text-slate-800">{sub.studentName}</p>
                                  <span className="text-[10px] text-slate-400">{sub.timeAgo}</span>
                                </div>
                                <p className="text-xs text-slate-600 truncate mb-2">{sub.assignmentTitle}</p>
                                <div className="flex items-center justify-between">
                                  <StatusBadge status={sub.status} />
                                  <Button
                                    size="sm"
                                    onClick={() => setActiveTab('submissions')}
                                    className="h-7 text-xs bg-[#2563EB] hover:bg-blue-700 text-white rounded-lg px-2.5"
                                  >
                                    Grade
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Class Performance Summary */}
                    <Card className="rounded-2xl border-slate-100 shadow-sm p-5 bg-white">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                        Academic Insights
                      </h4>
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-600 font-medium">Evaluation Completion</span>
                            <span className="font-bold text-slate-900">
                              {stats.totalAssignments > 0
                                ? Math.round(
                                    (stats.evaluatedSubmissions /
                                      Math.max(1, stats.pendingSubmissions + stats.evaluatedSubmissions)) *
                                      100
                                  )
                                : 0}
                              %
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
                              style={{
                                width: `${
                                  stats.totalAssignments > 0
                                    ? Math.round(
                                        (stats.evaluatedSubmissions /
                                          Math.max(1, stats.pendingSubmissions + stats.evaluatedSubmissions)) *
                                          100
                                      )
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                        </div>

                        <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100">
                          <p className="text-xs text-blue-900 font-medium">
                            💡 <strong>Tip:</strong> Share the unique <strong>Class Code</strong> with your students so they can enroll instantly.
                          </p>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              </div>
            )}

            {/* MY CLASSES TAB */}
            {activeTab === 'classes' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Your Classes</h3>
                    <p className="text-xs text-slate-500">View and manage all classrooms you teach</p>
                  </div>
                  <Button className="bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl text-xs font-semibold gap-1.5">
                    <Plus className="w-4 h-4" /> Create New Class
                  </Button>
                </div>

                {classesList.length === 0 ? (
                  <EmptyState
                    icon={BookOpen}
                    title="No Classes Yet"
                    description="Create your first class to get started."
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {classesList.map((c) => (
                      <Card key={c.id} className="rounded-2xl border-slate-100 shadow-sm hover:shadow-md transition-all">
                        <CardHeader className="p-5 border-b border-slate-100">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <CardTitle className="text-base font-bold text-slate-900">{c.name}</CardTitle>
                              <p className="text-xs text-slate-400 mt-0.5">Code: <strong className="text-blue-600 font-mono">{c.classCode}</strong></p>
                            </div>
                            <Badge className="bg-slate-100 text-slate-700 text-xs font-mono">
                              {c.studentCount} Students
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="p-5 space-y-4">
                          <p className="text-xs text-slate-600 min-h-[36px]">
                            {c.description || 'No class description provided.'}
                          </p>
                          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                            <span>{c.assignmentCount} Assignments</span>
                            <span className="text-amber-600 font-semibold">{c.pendingSubmissions} Pending Reviews</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ASSIGNMENTS TAB */}
            {activeTab === 'assignments' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">All Assignments</h3>
                    <p className="text-xs text-slate-500">Manage, edit, and publish coursework</p>
                  </div>
                  <Button className="bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl text-xs font-semibold gap-1.5">
                    <Plus className="w-4 h-4" /> Create Assignment
                  </Button>
                </div>

                <Card className="rounded-2xl border-slate-100 shadow-sm overflow-hidden bg-white">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          <th className="p-4">Title</th>
                          <th className="p-4">Class</th>
                          <th className="p-4">Max Marks</th>
                          <th className="p-4">Deadline</th>
                          <th className="p-4">Submissions</th>
                          <th className="p-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {assignmentsList.map((a) => (
                          <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-4 font-bold text-slate-800">{a.title}</td>
                            <td className="p-4 text-slate-600">{a.className}</td>
                            <td className="p-4 text-slate-600">{a.totalMarks}</td>
                            <td className="p-4 text-slate-600">{new Date(a.deadline).toLocaleDateString()}</td>
                            <td className="p-4 font-semibold text-slate-800">
                              {a.submissionCount} / {a.evaluatedCount} Graded
                            </td>
                            <td className="p-4">
                              <StatusBadge status={a.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}

            {/* SUBMISSIONS TAB */}
            {activeTab === 'submissions' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Student Submissions</h3>
                  <p className="text-xs text-slate-500">Evaluate answers, enter grades, and provide feedback</p>
                </div>

                <Card className="rounded-2xl border-slate-100 shadow-sm overflow-hidden bg-white">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          <th className="p-4">Student</th>
                          <th className="p-4">Assignment</th>
                          <th className="p-4">Submitted At</th>
                          <th className="p-4">Files</th>
                          <th className="p-4">Status</th>
                          <th className="p-4">Grade</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {submissionsList.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-400">
                              No submissions found yet.
                            </td>
                          </tr>
                        ) : (
                          submissionsList.map((s) => (
                            <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-4">
                                <p className="font-bold text-slate-800">{s.studentName}</p>
                                <p className="text-[10px] text-slate-400">{s.studentEmail}</p>
                              </td>
                              <td className="p-4 text-slate-700">{s.assignmentTitle}</td>
                              <td className="p-4 text-slate-500">{new Date(s.submittedAt).toLocaleString()}</td>
                              <td className="p-4 text-slate-600">{s.filesCount} file(s)</td>
                              <td className="p-4">
                                <StatusBadge status={s.status} />
                              </td>
                              <td className="p-4 font-bold text-slate-800">
                                {s.grade !== null ? `${s.grade} marks` : <span className="text-amber-600">Pending</span>}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}

            {/* STUDENTS TAB */}
            {activeTab === 'students' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Enrolled Students</h3>
                  <p className="text-xs text-slate-500">All students registered across your active classes</p>
                </div>

                <Card className="rounded-2xl border-slate-100 shadow-sm overflow-hidden bg-white">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          <th className="p-4">Name</th>
                          <th className="p-4">Email</th>
                          <th className="p-4">Student ID</th>
                          <th className="p-4">Enrolled Classes</th>
                          <th className="p-4">Submissions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {studentsList.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-slate-400">
                              No students enrolled in your classes yet. Share class codes with your students!
                            </td>
                          </tr>
                        ) : (
                          studentsList.map((st) => (
                            <tr key={st.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-4 font-bold text-slate-800">{st.fullName}</td>
                              <td className="p-4 text-slate-600">{st.email}</td>
                              <td className="p-4 font-mono text-slate-600">{st.studentId || 'N/A'}</td>
                              <td className="p-4 text-slate-600">{st.enrolledClassesCount} class(es)</td>
                              <td className="p-4 text-slate-600">{st.submissionsCount} submitted</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}

            {/* ANALYTICS TAB */}
            {activeTab === 'analytics' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Performance Analytics</h3>
                  <p className="text-xs text-slate-500">Class engagement and submission completion rates</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="p-6 rounded-2xl border-slate-100 shadow-sm bg-white space-y-4">
                    <h4 className="text-sm font-bold text-slate-900">Class Enrollment Breakdown</h4>
                    <div className="space-y-3">
                      {classesList.map((c) => (
                        <div key={c.id} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-semibold text-slate-700">{c.name}</span>
                            <span className="text-slate-500">{c.studentCount} students</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-600 rounded-full"
                              style={{
                                width: `${Math.min(100, (c.studentCount / Math.max(1, stats.totalStudents)) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card className="p-6 rounded-2xl border-slate-100 shadow-sm bg-white space-y-4">
                    <h4 className="text-sm font-bold text-slate-900">Submission Evaluation Progress</h4>
                    <div className="p-4 bg-slate-50 rounded-xl space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-600">Total Submissions Received</span>
                        <span className="font-bold text-slate-800">
                          {stats.pendingSubmissions + stats.evaluatedSubmissions}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-600">Evaluated & Graded</span>
                        <span className="font-bold text-emerald-600">{stats.evaluatedSubmissions}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-600">Pending Evaluation</span>
                        <span className="font-bold text-amber-600">{stats.pendingSubmissions}</span>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            )}
          </>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}

export default function TeacherDashboard() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <TeacherDashboardContent />
    </Suspense>
  );
}
