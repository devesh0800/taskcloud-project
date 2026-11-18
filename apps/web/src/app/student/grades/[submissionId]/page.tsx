'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardSkeleton } from '@/components/dashboard/LoadingSkeleton';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import {
  ArrowLeft,
  Award,
  Calendar,
  CheckCircle2,
  FileText,
  Download,
  AlertCircle,
  Sparkles,
  BookOpen,
  User,
  Paperclip,
  Clock,
} from 'lucide-react';

export default function StudentGradeDetailPage() {
  const params = useParams();
  const submissionId = params.submissionId as string;

  const [loading, setLoading] = useState(true);
  const [grade, setGrade] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGradeDetails();
  }, [submissionId]);

  const fetchGradeDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/api/v1/grades/student/${submissionId}`);
      if (res.data.success) {
        setGrade(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load grade details.');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['STUDENT', 'ADMIN']}>
        <DashboardLayout currentTab="grades">
          <DashboardSkeleton />
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (error || !grade) {
    return (
      <ProtectedRoute allowedRoles={['STUDENT', 'ADMIN']}>
        <DashboardLayout currentTab="grades">
          <div className="max-w-xl mx-auto py-12 text-center">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Grade Details Unavailable</h2>
            <p className="text-slate-500 mb-6">{error || 'This evaluation is not yet published or was removed.'}</p>
            <Link href="/student/grades">
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to My Grades
              </Button>
            </Link>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['STUDENT', 'ADMIN']}>
      <DashboardLayout currentTab="grades" title="Grade Details" showSearch={false}>
        <div className="max-w-4xl mx-auto space-y-6 pb-12">
          {/* Back Navigation */}
          <Link
            href="/student/grades"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to My Grades
          </Link>

          {/* Hero Score Card */}
          <Card className="rounded-2xl border-slate-100 shadow-md bg-gradient-to-r from-[#172554] via-[#1E3A8A] to-[#2563EB] text-white p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="space-y-2">
                <span className="text-xs font-bold text-blue-200 uppercase tracking-wider">
                  {grade.className} &bull; {grade.subject || 'Coursework'}
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{grade.assignmentTitle}</h1>
                <p className="text-xs text-blue-100">
                  Evaluated by: {grade.teacherName} &bull; {new Date(grade.evaluatedAt).toLocaleDateString()}
                </p>
              </div>

              {/* Big Score Block */}
              <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/20 shrink-0">
                <div className="text-right">
                  <p className="text-3xl sm:text-4xl font-black">{grade.marksObtained}</p>
                  <p className="text-xs text-blue-200 font-bold uppercase tracking-wider">out of {grade.maxMarks}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-white text-blue-900 font-black text-2xl flex items-center justify-center shadow-lg">
                  {grade.grade}
                </div>
              </div>
            </div>

            {/* Score Progress Bar */}
            <div className="mt-6 pt-6 border-t border-white/10">
              <div className="flex justify-between text-xs font-semibold text-blue-100 mb-1.5">
                <span>Calculated Percentage</span>
                <span>{grade.percentage}%</span>
              </div>
              <div className="w-full h-2.5 bg-black/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, grade.percentage))}%` }}
                />
              </div>
            </div>
          </Card>

          {/* Teacher Feedback Card */}
          {grade.feedback && (
            <Card className="border-slate-200/80 shadow-sm bg-purple-50/40 p-6 border-l-4 border-l-purple-600">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Instructor Qualitative Feedback</h3>
                  <p className="text-xs text-slate-700 leading-relaxed italic mt-1.5 whitespace-pre-wrap font-sans">
                    "{grade.feedback}"
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Submission Details */}
          <Card className="border-slate-200/80 shadow-sm bg-white overflow-hidden">
            <CardHeader className="p-5 border-b border-slate-100 bg-slate-50/75">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" /> Your Submitted Work (Attempt #{grade.attemptNumber})
                </CardTitle>
                <span className="text-xs text-slate-400">
                  Submitted: {new Date(grade.submittedAt).toLocaleString()}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {/* Written Answer */}
              {grade.answerText && (
                <div>
                  <p className="text-xs font-bold text-slate-700 mb-1.5">Written Solution:</p>
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {grade.answerText}
                  </div>
                </div>
              )}

              {/* Files */}
              {grade.files && grade.files.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-700 mb-1.5">Submitted Files ({grade.files.length}):</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {grade.files.map((file: any) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                            <FileText className="w-3.5 h-3.5" />
                          </div>
                          <div className="truncate">
                            <p className="text-xs font-bold text-slate-800 truncate">{file.originalName}</p>
                            <p className="text-[10px] text-slate-400">{formatFileSize(file.fileSize)}</p>
                          </div>
                        </div>
                        <a
                          href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'}/submissions/files/${file.id}/download`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Button size="sm" variant="outline" className="h-7 text-[11px] font-bold text-blue-600">
                            <Download className="w-3 h-3 mr-1" /> Download
                          </Button>
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
