'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  FileText,
  Upload,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowLeft,
  X,
  File,
  FileCheck,
  Calendar,
  Award,
  Sparkles,
  HelpCircle,
  Download,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import api from '@/lib/api';

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.txt', '.jpg', '.jpeg', '.png'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function StudentAssignmentSubmitPage() {
  const params = useParams();
  const router = useRouter();
  const assignmentId = params.id as string;

  const [assignment, setAssignment] = useState<any>(null);
  const [existingSubmission, setExistingSubmission] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form State
  const [answerText, setAnswerText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAssignmentAndSubmission();
  }, [assignmentId]);

  const fetchAssignmentAndSubmission = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch assignment details
      const assignRes = await api.get(`/api/v1/assignments/student/${assignmentId}`);
      if (assignRes.data.success) {
        setAssignment(assignRes.data.data);
      }

      // 2. Fetch existing submission if any
      try {
        const subRes = await api.get(`/api/v1/submissions/assignment/${assignmentId}`);
        if (subRes.data.success && subRes.data.data) {
          setExistingSubmission(subRes.data.data);
          if (subRes.data.data.answerText) {
            setAnswerText(subRes.data.data.answerText);
          }
        }
      } catch (subErr) {
        // No existing submission, normal
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load assignment details.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(Array.from(e.target.files));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const processFiles = (files: File[]) => {
    const validFiles: File[] = [];
    const errors: string[] = [];

    files.forEach((file) => {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        errors.push(`${file.name}: Unsupported file format. Allowed: PDF, DOC, DOCX, PPT, PPTX, TXT, JPG, PNG.`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: Exceeds maximum 10MB file size limit.`);
        return;
      }
      validFiles.push(file);
    });

    setFileErrors(errors);
    setSelectedFiles((prev) => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFileErrors([]);

    if (!answerText.trim() && selectedFiles.length === 0) {
      setError('Please provide either a written answer or upload at least one file before submitting.');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('assignmentId', assignmentId);
      if (answerText.trim()) {
        formData.append('answerText', answerText.trim());
      }

      selectedFiles.forEach((file) => {
        formData.append('files', file);
      });

      const res = await api.post('/api/v1/submissions', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push(`/student/assignments/${assignmentId}`);
        }, 1500);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to submit assignment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['STUDENT']}>
        <DashboardLayout currentTab="assignments">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-500 font-medium">Loading submission workspace...</p>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (!assignment) {
    return (
      <ProtectedRoute allowedRoles={['STUDENT']}>
        <DashboardLayout currentTab="assignments">
          <div className="max-w-2xl mx-auto py-12 text-center">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Assignment Not Found</h2>
            <p className="text-slate-500 mb-6">{error || 'This assignment is unavailable or has not been published.'}</p>
            <Link href="/student/assignments">
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Assignments
              </Button>
            </Link>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  const isOverdue = new Date() > new Date(assignment.deadline);
  const nextAttemptNumber = existingSubmission ? existingSubmission.attemptNumber + 1 : 1;

  return (
    <ProtectedRoute allowedRoles={['STUDENT']}>
      <DashboardLayout currentTab="assignments">
        <div className="max-w-4xl mx-auto space-y-6 pb-12">
          {/* Header Navigation */}
          <div className="flex items-center justify-between">
            <Link
              href={`/student/assignments/${assignmentId}`}
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Assignment Overview
            </Link>
            <div className="flex items-center gap-2">
              {existingSubmission ? (
                <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                  <RotateCcw className="w-3 h-3 mr-1" /> Resubmission Attempt #{nextAttemptNumber}
                </Badge>
              ) : (
                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                  First Submission
                </Badge>
              )}
              {isOverdue && (
                <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                  <Clock className="w-3 h-3 mr-1" /> Late Submission
                </Badge>
              )}
            </div>
          </div>

          {/* Success Banner */}
          {success && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold text-sm">Assignment Submitted Successfully!</p>
                <p className="text-xs text-emerald-600">Redirecting to your assignment details page...</p>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-800 animate-in fade-in">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Assignment Brief Card */}
          <Card className="border-slate-200/80 shadow-sm bg-gradient-to-r from-blue-50/50 via-white to-purple-50/30">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                  {assignment.class?.name || 'Class Assignment'}
                </span>
                <span className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Due: {new Date(assignment.deadline).toLocaleString()}
                </span>
              </div>
              <CardTitle className="text-xl font-extrabold text-slate-900 mt-1">
                {assignment.title}
              </CardTitle>
              <CardDescription className="text-xs text-slate-600">
                Instructor: {assignment.teacher?.fullName || 'Teacher'} &bull; Max Score: {assignment.totalMarks} points
              </CardDescription>
            </CardHeader>
            {assignment.instructions && (
              <CardContent className="pt-0 text-xs text-slate-600 border-t border-slate-100 mt-2 py-3 bg-white/60 rounded-b-xl">
                <p className="font-semibold text-slate-800 mb-1">Instructions:</p>
                <p className="whitespace-pre-line leading-relaxed">{assignment.instructions}</p>
              </CardContent>
            )}
          </Card>

          {/* Submission Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Section A: Text-Based Submission */}
            <Card className="border-slate-200/80 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900">
                      Method A: Written Answer
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Type or paste your text response or markdown notes below.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <textarea
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  placeholder="Write your detailed solution, answer text, references or notes here..."
                  rows={8}
                  className="w-full p-3.5 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono leading-relaxed"
                />
                <div className="flex justify-between items-center text-[11px] text-slate-400">
                  <span>Formatting supported: Plain text & Markdown</span>
                  <span>{answerText.length} characters</span>
                </div>
              </CardContent>
            </Card>

            {/* Section B: File-Based Submission */}
            <Card className="border-slate-200/80 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900">
                      Method B: File Attachments
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Upload documents, PDF, code snapshots or slides (Max 10 MB per file).
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Drag and Drop Zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-150 ${
                    isDragOver
                      ? 'border-blue-500 bg-blue-50/50'
                      : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50/50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-slate-800 mb-1">
                    Click to browse or drag & drop files here
                  </p>
                  <p className="text-xs text-slate-400">
                    Supported: PDF, DOC, DOCX, PPT, PPTX, TXT, JPG, PNG &bull; Max 10MB each
                  </p>
                </div>

                {/* Validation Errors */}
                {fileErrors.length > 0 && (
                  <div className="space-y-1">
                    {fileErrors.map((err, i) => (
                      <p key={i} className="text-xs text-rose-600 flex items-center gap-1 font-medium">
                        <AlertTriangle className="w-3.5 h-3.5" /> {err}
                      </p>
                    ))}
                  </div>
                )}

                {/* Selected Files List */}
                {selectedFiles.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <Label className="text-xs font-semibold text-slate-700">
                      Files Ready for Upload ({selectedFiles.length})
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedFiles.map((file, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                        >
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                              <FileCheck className="w-4 h-4" />
                            </div>
                            <div className="truncate">
                              <p className="text-xs font-semibold text-slate-800 truncate">{file.name}</p>
                              <p className="text-[10px] text-slate-400">{formatFileSize(file.size)}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFile(idx);
                            }}
                            className="text-slate-400 hover:text-rose-500 p-1 rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Submission Notice & Action Buttons */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-600">
                <p className="font-semibold text-slate-800">Ready to Submit?</p>
                <p className="text-slate-500">
                  {isOverdue
                    ? 'Your submission will be timestamped and flagged as LATE.'
                    : 'Your files and written solutions will be recorded in Neon PostgreSQL.'}
                </p>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Link href={`/student/assignments/${assignmentId}`} className="w-full sm:w-auto">
                  <Button type="button" variant="outline" className="w-full">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  disabled={submitting || success}
                  className="w-full sm:w-auto bg-[#2563EB] hover:bg-blue-700 text-white font-bold px-6 shadow-md shadow-blue-500/20"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      {existingSubmission ? `Confirm Resubmission (#${nextAttemptNumber})` : 'Submit Assignment'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
