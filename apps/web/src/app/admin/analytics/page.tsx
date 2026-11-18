'use client';

import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
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
  Legend,
} from 'recharts';
import {
  Users,
  GraduationCap,
  BookOpen,
  FileText,
  Inbox,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  Activity,
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    async function fetchAdminAnalytics() {
      try {
        setLoading(true);
        const res = await apiClient.get('/analytics/admin/overview');
        if (res.data?.success && res.data?.data) {
          setData(res.data.data);
        }
      } catch {
        toast.error('Failed to load administrative analytics');
      } finally {
        setLoading(false);
      }
    }
    fetchAdminAnalytics();
  }, []);

  const summary = data?.summary;
  const registrationTrends = data?.registrationTrends || [];
  const classParticipation = data?.classParticipation || [];

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <DashboardLayout title="System Analytics & Platform Metrics" currentTab="analytics">
        <div className="space-y-6">
          {/* Top Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                <ShieldCheck className="w-6 h-6 text-purple-600" />
                Administrative Platform Intelligence
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                System-wide metrics, institutional growth trajectories, active coursework, and database health.
              </p>
            </div>
            <Badge className="bg-purple-100 text-purple-800 border-purple-200 font-bold px-3 py-1 text-xs">
              Platform Admin
            </Badge>
          </div>

          {loading ? (
            <div className="p-16 text-center text-slate-400 font-medium">Loading system telemetry...</div>
          ) : (
            <>
              {/* Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Total Faculty"
                  value={summary?.totalTeachers || 0}
                  subtitle="Verified teachers"
                  icon={GraduationCap}
                  iconBg="bg-blue-50"
                  iconColor="text-blue-600"
                />
                <StatCard
                  title="Total Students"
                  value={summary?.totalStudents || 0}
                  subtitle="Active learners"
                  icon={Users}
                  iconBg="bg-indigo-50"
                  iconColor="text-indigo-600"
                />
                <StatCard
                  title="Active Classes"
                  value={summary?.totalActiveClasses || 0}
                  subtitle="Current academic groups"
                  icon={BookOpen}
                  iconBg="bg-emerald-50"
                  iconColor="text-emerald-600"
                />
                <StatCard
                  title="Submissions Logged"
                  value={summary?.totalSubmissions || 0}
                  subtitle={`Evaluated: ${summary?.evaluatedSubmissions || 0}`}
                  icon={Inbox}
                  iconBg="bg-purple-50"
                  iconColor="text-purple-600"
                />
              </div>

              {/* Registration Trends Chart */}
              <Card className="rounded-2xl border-slate-100 shadow-sm p-6 bg-white">
                <CardHeader className="p-0 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold text-slate-900">
                        Institutional User Growth (Last 6 Months)
                      </CardTitle>
                      <p className="text-xs text-slate-400 mt-0.5">
                        New teacher and student registrations recorded in Neon PostgreSQL
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      Monthly New Accounts
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0 pt-2 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={registrationTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} />
                      <YAxis allowDecimals={false} stroke="#94A3B8" fontSize={11} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0F172A', color: '#FFF', borderRadius: '12px' }}
                      />
                      <Legend />
                      <Bar dataKey="students" name="Students" fill="#2563EB" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="teachers" name="Teachers" fill="#7C3AED" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Class Participation Leaderboard */}
              <Card className="rounded-2xl border-slate-100 shadow-sm overflow-hidden bg-white">
                <CardHeader className="p-6 border-b border-slate-100">
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-emerald-600" />
                    Top Active Classes by Student Enrollment
                  </CardTitle>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Classes with the highest student engagement and published assignments
                  </p>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                          <th className="py-3 px-5">Class Name</th>
                          <th className="py-3 px-5">Instructor</th>
                          <th className="py-3 px-5">Enrolled Students</th>
                          <th className="py-3 px-5">Assignments Created</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {classParticipation.map((c: any) => (
                          <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3.5 px-5 font-bold text-slate-900">{c.className}</td>
                            <td className="py-3.5 px-5 text-slate-600">{c.teacherName}</td>
                            <td className="py-3.5 px-5 font-bold text-blue-600">{c.studentCount} active</td>
                            <td className="py-3.5 px-5 text-slate-700 font-semibold">{c.assignmentCount} tasks</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
