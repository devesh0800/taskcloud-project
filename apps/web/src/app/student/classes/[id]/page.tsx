'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardSkeleton } from '@/components/dashboard/LoadingSkeleton';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/axios';
import {
  BookOpen,
  Users,
  FileText,
  ArrowLeft,
  Calendar,
  AlertCircle,
  GraduationCap,
  Clock,
  CheckCircle2,
} from 'lucide-react';

export default function StudentClassDetailPage() {
  const params = useParams();
  const classId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [classData, setClassData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStudentClass() {
      try {
        setLoading(true);
        const res = await api.get(`/classes/${classId}`);
        if (res.data.success) {
          setClassData(res.data.data);
        }
      } catch (err: any) {
        setError(err.response?.data?.error?.message || 'Failed to load class information.');
      } finally {
        setLoading(false);
      }
    }
    loadStudentClass();
  }, [classId]);

  return (
    <ProtectedRoute allowedRoles={['STUDENT', 'ADMIN']}>
      <DashboardLayout currentTab="classes" title="Course Classroom" showSearch={false}>
        {loading ? (
          <DashboardSkeleton />
        ) : error || !classData ? (
          <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700">
            <p className="font-semibold">{error || 'Class not found'}</p>
            <Link href="/student/classes" className="text-xs underline mt-2 block">
              Back to My Classes
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <Link
              href="/student/classes"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to My Classes
            </Link>

            {/* Course Header Banner */}
            <Card className="rounded-2xl border-slate-100 shadow-sm bg-white overflow-hidden">
              <div className="p-6 sm:p-8 bg-gradient-to-r from-[#172554] to-[#2563EB] text-white">
                <div className="space-y-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                    {classData.name}
                  </h1>
                  {classData.subject && (
                    <p className="text-sm font-semibold text-blue-200">{classData.subject}</p>
                  )}
                  <p className="text-xs text-blue-100/90 max-w-2xl">
                    {classData.description || 'Welcome to the classroom.'}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-blue-200/90 pt-3">
                    <span>
                      Faculty Instructor: <strong>{classData.teacher?.fullName || 'Teacher'}</strong>
                    </span>
                    {classData.department && (
                      <span>
                        Dept: <strong>{classData.department}</strong>
                      </span>
                    )}
                    {classData.semester && (
                      <span>
                        Semester: <strong>{classData.semester}</strong>
                      </span>
                    )}
                    {classData.section && (
                      <span>
                        Section: <strong>{classData.section}</strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center gap-6 text-xs text-slate-600">
                <span className="font-semibold flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-600" />
                  <strong>{classData.totalStudents}</strong> Enrolled Classmates
                </span>
                <span className="font-semibold flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <strong>{classData.totalAssignments}</strong> Course Assignments
                </span>
              </div>
            </Card>

            {/* 2 Columns: Assignments & Classmates */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Coursework List */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="rounded-2xl border-slate-100 shadow-sm bg-white overflow-hidden">
                  <CardHeader className="p-5 border-b border-slate-100">
                    <CardTitle className="text-base font-bold text-slate-900">
                      Class Assignments ({classData.assignments?.length || 0})
                    </CardTitle>
                    <p className="text-xs text-slate-400">Published coursework and deadlines for this class</p>
                  </CardHeader>
                  <CardContent className="p-0">
                    {classData.assignments?.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs">
                        No assignments have been published for this class yet.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {classData.assignments.map((a: any) => (
                          <div
                            key={a.id}
                            className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50 transition-colors"
                          >
                            <div className="space-y-1">
                              <h4 className="text-sm font-bold text-slate-800">{a.title}</h4>
                              <p className="text-xs text-slate-500">
                                Due: {new Date(a.deadline).toLocaleDateString()} • {a.totalMarks} Total Marks
                              </p>
                            </div>
                            <Link href="/student/dashboard?tab=assignments">
                              <Button
                                size="sm"
                                className="bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl text-xs font-semibold"
                              >
                                View Task
                              </Button>
                            </Link>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Classmates Sidebar */}
              <div>
                <Card className="rounded-2xl border-slate-100 shadow-sm bg-white overflow-hidden">
                  <CardHeader className="p-5 border-b border-slate-100">
                    <CardTitle className="text-base font-bold text-slate-900">
                      Classmates ({classData.classmates?.length || 0})
                    </CardTitle>
                    <p className="text-xs text-slate-400">Students enrolled in this section</p>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                      {classData.classmates?.map((cm: any) => (
                        <div key={cm.id} className="p-3.5 flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                            {cm.fullName.charAt(0)}
                          </div>
                          <p className="text-xs font-semibold text-slate-800 truncate">
                            {cm.fullName}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
