'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { DashboardSkeleton } from '@/components/dashboard/LoadingSkeleton';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/axios';
import {
  FileText,
  Clock,
  Calendar,
  Users,
  Paperclip,
  Download,
  Edit3,
  Trash2,
  Lock,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Inbox,
} from 'lucide-react';

export default function TeacherAssignmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const assignmentId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [assignment, setAssignment] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchAssignment = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/assignments/${assignmentId}`);
      if (res.data.success) {
        setAssignment(res.data.data);
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.error?.message || 'Failed to load assignment.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignment();
  }, [assignmentId]);

  const handlePublish = async () => {
    if (!confirm('Publish this assignment? It will become immediately visible to all enrolled students.')) {
      return;
    }

    try {
      setActionLoading(true);
      const res = await api.post(`/assignments/${assignmentId}/publish`);
      if (res.data.success) {
        setAssignment((prev: any) => ({ ...prev, status: 'PUBLISHED', publishedAt: new Date() }));
        setFeedback({ type: 'success', message: 'Assignment published to students!' });
      }
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to publish assignment.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClose = async () => {
    if (!confirm('Close this assignment? Students will no longer be able to submit their work.')) {
      return;
    }

    try {
      setActionLoading(true);
      const res = await api.post(`/assignments/${assignmentId}/close`);
      if (res.data.success) {
        setAssignment((prev: any) => ({ ...prev, status: 'CLOSED' }));
        setFeedback({ type: 'success', message: 'Assignment closed successfully.' });
      }
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to close assignment.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this assignment? This action cannot be undone.')) {
      return;
    }

    try {
      setActionLoading(true);
      const res = await api.delete(`/assignments/${assignmentId}`);
      if (res.data.success) {
        router.push('/teacher/assignments');
      }
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to delete assignment.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadAttachment = (attachmentId: string, filename: string) => {
    const downloadUrl = `${api.defaults.baseURL}/assignments/${assignmentId}/attachments/${attachmentId}/download`;
    window.open(downloadUrl, '_blank');
  };

  return (
    <ProtectedRoute allowedRoles={['TEACHER', 'ADMIN']}>
      <DashboardLayout currentTab="assignments" title="Assignment Details" showSearch={false}>
        {loading ? (
          <DashboardSkeleton />
        ) : !assignment ? (
          <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700">
            <p className="font-semibold">{feedback?.message || 'Assignment not found'}</p>
            <Link href="/teacher/assignments" className="text-xs underline mt-2 block">
              Back to Assignments
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Top Action Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <Link
                href="/teacher/assignments"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Assignments
              </Link>

              <div className="flex items-center gap-2 flex-wrap">
                {assignment.status === 'DRAFT' && (
                  <Button
                    size="sm"
                    disabled={actionLoading}
                    onClick={handlePublish}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-xl font-bold gap-1.5 shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Publish to Students
                  </Button>
                )}

                {assignment.status === 'PUBLISHED' && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actionLoading}
                    onClick={handleClose}
                    className="text-xs rounded-xl font-semibold gap-1.5 text-amber-700 border-amber-300 hover:bg-amber-50"
                  >
                    <Lock className="w-3.5 h-3.5" /> Close Submissions
                  </Button>
                )}

                <Link href={`/teacher/assignments/${assignmentId}/edit`}>
                  <Button variant="outline" size="sm" className="text-xs rounded-xl font-semibold gap-1.5">
                    <Edit3 className="w-3.5 h-3.5" /> Edit Assignment
                  </Button>
                </Link>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={actionLoading || assignment.submissions?.length > 0}
                  onClick={handleDelete}
                  className="text-xs rounded-xl font-semibold text-rose-600 border-rose-200 hover:bg-rose-50 gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </Button>
              </div>
            </div>

            {feedback && (
              <div
                className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
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

            {/* Assignment Hero Card */}
            <Card className="rounded-2xl border-slate-100 shadow-sm bg-white overflow-hidden">
              <div className="p-6 sm:p-8 bg-gradient-to-r from-[#172554] via-[#1E3A8A] to-[#2563EB] text-white">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                        {assignment.title}
                      </h1>
                      <StatusBadge status={assignment.status} />
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-blue-200 font-medium pt-1">
                      <span>
                        Class: <strong>{assignment.class?.name}</strong> ({assignment.class?.classCode})
                      </span>
                      {assignment.subject && (
                        <span>
                          Subject: <strong>{assignment.subject}</strong>
                        </span>
                      )}
                      <span>
                        Max Marks: <strong>{assignment.totalMarks}</strong>
                      </span>
                    </div>

                    {assignment.description && (
                      <p className="text-xs text-blue-100/90 max-w-2xl pt-2">
                        {assignment.description}
                      </p>
                    )}
                  </div>

                  {/* Deadline Box */}
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl flex flex-col items-center justify-center text-center shrink-0 min-w-[200px]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200 mb-0.5">
                      Deadline
                    </span>
                    <p className="font-bold text-sm text-white">
                      {new Date(assignment.deadline).toLocaleDateString()}
                    </p>
                    <p className="text-[11px] text-blue-100 font-mono mt-0.5">
                      {new Date(assignment.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Configuration Strip */}
              <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600">
                <div className="flex items-center gap-6 flex-wrap">
                  <span>
                    Late Submission: <strong>{assignment.allowLateSubmission ? 'Allowed' : 'Disallowed'}</strong>
                  </span>
                  <span>
                    Resubmission: <strong>{assignment.allowResubmission ? 'Allowed' : 'Single Submission'}</strong>
                  </span>
                  <span>
                    Max Attempts: <strong>{assignment.maxAttempts || 1}</strong>
                  </span>
                </div>
                <div>
                  Submissions Received: <strong>{assignment.submissions?.length || 0}</strong>
                </div>
              </div>
            </Card>

            {/* 2-Column Section: Instructions & Attachments */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Detailed Instructions (2 Cols) */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="rounded-2xl border-slate-100 shadow-sm bg-white p-6 space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-slate-500">
                    Instructions & Requirements
                  </h3>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {assignment.instructions}
                  </div>
                </Card>

                {/* Submissions List Preview */}
                <Card className="rounded-2xl border-slate-100 shadow-sm bg-white overflow-hidden">
                  <CardHeader className="p-5 border-b border-slate-100 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold text-slate-900">
                        Student Submissions ({assignment.submissions?.length || 0})
                      </CardTitle>
                      <p className="text-xs text-slate-400">Turned-in work from enrolled students</p>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {assignment.submissions?.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs">
                        No student submissions received yet.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {assignment.submissions.map((sub: any) => (
                          <div key={sub.id} className="p-4 flex items-center justify-between hover:bg-slate-50 text-xs">
                            <div>
                              <p className="font-bold text-slate-800">{sub.student?.fullName}</p>
                              <p className="text-[10px] text-slate-400">
                                Submitted {new Date(sub.submittedAt).toLocaleString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <StatusBadge status={sub.status} />
                              <span className="font-bold text-slate-700">
                                {sub.grades?.[0]?.marks !== undefined
                                  ? `${sub.grades[0].marks} / ${assignment.totalMarks}`
                                  : 'Ungraded'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Reference Attachments (1 Col) */}
              <div className="space-y-6">
                <Card className="rounded-2xl border-slate-100 shadow-sm bg-white overflow-hidden">
                  <CardHeader className="p-5 border-b border-slate-100">
                    <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                      <Paperclip className="w-4 h-4 text-blue-600" /> Reference Attachments
                    </CardTitle>
                    <p className="text-xs text-slate-400">Documents provided for this task</p>
                  </CardHeader>
                  <CardContent className="p-5 space-y-3">
                    {assignment.attachments?.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4">
                        No reference attachments added.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {assignment.attachments.map((att: any) => (
                          <div
                            key={att.id}
                            className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between text-xs hover:border-blue-200 transition-colors"
                          >
                            <div className="space-y-0.5 truncate pr-2">
                              <p className="font-semibold text-slate-800 truncate">{att.originalName}</p>
                              <p className="text-[10px] text-slate-400">
                                {(att.fileSize / (1024 * 1024)).toFixed(2)} MB
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownloadAttachment(att.id, att.originalName)}
                              className="h-7 px-2 text-xs rounded-lg text-blue-600 hover:bg-blue-50 border-blue-200 shrink-0 gap-1"
                            >
                              <Download className="w-3 h-3" /> Get
                            </Button>
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
