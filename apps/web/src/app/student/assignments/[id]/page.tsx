'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardSkeleton } from '@/components/dashboard/LoadingSkeleton';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
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
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Award,
  Upload,
  Lock,
} from 'lucide-react';

export default function StudentAssignmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const assignmentId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [assignment, setAssignment] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDetails() {
      try {
        setLoading(true);
        const res = await api.get(`/assignments/student/${assignmentId}`);
        if (res.data.success) {
          setAssignment(res.data.data);
        }
      } catch (err: any) {
        setError(err.response?.data?.error?.message || 'Failed to load assignment details.');
      } finally {
        setLoading(false);
      }
    }
    fetchDetails();
  }, [assignmentId]);

  const handleDownloadAttachment = (attachmentId: string, filename: string) => {
    const downloadUrl = `${api.defaults.baseURL}/assignments/${assignmentId}/attachments/${attachmentId}/download`;
    window.open(downloadUrl, '_blank');
  };

  return (
    <ProtectedRoute allowedRoles={['STUDENT', 'ADMIN']}>
      <DashboardLayout currentTab="assignments" title="Assignment Details" showSearch={false}>
        {loading ? (
          <DashboardSkeleton />
        ) : error || !assignment ? (
          <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700">
            <p className="font-semibold">{error || 'Assignment not found'}</p>
            <Link href="/student/assignments" className="text-xs underline mt-2 block">
              Back to Assignments
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <Link
              href="/student/assignments"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to My Assignments
            </Link>

            {/* Assignment Hero Card */}
            <Card className="rounded-2xl border-slate-100 shadow-sm bg-white overflow-hidden">
              <div className="p-6 sm:p-8 bg-gradient-to-r from-[#172554] via-[#1E3A8A] to-[#2563EB] text-white">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                        {assignment.title}
                      </h1>
                      {assignment.isSubmitted ? (
                        <Badge className="bg-emerald-500 text-white font-bold text-xs">
                          Submitted
                        </Badge>
                      ) : assignment.isOverdue ? (
                        <Badge className="bg-rose-500 text-white font-bold text-xs">
                          Overdue
                        </Badge>
                      ) : (
                        <Badge className="bg-blue-400 text-slate-950 font-bold text-xs">
                          Active
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-blue-200 font-medium pt-1">
                      <span>
                        Class: <strong>{assignment.class?.name}</strong>
                      </span>
                      <span>
                        Teacher: <strong>{assignment.teacher?.fullName}</strong>
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

              {/* Rules Strip */}
              <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600">
                <div className="flex items-center gap-6 flex-wrap">
                  <span>
                    Late Submissions: <strong>{assignment.allowLateSubmission ? 'Accepted' : 'Not Accepted'}</strong>
                  </span>
                  <span>
                    Resubmissions: <strong>{assignment.allowResubmission ? 'Allowed' : 'Not Allowed'}</strong>
                  </span>
                  <span>
                    Max Attempts: <strong>{assignment.maxAttempts || 1}</strong>
                  </span>
                </div>
                {assignment.passingMarks && (
                  <div>
                    Passing Marks: <strong>{assignment.passingMarks}</strong>
                  </div>
                )}
              </div>
            </Card>

            {/* 2-Column Section: Instructions & Attachments/Submissions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Instructions Column (2 Cols) */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="rounded-2xl border-slate-100 shadow-sm bg-white p-6 space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-slate-500">
                    Instructions & Guidelines
                  </h3>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {assignment.instructions}
                  </div>
                </Card>

                {/* Submission Status or Action Card */}
                {assignment.submission ? (
                  <Card className="rounded-2xl border-slate-100 shadow-sm bg-white p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Your Submission
                      </h3>
                      <StatusBadge status={assignment.submission.status} />
                    </div>

                    <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 text-xs space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Submitted At:</span>
                        <span className="font-semibold text-slate-800">
                          {new Date(assignment.submission.submittedAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Attempt:</span>
                        <span className="font-semibold text-slate-800">
                          Attempt #{assignment.submission.attemptNumber || 1}
                        </span>
                      </div>

                      {assignment.submission.answerText && (
                        <div className="pt-2 border-t border-emerald-100">
                          <p className="font-bold text-slate-700 mb-1">Your Written Answer:</p>
                          <p className="font-mono text-slate-800 whitespace-pre-wrap bg-white p-3 rounded-lg border border-emerald-100">
                            {assignment.submission.answerText}
                          </p>
                        </div>
                      )}

                      {/* Submitted Files */}
                      {assignment.submission.files && assignment.submission.files.length > 0 && (
                        <div className="pt-2 border-t border-emerald-100 space-y-2">
                          <p className="font-bold text-slate-700">Submitted Files ({assignment.submission.files.length}):</p>
                          <div className="space-y-1.5">
                            {assignment.submission.files.map((file: any) => (
                              <div
                                key={file.id}
                                className="flex items-center justify-between p-2 bg-white rounded-lg border border-emerald-100 text-xs"
                              >
                                <span className="font-medium text-slate-800 truncate max-w-[200px]">{file.originalName}</span>
                                <a
                                  href={`${api.defaults.baseURL || 'http://localhost:5000/api/v1'}/submissions/files/${file.id}/download`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                                >
                                  <Download className="w-3.5 h-3.5" /> Download
                                </a>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Grades & Feedback if Evaluated */}
                      {assignment.submission.grades?.length > 0 && (
                        <div className="mt-3 p-3 bg-white rounded-lg border border-emerald-200">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-emerald-800">Awarded Score:</span>
                            <span className="font-black text-sm text-emerald-700">
                              {assignment.submission.grades[0].marks} / {assignment.totalMarks} Marks
                            </span>
                          </div>
                          {assignment.submission.grades[0].feedback && (
                            <p className="text-[11px] text-slate-600 italic mt-1">
                              "{assignment.submission.grades[0].feedback}"
                            </p>
                          )}
                        </div>
                      )}

                      {/* Resubmit button if allowed or requested */}
                      {(assignment.allowResubmission || assignment.submission.status === 'RESUBMISSION_REQUIRED') &&
                        assignment.status !== 'CLOSED' && (
                          <div className="pt-3 border-t border-emerald-100 flex justify-end">
                            <Button
                              onClick={() => router.push(`/student/assignments/${assignment.id}/submit`)}
                              className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                            >
                              <Upload className="w-3.5 h-3.5 mr-1.5" /> Submit Updated Attempt
                            </Button>
                          </div>
                        )}
                    </div>
                  </Card>
                ) : (
                  <Card className="rounded-2xl border-slate-100 shadow-sm bg-white p-6 space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Upload className="w-4 h-4 text-blue-600" /> Submission Ready
                    </h3>
                    <p className="text-xs text-slate-600">
                      Carefully read all instructions above. When you are ready to upload files or submit text answers, click the submit button.
                    </p>

                    {assignment.status === 'CLOSED' ? (
                      <div className="p-3.5 bg-slate-100 rounded-xl text-xs text-slate-600 font-semibold flex items-center gap-2">
                        <Lock className="w-4 h-4" /> This assignment is closed. Submissions are no longer accepted.
                      </div>
                    ) : assignment.canSubmit ? (
                      <div className="pt-2">
                        <Button
                          onClick={() => router.push(`/student/assignments/${assignment.id}/submit`)}
                          className="bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl text-xs font-bold px-6 py-2.5 shadow-sm cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5 mr-2" /> Submit Your Work
                        </Button>
                      </div>
                    ) : (
                      <div className="p-3.5 bg-rose-50 text-rose-700 rounded-xl text-xs font-semibold">
                        Submissions are currently unavailable.
                      </div>
                    )}
                  </Card>
                )}
              </div>

              {/* Reference Attachments (1 Col) */}
              <div className="space-y-6">
                <Card className="rounded-2xl border-slate-100 shadow-sm bg-white overflow-hidden">
                  <CardHeader className="p-5 border-b border-slate-100">
                    <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                      <Paperclip className="w-4 h-4 text-blue-600" /> Reference Attachments
                    </CardTitle>
                    <p className="text-xs text-slate-400">Handouts and starter materials</p>
                  </CardHeader>
                  <CardContent className="p-5 space-y-3">
                    {assignment.attachments?.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4">
                        No reference attachments attached.
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
