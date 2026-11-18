'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/dashboard/StatCard';
import { apiClient } from '@/lib/axios';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  GraduationCap,
  Award,
  Users,
  BookOpen,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileBarChart,
  Filter,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';

const STATUS_COLORS = ['#2563EB', '#7C3AED', '#E2E8F0'];
const GRADE_COLORS = ['#10B981', '#3B82F6', '#6366F1', '#F59E0B', '#EF4444', '#94A3B8'];

export default function TeacherAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  const fetchAnalytics = async (classId?: string) => {
    try {
      setLoading(true);
      const url = classId
        ? `/analytics/teacher/classes/${classId}`
        : '/analytics/teacher/overview';
      const res = await apiClient.get(url);
      if (res.data?.success && res.data?.data) {
        setData(res.data.data);
      }
    } catch (err: any) {
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(selectedClassId || undefined);
  }, [selectedClassId]);

  // Overall metrics or class metrics
  const isClassView = !!selectedClassId && data?.classDetails;
  const overall = isClassView
    ? {
        averagePerformance: data.stats.averagePerformance,
        averageGrade: data.stats.averageGrade,
        totalStudents: data.classDetails.totalStudents,
        totalAssignments: data.classDetails.totalAssignments,
        completionRate: data.stats.totalEvaluated > 0 ? Math.round((data.stats.totalEvaluated / (data.classDetails.totalStudents * (data.classDetails.totalAssignments || 1))) * 100) : 0,
        evaluatedSubmissions: data.stats.totalEvaluated,
      }
    : data?.overall;

  // Grade distribution chart data
  const gradeDistData = data?.gradeDistribution
    ? Object.entries(data.gradeDistribution).map(([grade, count]) => ({
        grade,
        count,
      }))
    : [];

  // Submission status breakdown data
  const statusPieData = data?.submissionStatusBreakdown
    ? [
        { name: 'Evaluated', value: data.submissionStatusBreakdown.evaluated },
        { name: 'Under Review', value: data.submissionStatusBreakdown.underReview },
        { name: 'Pending / Missing', value: data.submissionStatusBreakdown.pending },
      ]
    : [];

  return (
    <ProtectedRoute allowedRoles={['TEACHER', 'ADMIN']}>
      <DashboardLayout title="Academic Analytics" currentTab="analytics">
        <div className="space-y-6">
          {/* Top Control Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                <TrendingUp className="w-6 h-6 text-blue-600" />
                Teacher Performance Analytics
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Real-time insights across classes, student comprehension, submission rates, and grade distribution.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Class Filter Dropdown */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                >
                  <option value="">All Teaching Classes</option>
                  {data?.classes?.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.classCode})
                    </option>
                  ))}
                </select>
              </div>

              {/* Reports Button */}
              <Link href="/teacher/reports">
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm flex items-center gap-1.5"
                >
                  <FileBarChart className="w-3.5 h-3.5" />
                  Generate Reports
                </Button>
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="p-16 text-center text-slate-400 font-medium">Loading real-time analytics...</div>
          ) : (
            <>
              {/* KPI Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Average Performance"
                  value={`${overall?.averagePerformance || 0}%`}
                  subtitle={`Class Grade: ${overall?.averageGrade || 'N/A'}`}
                  icon={Award}
                  iconBg="bg-blue-50"
                  iconColor="text-blue-600"
                />
                <StatCard
                  title="Submission Completion"
                  value={`${overall?.completionRate || 0}%`}
                  subtitle="Assigned tasks submitted"
                  icon={CheckCircle2}
                  iconBg="bg-emerald-50"
                  iconColor="text-emerald-600"
                />
                <StatCard
                  title="Active Students"
                  value={overall?.totalStudents || 0}
                  subtitle="Unique enrolled pupils"
                  icon={Users}
                  iconBg="bg-purple-50"
                  iconColor="text-purple-600"
                />
                <StatCard
                  title="Evaluations Done"
                  value={overall?.evaluatedSubmissions || 0}
                  subtitle={isClassView ? 'Class total graded' : `Pending: ${data?.overall?.pendingEvaluations || 0}`}
                  icon={GraduationCap}
                  iconBg="bg-amber-50"
                  iconColor="text-amber-600"
                />
              </div>

              {/* Interactive Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 1. Performance Trends Area Chart */}
                <Card className="lg:col-span-2 rounded-2xl border-slate-100 shadow-sm p-6">
                  <CardHeader className="p-0 pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base font-bold text-slate-900">
                          Performance Trends Over Time
                        </CardTitle>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Average student percentage progression across academic evaluations
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs text-blue-600 bg-blue-50 border-blue-100">
                        Monthly Average
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 pt-2 h-72">
                    {data?.performanceTrends && data.performanceTrends.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data.performanceTrends}>
                          <defs>
                            <linearGradient id="performanceGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                          <XAxis dataKey="period" stroke="#94A3B8" fontSize={11} />
                          <YAxis domain={[0, 100]} stroke="#94A3B8" fontSize={11} unit="%" />
                          <Tooltip
                            formatter={(value: any) => [`${value}%`, 'Average Score']}
                            contentStyle={{ backgroundColor: '#0F172A', color: '#FFF', borderRadius: '12px' }}
                          />
                          <Area
                            type="monotone"
                            dataKey="average"
                            stroke="#2563EB"
                            strokeWidth={2.5}
                            fillOpacity={1}
                            fill="url(#performanceGrad)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                        No trend data available yet
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 2. Grade Distribution Bar Chart */}
                <Card className="rounded-2xl border-slate-100 shadow-sm p-6">
                  <CardHeader className="p-0 pb-4">
                    <CardTitle className="text-base font-bold text-slate-900">
                      Grade Distribution
                    </CardTitle>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Spread of letter grades awarded across assignments
                    </p>
                  </CardHeader>
                  <CardContent className="p-0 pt-2 h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={gradeDistData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                        <XAxis dataKey="grade" stroke="#94A3B8" fontSize={11} />
                        <YAxis allowDecimals={false} stroke="#94A3B8" fontSize={11} />
                        <Tooltip
                          formatter={(value: any) => [value, 'Students']}
                          contentStyle={{ backgroundColor: '#0F172A', color: '#FFF', borderRadius: '12px' }}
                        />
                        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                          {gradeDistData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={GRADE_COLORS[index % GRADE_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Students Requiring Additional Attention Table */}
              {!isClassView && data?.studentsRequiringAttention && (
                <Card className="rounded-2xl border-slate-100 shadow-sm overflow-hidden">
                  <CardHeader className="p-6 border-b border-slate-100 bg-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-amber-500" />
                          Students Requiring Additional Attention
                        </CardTitle>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Identified based on low score thresholds (&lt; 55%) or multiple missing assignment submissions
                        </p>
                      </div>
                      <Badge className="bg-amber-50 text-amber-700 border-amber-200">
                        {data.studentsRequiringAttention.length} Flagged
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {data.studentsRequiringAttention.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs">
                        🎉 All enrolled students are currently performing above academic warning thresholds!
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                              <th className="py-3 px-5">Student Name</th>
                              <th className="py-3 px-5">Student ID</th>
                              <th className="py-3 px-5">Average Score</th>
                              <th className="py-3 px-5">Current Grade</th>
                              <th className="py-3 px-5">Submissions</th>
                              <th className="py-3 px-5">Academic Concern</th>
                              <th className="py-3 px-5 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {data.studentsRequiringAttention.map((st: any) => (
                              <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-3.5 px-5 font-bold text-slate-800">{st.fullName}</td>
                                <td className="py-3.5 px-5 text-slate-500">{st.studentId}</td>
                                <td className="py-3.5 px-5 font-semibold text-rose-600">{st.averagePercentage}%</td>
                                <td className="py-3.5 px-5">
                                  <Badge variant="outline" className="font-bold border-rose-200 text-rose-700">
                                    {st.letterGrade}
                                  </Badge>
                                </td>
                                <td className="py-3.5 px-5 text-slate-600">{st.submissionsCount}</td>
                                <td className="py-3.5 px-5">
                                  <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                                    {st.concern}
                                  </span>
                                </td>
                                <td className="py-3.5 px-5 text-right">
                                  <Link
                                    href={`/teacher/reports?studentId=${st.id}`}
                                    className="text-blue-600 hover:text-blue-700 font-semibold text-xs flex items-center justify-end gap-1"
                                  >
                                    View Report <ArrowRight className="w-3 h-3" />
                                  </Link>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Class-Specific Student Performance Table (When Class Filter is Selected) */}
              {isClassView && data?.studentPerformance && (
                <Card className="rounded-2xl border-slate-100 shadow-sm overflow-hidden">
                  <CardHeader className="p-6 border-b border-slate-100 bg-white">
                    <CardTitle className="text-base font-bold text-slate-900">
                      Class Student Roster & Evaluation Performance
                    </CardTitle>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Individual scores and completion rates for {data.classDetails.name}
                    </p>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                            <th className="py-3 px-5">Student</th>
                            <th className="py-3 px-5">Student ID</th>
                            <th className="py-3 px-5">Submissions</th>
                            <th className="py-3 px-5">Evaluated</th>
                            <th className="py-3 px-5">Average Score</th>
                            <th className="py-3 px-5">Grade</th>
                            <th className="py-3 px-5">Completion</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {data.studentPerformance.map((s: any) => (
                            <tr key={s.studentId} className="hover:bg-slate-50 transition-colors">
                              <td className="py-3.5 px-5 font-bold text-slate-800">{s.fullName}</td>
                              <td className="py-3.5 px-5 text-slate-500">{s.customId}</td>
                              <td className="py-3.5 px-5 text-slate-600">{s.submissionsCount}</td>
                              <td className="py-3.5 px-5 text-slate-600">{s.evaluatedCount}</td>
                              <td className="py-3.5 px-5 font-bold text-slate-900">{s.averagePercentage}%</td>
                              <td className="py-3.5 px-5">
                                <Badge className="bg-blue-50 text-blue-700 border-blue-100 font-bold">
                                  {s.letterGrade}
                                </Badge>
                              </td>
                              <td className="py-3.5 px-5 font-semibold text-emerald-600">{s.completionRate}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
