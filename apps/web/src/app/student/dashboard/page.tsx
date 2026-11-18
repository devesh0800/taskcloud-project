'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  FileText,
  Clock,
  CheckCircle2,
  Award,
  BookOpen,
  ArrowRight,
  Inbox,
  AlertCircle,
  GraduationCap,
  Calendar,
  Percent,
  CheckCircle,
} from 'lucide-react';

function StudentDashboardContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [classesList, setClassesList] = useState<any[]>([]);
  const [assignmentsList, setAssignmentsList] = useState<any[]>([]);
  const [submissionsList, setSubmissionsList] = useState<any[]>([]);
  const [gradesList, setGradesList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Load student dashboard data
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const [dashRes, classesRes, assignRes, subRes] = await Promise.all([
          api.get('/student/dashboard'),
          api.get('/student/classes'),
          api.get('/student/assignments'),
          api.get('/student/submissions'),
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
        console.error('Failed to load student dashboard:', err);
        setError(err.response?.data?.error?.message || 'Failed to connect to database server.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Lazy load grades when tab changes
  useEffect(() => {
    if (activeTab === 'grades' && gradesList.length === 0) {
      api.get('/student/grades').then((res) => {
        if (res.data.success) setGradesList(res.data.data);
      });
    }
  }, [activeTab, gradesList.length]);

  const stats = dashboardData?.stats || {
    totalAssignments: 0,
    pendingAssignments: 0,
    submittedAssignments: 0,
    evaluatedAssignments: 0,
    averageMarks: 0,
  };

  return (
    <ProtectedRoute allowedRoles={['STUDENT', 'ADMIN']}>
      <DashboardLayout
        currentTab={activeTab}
        onSelectTab={setActiveTab}
        title={
          activeTab === 'overview'
            ? 'Student Overview'
            : activeTab === 'classes'
            ? 'Enrolled Classes'
            : activeTab === 'assignments'
            ? 'My Assignments'
            : activeTab === 'submissions'
            ? 'Submission History'
            : 'My Grades & Feedback'
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
                    title="Total Tasks"
                    value={stats.totalAssignments}
                    subtitle="Coursework assigned"
                    icon={FileText}
                    iconColor="text-blue-600"
                    iconBg="bg-blue-50"
                  />
                  <StatCard
                    title="Pending"
                    value={stats.pendingAssignments}
                    subtitle="To be submitted"
                    icon={Clock}
                    iconColor="text-amber-600"
                    iconBg="bg-amber-50"
                  />
                  <StatCard
                    title="Submitted"
                    value={stats.submittedAssignments}
                    subtitle="Uploaded answers"
                    icon={CheckCircle}
                    iconColor="text-indigo-600"
                    iconBg="bg-indigo-50"
                  />
                  <StatCard
                    title="Evaluated"
                    value={stats.evaluatedAssignments}
                    subtitle="Graded by teachers"
                    icon={CheckCircle2}
                    iconColor="text-emerald-600"
                    iconBg="bg-emerald-50"
                  />
                  <StatCard
                    title="Average Score"
                    value={`${stats.averageMarks}%`}
                    subtitle="Across evaluated tasks"
                    icon={Award}
                    iconColor="text-purple-600"
                    iconBg="bg-purple-50"
                  />
                </div>

                {/* Banner Strip */}
                <div className="p-5 rounded-2xl bg-gradient-to-r from-[#172554] to-[#2563EB] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-blue-200" /> Academic Dashboard
                    </h3>
                    <p className="text-xs text-blue-100">
                      Enrolled in <strong>{classesList.length} classes</strong>. Track deadlines, upload work, and view teacher feedback.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={() => setActiveTab('assignments')}
                      className="bg-white text-blue-900 hover:bg-blue-50 text-xs font-bold rounded-xl"
                    >
                      View Assignments ({stats.pendingAssignments} Pending)
                    </Button>
                  </div>
                </div>

                {/* Main 2-Column Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column (2 Cols): Upcoming Assignments & Submissions */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Upcoming Assignments */}
                    <Card className="rounded-2xl border-slate-100 shadow-sm overflow-hidden bg-white">
                      <CardHeader className="p-5 border-b border-slate-100 flex flex-row items-center justify-between">
                        <div>
                          <CardTitle className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                            <Clock className="w-4 h-4 text-amber-500" /> Upcoming Assignments
                          </CardTitle>
                          <p className="text-xs text-slate-400">Assignments due soon sorted by deadline</p>
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
                        {dashboardData?.upcomingAssignments?.length === 0 ? (
                          <div className="p-6">
                            <EmptyState
                              icon={CheckCircle2}
                              title="No Pending Assignments"
                              description="You're all caught up with your submissions!"
                            />
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-100">
                            {dashboardData?.upcomingAssignments?.map((a: any) => (
                              <div
                                key={a.id}
                                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-bold text-slate-800">{a.title}</h4>
                                    {a.isOverdue ? (
                                      <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px]">
                                        Overdue
                                      </Badge>
                                    ) : (
                                      <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">
                                        {a.timeRemaining}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                                    <span>Class: <strong className="text-slate-700">{a.className}</strong></span>
                                    <span>Teacher: <strong className="text-slate-700">{a.teacherName}</strong></span>
                                    <span>Max Marks: <strong className="text-slate-700">{a.totalMarks}</strong></span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => router.push(`/student/assignments/${a.id}`)}
                                    className="border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold cursor-pointer"
                                  >
                                    Details
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => router.push(`/student/assignments/${a.id}/submit`)}
                                    className="bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm cursor-pointer"
                                  >
                                    Submit Work
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Recent Activity / Submissions */}
                    <Card className="rounded-2xl border-slate-100 shadow-sm overflow-hidden bg-white">
                      <CardHeader className="p-5 border-b border-slate-100 flex flex-row items-center justify-between">
                        <div>
                          <CardTitle className="text-base font-bold text-[#0F172A]">
                            Recent Submission Activity
                          </CardTitle>
                          <p className="text-xs text-slate-400">History of your latest turned-in tasks</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveTab('submissions')}
                          className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-semibold gap-1"
                        >
                          View History <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </CardHeader>
                      <CardContent className="p-0">
                        {dashboardData?.recentActivity?.length === 0 ? (
                          <div className="p-6">
                            <EmptyState
                              icon={Inbox}
                              title="No Activity Yet"
                              description="You haven't submitted any assignments yet."
                            />
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-100">
                            {dashboardData?.recentActivity?.map((act: any) => (
                              <div
                                key={act.id}
                                className="p-4 sm:p-5 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                              >
                                <div className="space-y-0.5">
                                  <h4 className="text-xs font-bold text-slate-800">{act.assignmentTitle}</h4>
                                  <p className="text-[11px] text-slate-400">
                                    Submitted {new Date(act.submittedAt).toLocaleDateString()}
                                  </p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <StatusBadge status={act.status} />
                                  {act.gradeAwarded !== null && (
                                    <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-xs font-bold">
                                      {act.gradeAwarded} pts
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Right Column (1 Col): Academic Progress per Class */}
                  <div className="space-y-6">
                    <Card className="p-5 rounded-2xl border-slate-100 shadow-sm bg-white space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-900">Academic Performance</h4>
                        <Award className="w-4 h-4 text-purple-600" />
                      </div>
                      <p className="text-xs text-slate-400">Subject-wise coursework completion and scores</p>

                      <div className="space-y-4 pt-1">
                        {dashboardData?.performance?.performanceByClass?.length === 0 ? (
                          <p className="text-xs text-slate-400 text-center py-4">No enrolled courses.</p>
                        ) : (
                          dashboardData?.performance?.performanceByClass?.map((perf: any, idx: number) => (
                            <div key={idx} className="space-y-1.5">
                              <div className="flex justify-between text-xs">
                                <span className="font-semibold text-slate-800">{perf.className}</span>
                                <span className="font-bold text-blue-600">{perf.scorePercentage}%</span>
                              </div>
                              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
                                  style={{ width: `${perf.scorePercentage}%` }}
                                />
                              </div>
                              <div className="flex justify-between text-[10px] text-slate-400">
                                <span>Code: {perf.classCode}</span>
                                <span>{perf.completedCount} of {perf.assignedCount} done</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </Card>

                    {/* Enrolled Classes Quick View */}
                    <Card className="p-5 rounded-2xl border-slate-100 shadow-sm bg-white space-y-3">
                      <h4 className="text-sm font-bold text-slate-900">My Enrolled Classes</h4>
                      <div className="divide-y divide-slate-100">
                        {classesList.slice(0, 3).map((c) => (
                          <div key={c.classId} className="py-2.5 flex items-center justify-between">
                            <div>
                              <p className="text-xs font-bold text-slate-800">{c.name}</p>
                              <p className="text-[10px] text-slate-400">Teacher: {c.teacherName}</p>
                            </div>
                            <Badge className="bg-slate-100 text-slate-700 text-[10px] font-mono">
                              {c.classCode}
                            </Badge>
                          </div>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveTab('classes')}
                        className="w-full text-xs font-semibold rounded-xl"
                      >
                        View All Classes
                      </Button>
                    </Card>
                  </div>
                </div>
              </div>
            )}

            {/* MY CLASSES TAB */}
            {activeTab === 'classes' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Your Enrolled Classes</h3>
                  <p className="text-xs text-slate-500">All classrooms you are currently taking</p>
                </div>

                {classesList.length === 0 ? (
                  <EmptyState
                    icon={BookOpen}
                    title="No Classes Enrolled"
                    description="You have not enrolled in any classes yet. Join using a class code from your teacher."
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {classesList.map((c) => (
                      <Card key={c.classId} className="rounded-2xl border-slate-100 shadow-sm hover:shadow-md transition-all">
                        <CardHeader className="p-5 border-b border-slate-100">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <CardTitle className="text-base font-bold text-slate-900">{c.name}</CardTitle>
                              <p className="text-xs text-slate-400 mt-0.5">Instructor: <strong className="text-slate-700">{c.teacherName}</strong></p>
                            </div>
                            <Badge className="bg-blue-50 text-blue-700 font-mono text-[11px]">
                              {c.classCode}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="p-5 space-y-3">
                          <p className="text-xs text-slate-600 min-h-[36px]">
                            {c.description || 'No description provided.'}
                          </p>
                          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                            <span>{c.assignmentCount} Assignments</span>
                            <span>{c.memberCount} Classmates</span>
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
                <div>
                  <h3 className="text-xl font-bold text-slate-900">All Assignments</h3>
                  <p className="text-xs text-slate-500">View tasks, deadlines, instructions, and submit your responses</p>
                </div>

                <div className="space-y-4">
                  {assignmentsList.map((a) => (
                    <Card key={a.id} className="p-5 rounded-2xl border-slate-100 shadow-sm hover:shadow-md transition-all bg-white">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="space-y-2 max-w-2xl">
                          <div className="flex items-center gap-2">
                            <Link href={`/student/assignments/${a.id}`} className="hover:text-blue-600 transition-colors">
                              <h4 className="text-base font-bold text-slate-900">{a.title}</h4>
                            </Link>
                            {a.isSubmitted ? (
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                                Submitted
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                                Pending
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-600">{a.description || 'No description provided.'}</p>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                            <span>Class: <strong className="text-slate-700">{a.className}</strong></span>
                            <span>Teacher: <strong className="text-slate-700">{a.teacherName}</strong></span>
                            <span>Max Marks: <strong className="text-slate-700">{a.totalMarks}</strong></span>
                            <span>Due Date: <strong className="text-slate-700">{new Date(a.deadline).toLocaleDateString()}</strong></span>
                          </div>
                          {a.instructions && (
                            <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700 font-mono mt-2">
                              Instructions: {a.instructions}
                            </div>
                          )}
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/student/assignments/${a.id}`)}
                            className="border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold cursor-pointer"
                          >
                            View Details
                          </Button>
                          {a.isSubmitted ? (
                            <div className="text-right">
                              <Badge className="bg-emerald-100 text-emerald-800 text-xs font-semibold">
                                Turned In
                              </Badge>
                              {a.submission?.marksAwarded !== null && (
                                <p className="text-xs font-bold text-slate-800 mt-1">
                                  Grade: {a.submission.marksAwarded} / {a.totalMarks}
                                </p>
                              )}
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => router.push(`/student/assignments/${a.id}/submit`)}
                              className="bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm cursor-pointer"
                            >
                              Upload & Submit
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* SUBMISSIONS TAB */}
            {activeTab === 'submissions' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Your Submission History</h3>
                  <p className="text-xs text-slate-500">All assignments you have completed and submitted</p>
                </div>

                <Card className="rounded-2xl border-slate-100 shadow-sm overflow-hidden bg-white">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          <th className="p-4">Assignment</th>
                          <th className="p-4">Class</th>
                          <th className="p-4">Submitted Date</th>
                          <th className="p-4">Attached Files</th>
                          <th className="p-4">Status</th>
                          <th className="p-4">Score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {submissionsList.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-400">
                              No submissions found.
                            </td>
                          </tr>
                        ) : (
                          submissionsList.map((s) => (
                            <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-4 font-bold text-slate-800">{s.assignment.title}</td>
                              <td className="p-4 text-slate-600">{s.assignment.class.name}</td>
                              <td className="p-4 text-slate-500">{new Date(s.submittedAt).toLocaleString()}</td>
                              <td className="p-4 text-slate-600">{s.files?.length || 0} file(s)</td>
                              <td className="p-4">
                                <StatusBadge status={s.status} />
                              </td>
                              <td className="p-4 font-bold text-slate-800">
                                {s.latestGrade ? `${s.latestGrade.marks} / ${s.assignment.totalMarks}` : <span className="text-amber-600">Pending Review</span>}
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

            {/* GRADES TAB */}
            {activeTab === 'grades' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">My Grades & Teacher Feedback</h3>
                  <p className="text-xs text-slate-500">Evaluated coursework with scores, letter grades, and constructive feedback</p>
                </div>

                <div className="space-y-4">
                  {gradesList.length === 0 ? (
                    <EmptyState
                      icon={Award}
                      title="No Evaluated Grades Yet"
                      description="Once your teachers evaluate your submitted assignments, your grades and feedback will appear here."
                    />
                  ) : (
                    gradesList.map((g) => (
                      <Card key={g.submissionId} className="p-6 rounded-2xl border-slate-100 shadow-sm bg-white space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div>
                            <h4 className="text-base font-bold text-slate-900">{g.assignmentTitle}</h4>
                            <p className="text-xs text-slate-500">Class: <strong>{g.className}</strong> ({g.classCode})</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-sm font-bold px-3 py-1">
                              {g.marksObtained} / {g.totalMarks} Marks
                            </Badge>
                            {g.letterGrade && (
                              <Badge className="bg-blue-50 text-blue-800 border-blue-200 text-sm font-bold px-3 py-1">
                                Grade: {g.letterGrade}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {g.feedback && (
                          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700">
                            <p className="font-semibold text-slate-900 mb-1">Teacher Feedback:</p>
                            <p className="italic">"{g.feedback}"</p>
                            <p className="text-[10px] text-slate-400 mt-2">
                              Evaluated by {g.evaluatedBy} on {new Date(g.evaluatedAt).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </Card>
                    ))
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}

export default function StudentDashboard() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <StudentDashboardContent />
    </Suspense>
  );
}
