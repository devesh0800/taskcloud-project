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
  ShieldCheck,
  BookOpen,
  FileText,
  Inbox,
  Activity,
  UserCheck,
  UserX,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  History,
  Lock,
} from 'lucide-react';

function AdminDashboardContent() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [logsList, setLogsList] = useState<any[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [togglingUser, setTogglingUser] = useState<string | null>(null);

  // Load Admin stats
  useEffect(() => {
    async function loadAdminData() {
      try {
        setLoading(true);
        setError(null);
        const [dashRes, usersRes] = await Promise.all([
          api.get('/admin/dashboard'),
          api.get('/admin/users'),
        ]);

        if (dashRes.data.success) {
          setDashboardData(dashRes.data.data);
        }
        if (usersRes.data.success) {
          setUsersList(usersRes.data.data.users);
        }
      } catch (err: any) {
        console.error('Failed to load admin dashboard:', err);
        setError(err.response?.data?.error?.message || 'Failed to load administrative statistics.');
      } finally {
        setLoading(false);
      }
    }
    loadAdminData();
  }, []);

  // Fetch users with search / filter
  const fetchUsers = async (search = searchQuery, role = roleFilter) => {
    try {
      const params: any = {};
      if (search.trim()) params.search = search.trim();
      if (role !== 'ALL') params.role = role;

      const res = await api.get('/admin/users', { params });
      if (res.data.success) {
        setUsersList(res.data.data.users);
      }
    } catch (err: any) {
      console.error('Failed to search users:', err);
    }
  };

  // Toggle user active status
  const handleToggleStatus = async (targetUserId: string, currentStatus: boolean) => {
    try {
      setTogglingUser(targetUserId);
      const res = await api.patch(`/admin/users/${targetUserId}/status`, {
        isActive: !currentStatus,
      });

      if (res.data.success) {
        setUsersList((prev) =>
          prev.map((u) => (u.id === targetUserId ? { ...u, isActive: !currentStatus } : u))
        );
      }
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to update user status.');
    } finally {
      setTogglingUser(null);
    }
  };

  // Lazy load audit logs
  useEffect(() => {
    if (activeTab === 'logs' && logsList.length === 0) {
      api.get('/admin/activity-logs').then((res) => {
        if (res.data.success) {
          setLogsList(res.data.data.logs);
        }
      });
    }
  }, [activeTab, logsList.length]);

  const stats = dashboardData?.stats || {
    totalUsers: 0,
    totalTeachers: 0,
    totalStudents: 0,
    totalClasses: 0,
    totalAssignments: 0,
    totalSubmissions: 0,
    evaluatedSubmissions: 0,
    submissionRate: 0,
  };

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <DashboardLayout
        currentTab={activeTab}
        onSelectTab={setActiveTab}
        title={
          activeTab === 'overview'
            ? 'System Administration'
            : activeTab === 'users'
            ? 'User Directory'
            : 'Audit & Activity Logs'
        }
        searchValue={searchQuery}
        onSearchChange={(val) => {
          setSearchQuery(val);
          fetchUsers(val, roleFilter);
        }}
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
                {/* Statistics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard
                    title="Total Registered Users"
                    value={stats.totalUsers}
                    subtitle={`${stats.totalTeachers} Teachers, ${stats.totalStudents} Students`}
                    icon={Users}
                    iconColor="text-blue-600"
                    iconBg="bg-blue-50"
                  />
                  <StatCard
                    title="Active Classes"
                    value={stats.totalClasses}
                    subtitle="Academic classrooms"
                    icon={BookOpen}
                    iconColor="text-indigo-600"
                    iconBg="bg-indigo-50"
                  />
                  <StatCard
                    title="Assignments Created"
                    value={stats.totalAssignments}
                    subtitle="Coursework items"
                    icon={FileText}
                    iconColor="text-emerald-600"
                    iconBg="bg-emerald-50"
                  />
                  <StatCard
                    title="Total Submissions"
                    value={stats.totalSubmissions}
                    subtitle={`${stats.evaluatedSubmissions} Evaluated`}
                    icon={Inbox}
                    iconColor="text-purple-600"
                    iconBg="bg-purple-50"
                  />
                </div>

                {/* Banner */}
                <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-[#172554] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-400" /> System Control & Oversight
                    </h3>
                    <p className="text-xs text-slate-300">
                      Manage all platform users, monitor database activity, and audit platform security events.
                    </p>
                  </div>
                  <Button
                    onClick={() => setActiveTab('users')}
                    className="bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold rounded-xl"
                  >
                    Manage Users Directory
                  </Button>
                </div>

                {/* 2-Column Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column (2 Cols): Latest Users */}
                  <div className="lg:col-span-2">
                    <Card className="rounded-2xl border-slate-100 shadow-sm overflow-hidden bg-white">
                      <CardHeader className="p-5 border-b border-slate-100 flex flex-row items-center justify-between">
                        <div>
                          <CardTitle className="text-base font-bold text-[#0F172A]">
                            Recently Registered Users
                          </CardTitle>
                          <p className="text-xs text-slate-400">Latest accounts created on EduSync</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveTab('users')}
                          className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-semibold"
                        >
                          View All
                        </Button>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="divide-y divide-slate-100">
                          {dashboardData?.recentUsers?.map((u: any) => (
                            <div key={u.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                              <div>
                                <p className="text-xs font-bold text-slate-800">{u.fullName}</p>
                                <p className="text-[11px] text-slate-400">{u.email}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className="bg-slate-100 text-slate-700 text-[10px] uppercase font-bold">
                                  {u.role}
                                </Badge>
                                <Badge
                                  className={
                                    u.isActive
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]'
                                      : 'bg-rose-50 text-rose-700 border-rose-200 text-[10px]'
                                  }
                                >
                                  {u.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Right Column: Platform Audit Feed */}
                  <div>
                    <Card className="rounded-2xl border-slate-100 shadow-sm overflow-hidden bg-white">
                      <CardHeader className="p-5 border-b border-slate-100">
                        <CardTitle className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                          <Activity className="w-4 h-4 text-blue-600" /> Recent Activity Logs
                        </CardTitle>
                        <p className="text-xs text-slate-400">Live system audit events</p>
                      </CardHeader>
                      <CardContent className="p-0">
                        {dashboardData?.recentActivity?.length === 0 ? (
                          <div className="p-6 text-center text-slate-400 text-xs">
                            No recent activity recorded.
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-100">
                            {dashboardData?.recentActivity?.slice(0, 5).map((log: any) => (
                              <div key={log.id} className="p-4 space-y-1 hover:bg-slate-50 transition-colors">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-bold text-slate-800">{log.action}</span>
                                  <span className="text-[10px] text-slate-400">
                                    {new Date(log.createdAt).toLocaleTimeString()}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500">
                                  By <strong className="text-slate-700">{log.userName}</strong> ({log.userRole})
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            )}

            {/* USERS TAB */}
            {activeTab === 'users' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">User Directory</h3>
                    <p className="text-xs text-slate-500">Search, filter, inspect, and manage system accounts</p>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-2">
                    {['ALL', 'TEACHER', 'STUDENT', 'ADMIN'].map((role) => (
                      <button
                        key={role}
                        onClick={() => {
                          setRoleFilter(role);
                          fetchUsers(searchQuery, role);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          roleFilter === role
                            ? 'bg-[#172554] text-white shadow-sm'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>

                <Card className="rounded-2xl border-slate-100 shadow-sm overflow-hidden bg-white">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          <th className="p-4">User</th>
                          <th className="p-4">Role</th>
                          <th className="p-4">Department / Course</th>
                          <th className="p-4">ID Reference</th>
                          <th className="p-4">Joined Date</th>
                          <th className="p-4">Status</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {usersList.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-slate-400">
                              No users found matching query.
                            </td>
                          </tr>
                        ) : (
                          usersList.map((u) => (
                            <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-4">
                                <p className="font-bold text-slate-800">{u.fullName}</p>
                                <p className="text-[10px] text-slate-400">{u.email}</p>
                              </td>
                              <td className="p-4">
                                <Badge className="bg-slate-100 text-slate-700 text-[10px] uppercase font-bold">
                                  {u.role}
                                </Badge>
                              </td>
                              <td className="p-4 text-slate-600">
                                {u.department || u.course || '—'}
                              </td>
                              <td className="p-4 font-mono text-slate-600">
                                {u.studentId || u.teacherId || '—'}
                              </td>
                              <td className="p-4 text-slate-500">
                                {new Date(u.createdAt).toLocaleDateString()}
                              </td>
                              <td className="p-4">
                                <StatusBadge status={u.isActive ? 'ACTIVE' : 'INACTIVE'} />
                              </td>
                              <td className="p-4 text-right">
                                {u.role !== 'ADMIN' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={togglingUser === u.id}
                                    onClick={() => handleToggleStatus(u.id, u.isActive)}
                                    className={`text-[11px] h-7 rounded-lg font-semibold ${
                                      u.isActive
                                        ? 'text-rose-600 border-rose-200 hover:bg-rose-50'
                                        : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'
                                    }`}
                                  >
                                    {u.isActive ? 'Deactivate' : 'Activate'}
                                  </Button>
                                )}
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

            {/* AUDIT LOGS TAB */}
            {activeTab === 'logs' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Platform Activity & Audit Logs</h3>
                  <p className="text-xs text-slate-500">Immutable trace of actions taken across the system</p>
                </div>

                <Card className="rounded-2xl border-slate-100 shadow-sm overflow-hidden bg-white">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          <th className="p-4">Action</th>
                          <th className="p-4">Actor</th>
                          <th className="p-4">Role</th>
                          <th className="p-4">Entity</th>
                          <th className="p-4">Date & Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {logsList.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-slate-400">
                              No activity logs found.
                            </td>
                          </tr>
                        ) : (
                          logsList.map((l) => (
                            <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-4 font-mono font-bold text-slate-800">{l.action}</td>
                              <td className="p-4 text-slate-700">{l.user?.fullName || 'System'}</td>
                              <td className="p-4 text-slate-500">{l.user?.role || 'SYSTEM'}</td>
                              <td className="p-4 text-slate-600">{l.entityType}</td>
                              <td className="p-4 text-slate-500">{new Date(l.createdAt).toLocaleString()}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}
          </>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}

export default function AdminDashboard() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <AdminDashboardContent />
    </Suspense>
  );
}
