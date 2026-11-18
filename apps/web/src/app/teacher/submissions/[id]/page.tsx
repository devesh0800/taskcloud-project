'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardSkeleton } from '@/components/dashboard/LoadingSkeleton';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/lib/api';
import {
  ArrowLeft,
  User,
  Calendar,
  Clock,
  FileText,
  Download,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  BookOpen,
  Sparkles,
  Paperclip,
  History,
  AlertTriangle,
  Award,
  CheckCheck,
} from 'lucide-react';

export default function TeacherSubmissionReviewPage() {
  const params = useParams();
  const router = useRouter();
  const submissionId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Resubmission modal state
  const [showResubmitModal, setShowResubmitModal] = useState(false);
  const [resubmitNote, setResubmitNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchSubmissionDetails();
  }, [submissionId]);

  const fetchSubmissionDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/api/v1/submissions/teacher/${submissionId}`);
      if (res.data.success) {
        setSubmission(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load submission details.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    try {
      setActionLoading(true);
      const res = await api.patch(`/api/v1/submissions/${submissionId}/status`, { status });
      if (res.data.success) {
        setActionSuccess(`Submission status updated to ${status}.`);
        fetchSubmissionDetails();
        setTimeout(() => setActionSuccess(null), 3000);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to update status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestResubmission = async () => {
    try {
      setActionLoading(true);
      const res = await api.post(`/api/v1/submissions/${submissionId}/request-resubmission`, {
        note: resubmitNote.trim(),
      });
      if (res.data.success) {
        setShowResubmitModal(false);
        setResubmitNote('');
        setActionSuccess('Resubmission requested successfully. Student has been notified.');
        fetchSubmissionDetails();
        setTimeout(() => setActionSuccess(null), 4000);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to request resubmission.');
    } finally {
      setActionLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['TEACHER', 'ADMIN']}>
        <DashboardLayout currentTab="submissions">
          <DashboardSkeleton />
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (error || !submission) {
    return (
      <ProtectedRoute allowedRoles={['TEACHER', 'ADMIN']}>
        <DashboardLayout currentTab="submissions">
          <div className="max-w-xl mx-auto py-12 text-center">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Submission Not Found</h2>
            <p className="text-slate-500 mb-6">{error || 'Unable to retrieve submission details.'}</p>
            <Link href="/teacher/submissions">
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Submissions
              </Button>
            </Link>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  const isOverdue = new Date(submission.submittedAt) > new Date(submission.assignment.deadline);

  return (
    <ProtectedRoute allowedRoles={['TEACHER', 'ADMIN']}>
      <DashboardLayout currentTab="submissions" title="Review Submission" showSearch={false}>
        <div className="max-w-5xl mx-auto space-y-6 pb-12">
          {/* Back link & Top Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <Link
              href="/teacher/submissions"
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to All Submissions
            </Link>

            <div className="flex items-center gap-2.5 flex-wrap">
              {submission.status !== 'UNDER_REVIEW' && submission.status !== 'EVALUATED' && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={actionLoading}
                  onClick={() => handleUpdateStatus('UNDER_REVIEW')}
                  className="text-xs h-8 rounded-xl font-semibold border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100"
                >
                  <Clock className="w-3.5 h-3.5 mr-1.5" /> Start Review
                </Button>
              )}

              {submission.status !== 'RESUBMISSION_REQUIRED' && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={actionLoading}
                  onClick={() => setShowResubmitModal(true)}
                  className="text-xs h-8 rounded-xl font-semibold border-purple-300 text-purple-700 bg-purple-50 hover:bg-purple-100"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Request Resubmission
                </Button>
              )}
            </div>
          </div>

          {/* Success Banner */}
          {actionSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <p className="text-sm font-semibold">{actionSuccess}</p>
            </div>
          )}

          {/* Top Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Student Info Card */}
            <Card className="border-slate-200/80 shadow-sm bg-white p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 font-bold text-lg flex items-center justify-center shrink-0 uppercase">
                  {submission.student.fullName.slice(0, 2)}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">{submission.student.fullName}</h3>
                  <p className="text-xs text-slate-500">{submission.student.email}</p>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-400">Student Roll / ID:</span>
                  <span className="font-semibold text-slate-800">{submission.student.studentId || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Class & Section:</span>
                  <span className="font-semibold text-slate-800">
                    {submission.student.semester || 'Semester'} - {submission.student.section || 'A'}
                  </span>
                </div>
              </div>
            </Card>

            {/* Assignment Context Card */}
            <Card className="border-slate-200/80 shadow-sm bg-white p-5 md:col-span-2">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                <div>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 font-mono text-[10px] mb-1">
                    {submission.assignment.class.name} ({submission.assignment.class.classCode})
                  </Badge>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight">
                    {submission.assignment.title}
                  </h2>
                </div>
                <StatusBadge status={submission.status} />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-xs">
                <div>
                  <p className="text-slate-400">Deadline</p>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {new Date(submission.assignment.deadline).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Submitted At</p>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {new Date(submission.submittedAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Attempt Count</p>
                  <p className="font-semibold text-purple-700 mt-0.5">
                    Attempt #{submission.attemptNumber}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Submission Work Section */}
          <div className="space-y-6">
            {/* Method A: Written Answer */}
            <Card className="border-slate-200/80 shadow-sm bg-white overflow-hidden">
              <CardHeader className="bg-slate-50/75 border-b border-slate-100 py-3.5 px-5">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" /> Student's Written Response
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                {submission.answerText ? (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70 font-mono text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {submission.answerText}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No written text answer provided for this attempt.</p>
                )}
              </CardContent>
            </Card>

            {/* Method B: Uploaded Files */}
            <Card className="border-slate-200/80 shadow-sm bg-white overflow-hidden">
              <CardHeader className="bg-slate-50/75 border-b border-slate-100 py-3.5 px-5">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-purple-600" /> Uploaded Files ({submission.files?.length || 0})
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Secure local server files uploaded by the student. Click to download.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5">
                {submission.files && submission.files.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {submission.files.map((file: any) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-blue-300 transition-colors"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="truncate">
                            <p className="text-xs font-bold text-slate-800 truncate">{file.originalName}</p>
                            <p className="text-[10px] text-slate-400">
                              {formatFileSize(file.fileSize)} &bull; {new Date(file.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <a
                          href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'}/submissions/files/${file.id}/download`}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0"
                        >
                          <Button size="sm" variant="outline" className="h-8 text-xs font-bold rounded-lg text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                            <Download className="w-3.5 h-3.5 mr-1" /> Download
                          </Button>
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No files attached to this submission.</p>
                )}
              </CardContent>
            </Card>

            {/* Version History (Attempts) */}
            {submission.attempts && submission.attempts.length > 1 && (
              <Card className="border-slate-200/80 shadow-sm bg-white overflow-hidden">
                <CardHeader className="bg-slate-50/75 border-b border-slate-100 py-3.5 px-5">
                  <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <History className="w-4 h-4 text-purple-600" /> Version History ({submission.attempts.length} Attempts)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  {submission.attempts.map((att: any) => (
                    <div
                      key={att.id}
                      className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">
                          Attempt #{att.attemptNumber}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(att.submittedAt).toLocaleString()}
                        </span>
                      </div>
                      {att.answerText && (
                        <p className="text-slate-600 italic bg-white p-2.5 rounded-lg border border-slate-100 font-mono">
                          {att.answerText}
                        </p>
                      )}
                      {att.files && att.files.length > 0 && (
                        <p className="text-[11px] text-blue-600 font-medium">
                          {att.files.length} {att.files.length === 1 ? 'file' : 'files'} uploaded in this attempt.
                        </p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Request Resubmission Modal */}
          {showResubmitModal && (
            <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                    <RotateCcw className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Request Resubmission</h3>
                    <p className="text-xs text-slate-500">Provide instructions or feedback to the student.</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Resubmission Instructions / Note</Label>
                  <textarea
                    value={resubmitNote}
                    onChange={(e) => setResubmitNote(e.target.value)}
                    placeholder="e.g. Please re-check question 3 calculations and re-upload the updated PDF."
                    rows={4}
                    className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 font-sans leading-relaxed"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowResubmitModal(false)}
                    className="text-xs h-9 rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    disabled={actionLoading}
                    onClick={handleRequestResubmission}
                    className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-9 rounded-xl font-bold shadow-md shadow-purple-500/20"
                  >
                    {actionLoading ? 'Sending...' : 'Send Request'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
