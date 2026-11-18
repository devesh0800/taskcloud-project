'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardSkeleton } from '@/components/dashboard/LoadingSkeleton';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/axios';
import {
  Users,
  ArrowLeft,
  Search,
  UserX,
  Mail,
  GraduationCap,
  Calendar,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export default function TeacherClassStudentsPage() {
  const params = useParams();
  const classId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchStudents = async (query = searchQuery) => {
    try {
      setLoading(true);
      const res = await api.get(`/classes/${classId}/students`, {
        params: { search: query },
      });
      if (res.data.success) {
        setStudents(res.data.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch students:', err);
      setFeedback({
        type: 'error',
        message: err.response?.data?.error?.message || 'Failed to fetch student roster.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [classId]);

  const handleRemoveStudent = async (student: any) => {
    const confirmed = confirm(
      `Are you sure you want to remove "${student.fullName}" from this class? Historical submissions and grades will remain preserved in the system.`
    );
    if (!confirmed) return;

    try {
      setRemovingId(student.id);
      const res = await api.delete(`/classes/${classId}/students/${student.id}`);
      if (res.data.success) {
        setStudents((prev) => prev.filter((s) => s.id !== student.id));
        setFeedback({
          type: 'success',
          message: `${student.fullName} was removed from the class.`,
        });
        setTimeout(() => setFeedback(null), 3000);
      }
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to remove student.');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['TEACHER', 'ADMIN']}>
      <DashboardLayout
        currentTab="classes"
        title="Student Roster Management"
        searchValue={searchQuery}
        onSearchChange={(val) => {
          setSearchQuery(val);
          fetchStudents(val);
        }}
      >
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <Link
              href={`/teacher/classes/${classId}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Class Details
            </Link>
            <div className="text-right">
              <span className="text-xs font-bold text-slate-800">
                {students.length} Active Student{students.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {feedback && (
            <div
              className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-rose-50 border-rose-200 text-rose-700'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              {feedback.message}
            </div>
          )}

          <Card className="rounded-2xl border-slate-100 shadow-sm overflow-hidden bg-white">
            <CardHeader className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Enrolled Students Directory
                </CardTitle>
                <p className="text-xs text-slate-400">
                  Manage student memberships. Removing a student revokes access while safely retaining historical grades.
                </p>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {loading ? (
                <DashboardSkeleton />
              ) : students.length === 0 ? (
                <div className="p-8">
                  <EmptyState
                    icon={Users}
                    title={searchQuery ? 'No Matching Students' : 'No Students Enrolled'}
                    description={
                      searchQuery
                        ? 'Try searching with another name, email, or student ID.'
                        : 'Students will appear here once they join using the class code.'
                    }
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="p-4">Student</th>
                        <th className="p-4">Student ID</th>
                        <th className="p-4">Course / Program</th>
                        <th className="p-4">Semester & Section</th>
                        <th className="p-4">Enrolled Date</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {students.map((st) => (
                        <tr key={st.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                                {st.fullName.charAt(0)}
                              </div>
                              <div>
                                <p className="font-bold text-slate-800">{st.fullName}</p>
                                <p className="text-[11px] text-slate-400">{st.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 font-mono text-slate-600">
                            {st.studentId || '—'}
                          </td>
                          <td className="p-4 text-slate-600">{st.course || '—'}</td>
                          <td className="p-4 text-slate-600">
                            {[st.semester, st.section].filter(Boolean).join(' - ') || '—'}
                          </td>
                          <td className="p-4 text-slate-500">
                            {new Date(st.joinedAt).toLocaleDateString()}
                          </td>
                          <td className="p-4 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={removingId === st.id}
                              onClick={() => handleRemoveStudent(st)}
                              className="text-xs h-7 px-2.5 text-rose-600 border-rose-200 hover:bg-rose-50 rounded-lg gap-1 font-semibold"
                            >
                              <UserX className="w-3.5 h-3.5" />
                              {removingId === st.id ? 'Removing...' : 'Remove'}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
