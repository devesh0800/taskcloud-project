'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
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
  Copy,
  Check,
  RefreshCw,
  Edit3,
  Archive,
  ArrowLeft,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Plus,
} from 'lucide-react';

export default function TeacherClassDetailPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [classData, setClassData] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    async function loadClass() {
      try {
        setLoading(true);
        const res = await api.get(`/classes/${classId}`);
        if (res.data.success) {
          setClassData(res.data.data);
          setEditName(res.data.data.name);
          setEditDescription(res.data.data.description || '');
          setEditSubject(res.data.data.subject || '');
          setEditDepartment(res.data.data.department || '');
        }
      } catch (err: any) {
        setError(err.response?.data?.error?.message || 'Failed to load class details.');
      } finally {
        setLoading(false);
      }
    }
    loadClass();
  }, [classId]);

  const handleCopyCode = () => {
    if (!classData?.classCode) return;
    navigator.clipboard.writeText(classData.classCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerateCode = async () => {
    if (!confirm('Are you sure you want to regenerate the class code? The existing code will immediately stop working.')) {
      return;
    }

    try {
      setRegenerating(true);
      const res = await api.post(`/classes/${classId}/regenerate-code`);
      if (res.data.success) {
        setClassData((prev: any) => ({ ...prev, classCode: res.data.data.classCode }));
        setActionSuccess('New joining code generated successfully!');
        setTimeout(() => setActionSuccess(null), 3000);
      }
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to regenerate code.');
    } finally {
      setRegenerating(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingEdit(true);
      const res = await api.patch(`/classes/${classId}`, {
        name: editName,
        description: editDescription,
        subject: editSubject,
        department: editDepartment,
      });
      if (res.data.success) {
        setClassData((prev: any) => ({
          ...prev,
          name: editName,
          description: editDescription,
          subject: editSubject,
          department: editDepartment,
        }));
        setIsEditing(false);
        setActionSuccess('Class details updated successfully!');
        setTimeout(() => setActionSuccess(null), 3000);
      }
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to save changes.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleToggleArchive = async () => {
    const isArchived = !classData.isArchived;
    const confirmMsg = isArchived
      ? 'Archive this class? Students will no longer be able to enroll using the code.'
      : 'Unarchive this class?';

    if (!confirm(confirmMsg)) return;

    try {
      const res = await api.patch(`/classes/${classId}`, { isArchived });
      if (res.data.success) {
        setClassData((prev: any) => ({ ...prev, isArchived }));
        setActionSuccess(isArchived ? 'Class archived.' : 'Class reactivated.');
        setTimeout(() => setActionSuccess(null), 3000);
      }
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to update archive state.');
    }
  };

  return (
    <ProtectedRoute allowedRoles={['TEACHER', 'ADMIN']}>
      <DashboardLayout currentTab="classes" title="Class Details" showSearch={false}>
        {loading ? (
          <DashboardSkeleton />
        ) : error || !classData ? (
          <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700">
            <p className="font-semibold">{error || 'Class not found'}</p>
            <Link href="/teacher/classes" className="text-xs underline mt-2 block">
              Back to Classes
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Top Navigation & Feedback */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <Link
                href="/teacher/classes"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Classes
              </Link>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-xs rounded-xl font-semibold gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" /> {isEditing ? 'Cancel Edit' : 'Edit Details'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleArchive}
                  className={`text-xs rounded-xl font-semibold gap-1.5 ${
                    classData.isArchived
                      ? 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'
                      : 'text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Archive className="w-3.5 h-3.5" />
                  {classData.isArchived ? 'Unarchive Class' : 'Archive Class'}
                </Button>
              </div>
            </div>

            {actionSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> {actionSuccess}
              </div>
            )}

            {/* Class Hero Card */}
            <Card className="rounded-2xl border-slate-100 shadow-sm bg-white overflow-hidden">
              <div className="p-6 sm:p-8 bg-gradient-to-r from-[#172554] via-[#1E3A8A] to-[#2563EB] text-white">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                        {classData.name}
                      </h1>
                      {classData.isArchived && (
                        <Badge className="bg-amber-400 text-slate-950 font-bold text-xs uppercase">
                          Archived
                        </Badge>
                      )}
                    </div>
                    {classData.subject && (
                      <p className="text-sm font-semibold text-blue-200">{classData.subject}</p>
                    )}
                    <p className="text-xs text-blue-100/80 max-w-xl">
                      {classData.description || 'No description provided.'}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-blue-200/90 pt-2">
                      {classData.department && <span>Dept: <strong>{classData.department}</strong></span>}
                      {classData.semester && <span>Semester: <strong>{classData.semester}</strong></span>}
                      {classData.section && <span>Section: <strong>{classData.section}</strong></span>}
                      {classData.academicYear && <span>Year: <strong>{classData.academicYear}</strong></span>}
                    </div>
                  </div>

                  {/* Class Code Card */}
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 p-5 rounded-2xl flex flex-col items-center justify-center text-center shrink-0 min-w-[220px]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200 mb-1">
                      Student Joining Code
                    </span>
                    <p className="font-mono text-2xl font-black tracking-widest text-white mb-3">
                      {classData.classCode}
                    </p>
                    <div className="flex items-center gap-2 w-full">
                      <Button
                        size="sm"
                        onClick={handleCopyCode}
                        className="flex-1 bg-white hover:bg-blue-50 text-blue-900 rounded-xl text-xs font-bold gap-1 shadow-sm"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> Copy Code
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleRegenerateCode}
                        disabled={regenerating}
                        title="Regenerate joining code"
                        className="bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs px-2.5"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Navigation Strip */}
              <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-6">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-blue-600" />
                    <strong>{classData.totalStudents}</strong> Enrolled Students
                  </span>
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <strong>{classData.totalAssignments}</strong> Course Assignments
                  </span>
                </div>
                <Link
                  href={`/teacher/classes/${classId}/students`}
                  className="font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  Manage Students Roster →
                </Link>
              </div>
            </Card>

            {/* Edit Form if isEditing */}
            {isEditing && (
              <Card className="rounded-2xl border-blue-200 bg-blue-50/30 p-6 space-y-4">
                <h3 className="text-sm font-bold text-slate-900">Edit Class Information</h3>
                <form onSubmit={handleSaveEdit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Class Name</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        required
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Subject</label>
                      <input
                        type="text"
                        value={editSubject}
                        onChange={(e) => setEditSubject(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                    <textarea
                      rows={2}
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(false)}
                      className="text-xs rounded-xl"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={savingEdit}
                      className="bg-[#2563EB] text-white text-xs rounded-xl font-semibold"
                    >
                      {savingEdit ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            {/* 2-Column Section: Enrolled Students Preview & Class Assignments */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Enrolled Students Column */}
              <div className="lg:col-span-1 space-y-6">
                <Card className="rounded-2xl border-slate-100 shadow-sm bg-white overflow-hidden">
                  <CardHeader className="p-5 border-b border-slate-100 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold text-slate-900">
                        Enrolled Students ({classData.totalStudents})
                      </CardTitle>
                      <p className="text-xs text-slate-400">Class membership roster</p>
                    </div>
                    <Link
                      href={`/teacher/classes/${classId}/students`}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700"
                    >
                      View All
                    </Link>
                  </CardHeader>
                  <CardContent className="p-0">
                    {classData.enrolledStudents?.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 text-xs">
                        No students enrolled yet. Share code <strong>{classData.classCode}</strong> with your students!
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {classData.enrolledStudents.slice(0, 6).map((st: any) => (
                          <div key={st.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                            <div>
                              <p className="text-xs font-bold text-slate-800">{st.fullName}</p>
                              <p className="text-[11px] text-slate-400">{st.studentId || st.email}</p>
                            </div>
                            <span className="text-[10px] text-slate-400">
                              Joined {new Date(st.joinedAt).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Class Assignments Column */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="rounded-2xl border-slate-100 shadow-sm bg-white overflow-hidden">
                  <CardHeader className="p-5 border-b border-slate-100 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold text-slate-900">
                        Class Assignments ({classData.totalAssignments})
                      </CardTitle>
                      <p className="text-xs text-slate-400">Coursework assigned to this class section</p>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {classData.assignments?.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs">
                        No assignments created for this class yet.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {classData.assignments.map((a: any) => (
                          <div key={a.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                            <div className="space-y-0.5">
                              <h4 className="text-xs font-bold text-slate-800">{a.title}</h4>
                              <p className="text-[11px] text-slate-400">
                                Due {new Date(a.deadline).toLocaleDateString()} • {a.totalMarks} Marks
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-semibold text-slate-600">
                                {a.submissionsCount} Submissions
                              </span>
                              <Badge className="bg-slate-100 text-slate-700 text-[10px]">
                                {a.status}
                              </Badge>
                            </div>
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
      </DashboardLayout>
    </ProtectedRoute>
  );
}
