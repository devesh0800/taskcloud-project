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
  Award,
  CheckCircle2,
  Clock,
  RotateCcw,
  FileText,
  Download,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Paperclip,
  History,
  Send,
  Save,
  CheckCheck,
} from 'lucide-react';

export default function TeacherSubmissionEvaluationPage() {
  const params = useParams();
  const router = useRouter();
  const submissionId = params.submissionId as string;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Grading Form State
  const [marks, setMarks] = useState<string>('');
  const [suggestedGrade, setSuggestedGrade] = useState<string>('A');
  const [selectedGrade, setSelectedGrade] = useState<string>('A');
  const [isOverride, setIsOverride] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string>('');
  const [evaluationComments, setEvaluationComments] = useState<string>('');

  // Resubmission Modal State
  const [showResubmitModal, setShowResubmitModal] = useState(false);
  const [resubmitNote, setResubmitNote] = useState('');

  useEffect(() => {
    fetchSubmissionData();
  }, [submissionId]);

  const fetchSubmissionData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/api/v1/grades/submissions/${submissionId}`);
      if (res.data.success) {
        setData(res.data.data);
        const latest = res.data.data.latestGrade;
        if (latest) {
          setMarks(latest.marks.toString());
          setSelectedGrade(latest.grade || 'A');
          setFeedback(latest.feedback || '');
          setEvaluationComments(latest.evaluationComments || '');
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load submission data.');
    } finally {
      setLoading(false);
    }
  };

  // Helper: Grade calculation
  const calculateGradeFromPercentage = (percentage: number): string => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 40) return 'D';
    return 'F';
  };

  const handleMarksChange = (val: string) => {
    setMarks(val);
    const num = parseFloat(val);
    if (!isNaN(num) && data?.maxMarks) {
      const pct = (num / data.maxMarks) * 100;
      const autoGrade = calculateGradeFromPercentage(pct);
      setSuggestedGrade(autoGrade);
      if (!isOverride) {
        setSelectedGrade(autoGrade);
      }
    }
  };

  const handleSaveEvaluation = async (publish: boolean) => {
    setError(null);
    setSuccessMsg(null);

    const numericMarks = parseFloat(marks);
    if (isNaN(numericMarks) || numericMarks < 0) {
      setError('Please enter a valid non-negative score.');
      return;
    }

    if (data?.maxMarks && numericMarks > data.maxMarks) {
      setError(`Marks cannot exceed maximum assignment score of ${data.maxMarks}.`);
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        submissionId,
        marks: numericMarks,
        grade: selectedGrade,
        feedback: feedback.trim(),
        evaluationComments: evaluationComments.trim(),
        isPublished: publish,
      };

      const res = await api.post('/api/v1/grades', payload);
      if (res.data.success) {
        setSuccessMsg(
          publish
            ? 'Evaluation published successfully! Student has been notified.'
            : 'Evaluation draft saved successfully.'
        );
        fetchSubmissionData();
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to save evaluation.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestResubmission = async () => {
    try {
      setSubmitting(true);
      const res = await api.post(`/api/v1/grades/${submissionId}/request-resubmission`, {
        note: resubmitNote.trim(),
      });
      if (res.data.success) {
        setShowResubmitModal(false);
        setResubmitNote('');
        setSuccessMsg('Resubmission requested successfully. Student has been notified.');
        fetchSubmissionData();
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to request resubmission.');
    } finally {
      setSubmitting(false);
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
        <DashboardLayout currentTab="evaluations">
          <DashboardSkeleton />
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (error || !data) {
    return (
      <ProtectedRoute allowedRoles={['TEACHER', 'ADMIN']}>
        <DashboardLayout currentTab="evaluations">
          <div className="max-w-xl mx-auto py-12 text-center">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Submission Not Found</h2>
            <p className="text-slate-500 mb-6">{error || 'Unable to retrieve submission details for evaluation.'}</p>
            <Link href="/teacher/evaluations">
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Evaluations
              </Button>
            </Link>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  const { submission, latestGrade, gradingHistory, maxMarks } = data;
  const numericMarks = parseFloat(marks);
  const currentPercentage = !isNaN(numericMarks) && maxMarks ? ((numericMarks / maxMarks) * 100).toFixed(1) : '0';

  return (
    <ProtectedRoute allowedRoles={['TEACHER', 'ADMIN']}>
      <DashboardLayout currentTab="evaluations" title="Evaluate Submission" showSearch={false}>
        <div className="max-w-5xl mx-auto space-y-6 pb-12">
          {/* Header Link */}
          <div className="flex items-center justify-between">
            <Link
              href="/teacher/evaluations"
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Evaluation Studio
            </Link>

            <div className="flex items-center gap-2">
              <StatusBadge status={submission.status} />
              {latestGrade?.isPublished && (
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Published Grade ({latestGrade.grade})
                </Badge>
              )}
            </div>
          </div>

          {/* Success Banner */}
          {successMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <p className="text-sm font-semibold">{successMsg}</p>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-800 animate-in fade-in">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <p className="text-sm font-semibold">{error}</p>
            </div>
          )}

          {/* Context Overview (Student & Assignment) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Student Card */}
            <Card className="border-slate-200/80 shadow-sm bg-white p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 font-bold text-lg flex items-center justify-center shrink-0 uppercase">
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
                  <span className="text-slate-400">Class:</span>
                  <span className="font-semibold text-slate-800">{submission.assignment.class.name}</span>
                </div>
              </div>
            </Card>

            {/* Assignment Card */}
            <Card className="border-slate-200/80 shadow-sm bg-white p-5 md:col-span-2">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                    {submission.assignment.subject || 'Assignment'}
                  </span>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight mt-0.5">
                    {submission.assignment.title}
                  </h2>
                </div>
                <Badge variant="outline" className="font-mono text-xs">
                  Max: {maxMarks} Marks
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-xs">
                <div>
                  <p className="text-slate-400">Due Date</p>
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

          {/* Student Submitted Work */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" /> Student's Submitted Work
            </h3>

            {/* Written Answer */}
            {submission.answerText && (
              <Card className="border-slate-200/80 shadow-sm bg-white p-4">
                <p className="text-xs font-bold text-slate-700 mb-2">Text Response / Notes:</p>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {submission.answerText}
                </div>
              </Card>
            )}

            {/* Attached Files */}
            {submission.files && submission.files.length > 0 && (
              <Card className="border-slate-200/80 shadow-sm bg-white p-4">
                <p className="text-xs font-bold text-slate-700 mb-2">Attached File Submissions ({submission.files.length}):</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {submission.files.map((file: any) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
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
                        <Button size="sm" variant="outline" className="h-8 text-xs font-bold text-blue-600">
                          <Download className="w-3.5 h-3.5 mr-1" /> Download
                        </Button>
                      </a>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Professional Grading Form */}
          <Card className="border-slate-200/80 shadow-md bg-white overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-purple-50 via-white to-blue-50 border-b border-slate-100 py-4 px-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Award className="w-5 h-5 text-purple-600" /> Evaluation & Grading Form
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Assign numerical marks, letter grade, and constructive feedback for the student.
                  </CardDescription>
                </div>
                {latestGrade && (
                  <Badge variant="outline" className="text-xs">
                    {latestGrade.isPublished ? 'Published Result' : 'Draft In Progress'}
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {/* Score & Grade Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {/* Marks Obtained */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">
                    Marks Obtained <span className="text-rose-500">*</span> (Max: {maxMarks})
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      max={maxMarks}
                      value={marks}
                      onChange={(e) => handleMarksChange(e.target.value)}
                      placeholder="e.g. 85"
                      className="text-base font-bold font-mono h-11"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      / {maxMarks}
                    </span>
                  </div>
                </div>

                {/* Percentage Display */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Calculated Percentage</Label>
                  <div className="h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between font-mono font-bold text-base text-slate-800">
                    <span>{currentPercentage}%</span>
                    <span className="text-xs text-slate-400 font-sans font-normal">
                      Range Preset: {suggestedGrade}
                    </span>
                  </div>
                </div>

                {/* Assigned Grade */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-700">Assigned Grade</Label>
                    <label className="text-[11px] text-purple-600 font-semibold cursor-pointer flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={isOverride}
                        onChange={(e) => setIsOverride(e.target.checked)}
                        className="rounded border-slate-300 text-purple-600"
                      />
                      Override
                    </label>
                  </div>
                  <select
                    disabled={!isOverride}
                    value={selectedGrade}
                    onChange={(e) => setSelectedGrade(e.target.value)}
                    className="h-11 w-full px-3 text-sm bg-white border border-slate-200 rounded-lg font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                  >
                    <option value="A+">A+ (90–100%)</option>
                    <option value="A">A (80–89%)</option>
                    <option value="B">B (70–79%)</option>
                    <option value="C">C (60–69%)</option>
                    <option value="D">D (40–59%)</option>
                    <option value="F">F (&lt; 40%)</option>
                  </select>
                </div>
              </div>

              {/* Written Feedback (Visible to Student) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">
                  Student Feedback <span className="text-slate-400 font-normal">(Visible on student grade sheet)</span>
                </Label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="e.g. Excellent work on the distributed algorithm. Ensure edge case handling for network partitions in future assignments."
                  rows={4}
                  className="w-full p-3 text-xs bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 font-sans leading-relaxed"
                />
              </div>

              {/* Evaluation Comments (Internal Teacher Notes) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">
                  Internal Evaluation Notes <span className="text-slate-400 font-normal">(Private teacher commentary)</span>
                </Label>
                <textarea
                  value={evaluationComments}
                  onChange={(e) => setEvaluationComments(e.target.value)}
                  placeholder="Private notes for grading records, plagiarism check confirmation, or faculty audit..."
                  rows={2}
                  className="w-full p-3 text-xs bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 font-sans leading-relaxed"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowResubmitModal(true)}
                  disabled={submitting}
                  className="text-xs font-bold border-purple-200 text-purple-700 hover:bg-purple-50 w-full sm:w-auto"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Request Resubmission
                </Button>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleSaveEvaluation(false)}
                    disabled={submitting}
                    className="text-xs font-bold w-full sm:w-auto"
                  >
                    <Save className="w-3.5 h-3.5 mr-1.5" /> Save as Draft
                  </Button>

                  <Button
                    type="button"
                    onClick={() => handleSaveEvaluation(true)}
                    disabled={submitting}
                    className="bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold px-6 shadow-md shadow-blue-500/20 w-full sm:w-auto"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    {latestGrade?.isPublished ? 'Update & Re-Publish' : 'Publish Results'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Evaluation History (if multiple evaluation records exist) */}
          {gradingHistory && gradingHistory.length > 1 && (
            <Card className="border-slate-200/80 shadow-sm bg-white overflow-hidden">
              <CardHeader className="py-3 px-5 border-b border-slate-100 bg-slate-50/75">
                <CardTitle className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <History className="w-4 h-4 text-purple-600" /> Evaluation History ({gradingHistory.length} Records)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                {gradingHistory.map((g: any, i: number) => (
                  <div
                    key={g.id}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between"
                  >
                    <div>
                      <p className="font-bold text-slate-800">
                        Score: {g.marks} / {maxMarks} ({g.grade}) &bull; {g.isPublished ? 'Published' : 'Draft'}
                      </p>
                      {g.feedback && <p className="text-[11px] text-slate-500 italic mt-0.5">"{g.feedback}"</p>}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {new Date(g.evaluatedAt || g.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

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
                    <p className="text-xs text-slate-500">Specify instructions for the student's next attempt.</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Resubmission Instructions / Note</Label>
                  <textarea
                    value={resubmitNote}
                    onChange={(e) => setResubmitNote(e.target.value)}
                    placeholder="e.g. Please re-run the benchmark test with dataset B and submit updated PDF."
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
                    disabled={submitting}
                    onClick={handleRequestResubmission}
                    className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-9 rounded-xl font-bold shadow-md shadow-purple-500/20"
                  >
                    {submitting ? 'Sending...' : 'Send Request'}
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
