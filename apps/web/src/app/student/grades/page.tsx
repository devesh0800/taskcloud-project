'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardSkeleton } from '@/components/dashboard/LoadingSkeleton';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import {
  Award,
  TrendingUp,
  BarChart3,
  Calendar,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  Eye,
  FileText,
  Star,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export default function StudentGradesPage() {
  const [loading, setLoading] = useState(true);
  const [grades, setGrades] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });

  useEffect(() => {
    fetchGradesAndAnalytics();
  }, []);

  const fetchGradesAndAnalytics = async () => {
    try {
      setLoading(true);
      const [gradesRes, analyticsRes] = await Promise.all([
        api.get('/api/v1/grades/student'),
        api.get('/api/v1/grades/student/analytics'),
      ]);

      if (gradesRes.data.success) {
        setGrades(gradesRes.data.data);
        if (gradesRes.data.pagination) setPagination(gradesRes.data.pagination);
      }
      if (analyticsRes.data.success) {
        setAnalytics(analyticsRes.data.data);
      }
    } catch (err) {
      console.error('Failed to load grades data', err);
    } finally {
      setLoading(false);
    }
  };

  const summary = analytics?.summary || {
    totalEvaluated: 0,
    averageMarks: 0,
    highestMarks: 0,
    lowestMarks: 0,
    overallPercentage: 0,
  };

  return (
    <ProtectedRoute allowedRoles={['STUDENT', 'ADMIN']}>
      <DashboardLayout currentTab="grades" title="My Grades & Performance" showSearch={false}>
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                <Award className="w-6 h-6 text-blue-600" /> Academic Grades & Evaluation Feedback
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Track your published marks, percentage scores, teacher comments, and historical performance trends.
              </p>
            </div>
          </div>

          {/* Performance Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
            <Card className="border-slate-200/80 shadow-sm p-4 bg-white">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Evaluated Tasks</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{summary.totalEvaluated}</p>
            </Card>

            <Card className="border-slate-200/80 shadow-sm p-4 bg-white">
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Overall Score</p>
              <p className="text-2xl font-black text-blue-600 mt-1">{summary.overallPercentage}%</p>
            </Card>

            <Card className="border-slate-200/80 shadow-sm p-4 bg-white">
              <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">Average Marks</p>
              <p className="text-2xl font-black text-purple-600 mt-1">{summary.averageMarks}</p>
            </Card>

            <Card className="border-slate-200/80 shadow-sm p-4 bg-white">
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Highest Marks</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">{summary.highestMarks}%</p>
            </Card>

            <Card className="border-slate-200/80 shadow-sm p-4 bg-white col-span-2 sm:col-span-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Lowest Marks</p>
              <p className="text-2xl font-black text-slate-700 mt-1">{summary.lowestMarks}%</p>
            </Card>
          </div>

          {/* Analytics Charts Section (using Recharts) */}
          {analytics && analytics.marksOverTime?.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Chart 1: Performance Over Time */}
              <Card className="border-slate-200/80 shadow-sm bg-white p-5">
                <CardHeader className="p-0 pb-4">
                  <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-600" /> Score Trajectory (% Over Time)
                  </CardTitle>
                </CardHeader>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.marksOverTime}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
                      <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={10} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderRadius: '12px',
                          border: 'none',
                          color: '#fff',
                          fontSize: '11px',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="percentage"
                        stroke="#2563eb"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#2563eb' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Chart 2: Grade Distribution */}
              <Card className="border-slate-200/80 shadow-sm bg-white p-5">
                <CardHeader className="p-0 pb-4">
                  <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-purple-600" /> Grade Distribution Breakdown
                  </CardTitle>
                </CardHeader>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.gradeDistribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="grade" stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <YAxis allowDecimals={false} stroke="#94a3b8" fontSize={10} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderRadius: '12px',
                          border: 'none',
                          color: '#fff',
                          fontSize: '11px',
                        }}
                      />
                      <Bar dataKey="count" fill="#7c3aed" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          )}

          {/* Graded Assignments List */}
          <div className="space-y-3">
            <h2 className="text-base font-bold text-slate-900">Evaluated Assignments</h2>

            {loading ? (
              <DashboardSkeleton />
            ) : grades.length === 0 ? (
              <Card className="p-12 text-center border-slate-200/80 bg-white shadow-sm">
                <Award className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800">No Published Evaluations Yet</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  When your instructors review and publish scores for your submitted assignments, they will appear here.
                </p>
                <Link href="/student/assignments" className="mt-4 inline-block">
                  <Button variant="outline" size="sm" className="text-xs font-semibold">
                    View My Submitted Assignments
                  </Button>
                </Link>
              </Card>
            ) : (
              <Card className="border-slate-200/80 shadow-sm bg-white overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Assignment & Subject</th>
                        <th className="py-3 px-4">Class</th>
                        <th className="py-3 px-4">Evaluated Date</th>
                        <th className="py-3 px-4">Score</th>
                        <th className="py-3 px-4">Grade</th>
                        <th className="py-3 px-4">Teacher Feedback</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {grades.map((g) => (
                        <tr key={g.submissionId} className="hover:bg-slate-50/60 transition-colors">
                          {/* Title & Subject */}
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-slate-900 leading-tight">{g.assignmentTitle}</p>
                            <p className="text-[10px] text-slate-400">{g.subject || 'Coursework'}</p>
                          </td>

                          {/* Class */}
                          <td className="py-3.5 px-4 font-semibold text-slate-700">
                            {g.className}
                          </td>

                          {/* Evaluated Date */}
                          <td className="py-3.5 px-4 text-slate-500">
                            {new Date(g.evaluatedAt).toLocaleDateString()}
                          </td>

                          {/* Marks & Percentage */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">
                              {g.marksObtained} / {g.maxMarks}
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({g.percentage}%)
                            </span>
                          </td>

                          {/* Grade Badge */}
                          <td className="py-3.5 px-4">
                            <Badge className="bg-[#172554] text-white font-extrabold text-xs px-2 py-0.5">
                              {g.grade}
                            </Badge>
                          </td>

                          {/* Feedback Snippet */}
                          <td className="py-3.5 px-4">
                            {g.feedback ? (
                              <p className="text-xs text-slate-600 italic truncate max-w-xs">
                                "{g.feedback}"
                              </p>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">No written note</span>
                            )}
                          </td>

                          {/* Action */}
                          <td className="py-3.5 px-4 text-right">
                            <Link href={`/student/grades/${g.submissionId}`}>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs font-bold rounded-xl text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              >
                                <Eye className="w-3.5 h-3.5 mr-1" /> View Details
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
