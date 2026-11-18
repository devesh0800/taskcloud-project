'use client';

import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/dashboard/StatCard';
import { apiClient } from '@/lib/axios';
import { useAuth } from '@/hooks/useAuth';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import {
  GraduationCap,
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  TrendingUp,
  MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';

export default function StudentAnalyticsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const fetchStudentAnalytics = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/analytics/student/overview');
      if (res.data?.success && res.data?.data) {
        setData(res.data.data);
      }
    } catch {
      toast.error('Failed to load performance analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentAnalytics();
  }, []);

  const handleExport = async (format: 'csv' | 'pdf') => {
    if (!user) return;
    try {
      toast.info(`Preparing official transcript (${format.toUpperCase()})...`);
      const response = await apiClient.get(`/reports/student/${user.id}?format=${format}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `edusync-transcript-${user.fullName.replace(/\s+/g, '_')}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(`Transcript downloaded in ${format.toUpperCase()} format!`);
    } catch {
      toast.error('Failed to export transcript');
    }
  };

  const summary = data?.summary;
  const performanceTrends = data?.performanceTrends || [];
  const classPerformance = data?.classPerformance || [];
  const assignmentScores = data?.assignmentScores || [];

  return (
    <ProtectedRoute allowedRoles={['STUDENT', 'ADMIN']}>
      <DashboardLayout title="My Academic Performance" currentTab="analytics">
        <div className="space-y-6">
          {/* Top Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                <TrendingUp className="w-6 h-6 text-blue-600" />
                Academic Progress & Performance
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Monitor your published evaluation scores, class rankings, completion rates, and instructor feedback.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => handleExport('csv')}
                variant="outline"
                size="sm"
                className="rounded-xl border-slate-200 text-xs font-semibold flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                Export CSV
              </Button>
              <Button
                onClick={() => handleExport('pdf')}
                size="sm"
                className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <Download className="w-4 h-4" />
                Download Transcript
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="p-16 text-center text-slate-400 font-medium">Loading your performance analytics...</div>
          ) : (
            <>
              {/* Summary KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Cumulative Grade"
                  value={summary?.currentGrade || 'N/A'}
                  subtitle={`Average Score: ${summary?.overallAveragePercentage || 0}%`}
                  icon={Award}
                  iconBg="bg-blue-50"
                  iconColor="text-blue-600"
                />
                <StatCard
                  title="Completed Tasks"
                  value={`${summary?.submittedAssignments || 0} / ${summary?.totalAssignmentsReceived || 0}`}
                  subtitle={`Pending: ${summary?.pendingAssignments || 0}`}
                  icon={CheckCircle2}
                  iconBg="bg-emerald-50"
                  iconColor="text-emerald-600"
                />
                <StatCard
                  title="Evaluated Tasks"
                  value={summary?.evaluatedAssignments || 0}
                  subtitle="Published by instructors"
                  icon={GraduationCap}
                  iconBg="bg-purple-50"
                  iconColor="text-purple-600"
                />
                <StatCard
                  title="Late Submissions"
                  value={summary?.lateSubmissions || 0}
                  subtitle={summary?.lateSubmissions === 0 ? 'Punctual submission record' : 'Submitted after deadline'}
                  icon={Clock}
                  iconBg={summary?.lateSubmissions === 0 ? 'bg-slate-50' : 'bg-rose-50'}
                  iconColor={summary?.lateSubmissions === 0 ? 'text-slate-500' : 'text-rose-600'}
                />
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. Score Progression Line Chart */}
                <Card className="rounded-2xl border-slate-100 shadow-sm p-6 bg-white">
                  <CardHeader className="p-0 pb-4">
                    <CardTitle className="text-base font-bold text-slate-900">
                      Score Progression Across Graded Assignments
                    </CardTitle>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Your percentage trend on sequentially evaluated coursework
                    </p>
                  </CardHeader>
                  <CardContent className="p-0 pt-2 h-64">
                    {performanceTrends.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={performanceTrends}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                          <XAxis dataKey="title" stroke="#94A3B8" fontSize={10} />
                          <YAxis domain={[0, 100]} stroke="#94A3B8" fontSize={11} unit="%" />
                          <Tooltip
                            formatter={(val: any) => [`${val}%`, 'Score']}
                            contentStyle={{ backgroundColor: '#0F172A', color: '#FFF', borderRadius: '12px' }}
                          />
                          <Line
                            type="monotone"
                            dataKey="percentage"
                            stroke="#2563EB"
                            strokeWidth={3}
                            dot={{ fill: '#2563EB', r: 5 }}
                            activeDot={{ r: 7 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                        No graded assignments yet
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 2. Class-Wise Performance Bar Chart */}
                <Card className="rounded-2xl border-slate-100 shadow-sm p-6 bg-white">
                  <CardHeader className="p-0 pb-4">
                    <CardTitle className="text-base font-bold text-slate-900">
                      Subject / Class Performance Comparison
                    </CardTitle>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Average marks percentage earned across enrolled courses
                    </p>
                  </CardHeader>
                  <CardContent className="p-0 pt-2 h-64">
                    {classPerformance.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={classPerformance}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                          <XAxis dataKey="className" stroke="#94A3B8" fontSize={10} />
                          <YAxis domain={[0, 100]} stroke="#94A3B8" fontSize={11} unit="%" />
                          <Tooltip
                            formatter={(val: any) => [`${val}%`, 'Class Average']}
                            contentStyle={{ backgroundColor: '#0F172A', color: '#FFF', borderRadius: '12px' }}
                          />
                          <Bar dataKey="averagePercentage" fill="#7C3AED" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                        No active classes with graded coursework
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Assignment Scores & Instructor Feedback Table */}
              <Card className="rounded-2xl border-slate-100 shadow-sm overflow-hidden bg-white">
                <CardHeader className="p-6 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-blue-600" />
                        Assignment Results & Instructor Feedback
                      </CardTitle>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Detailed evaluation breakdown with published letter grades and instructor guidance
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs font-semibold">
                      {assignmentScores.length} Submissions Total
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {assignmentScores.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 text-xs">
                      No assignments submitted yet. Go to your classes to view pending tasks.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                            <th className="py-3 px-5">Assignment</th>
                            <th className="py-3 px-5">Class</th>
                            <th className="py-3 px-5">Submitted At</th>
                            <th className="py-3 px-5">Timing</th>
                            <th className="py-3 px-5">Marks</th>
                            <th className="py-3 px-5">Score (%)</th>
                            <th className="py-3 px-5">Grade</th>
                            <th className="py-3 px-5">Teacher Feedback</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {assignmentScores.map((a: any) => (
                            <tr key={a.submissionId} className="hover:bg-slate-50 transition-colors">
                              <td className="py-3.5 px-5 font-bold text-slate-900">{a.assignmentTitle}</td>
                              <td className="py-3.5 px-5 text-slate-600">{a.className}</td>
                              <td className="py-3.5 px-5 text-slate-500">
                                {a.submittedAt ? new Date(a.submittedAt).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="py-3.5 px-5">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                    a.isLate ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                                  }`}
                                >
                                  {a.isLate ? 'Late' : 'On Time'}
                                </span>
                              </td>
                              <td className="py-3.5 px-5 font-bold text-slate-800">
                                {a.marks !== null ? `${a.marks} / ${a.totalMarks}` : 'Pending'}
                              </td>
                              <td className="py-3.5 px-5 font-semibold text-blue-600">
                                {a.percentage !== null ? `${a.percentage}%` : '—'}
                              </td>
                              <td className="py-3.5 px-5">
                                <Badge
                                  className={
                                    a.letterGrade !== 'Pending'
                                      ? 'bg-blue-50 text-blue-700 font-bold border-blue-100'
                                      : 'bg-slate-100 text-slate-600'
                                  }
                                >
                                  {a.letterGrade}
                                </Badge>
                              </td>
                              <td className="py-3.5 px-5 text-slate-600 max-w-sm italic">
                                {a.feedback || 'Awaiting teacher evaluation remarks.'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
