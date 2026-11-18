'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardSkeleton } from '@/components/dashboard/LoadingSkeleton';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import api from '@/lib/axios';
import {
  FileText,
  ArrowLeft,
  Save,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export default function EditAssignmentPage() {
  const params = useParams();
  const router = useRouter();
  const assignmentId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [totalMarks, setTotalMarks] = useState('100');
  const [passingMarks, setPassingMarks] = useState('');
  const [startDate, setStartDate] = useState('');
  const [deadline, setDeadline] = useState('');
  const [allowLateSubmission, setAllowLateSubmission] = useState(true);
  const [allowResubmission, setAllowResubmission] = useState(false);
  const [maxAttempts, setMaxAttempts] = useState('1');
  const [status, setStatus] = useState('DRAFT');

  useEffect(() => {
    async function loadAssignment() {
      try {
        setLoading(true);
        const res = await api.get(`/assignments/${assignmentId}`);
        if (res.data.success) {
          const a = res.data.data;
          setTitle(a.title);
          setSubject(a.subject || '');
          setDescription(a.description || '');
          setInstructions(a.instructions);
          setTotalMarks(String(a.totalMarks));
          setPassingMarks(a.passingMarks ? String(a.passingMarks) : '');
          setStartDate(new Date(a.startDate).toISOString().slice(0, 16));
          setDeadline(new Date(a.deadline).toISOString().slice(0, 16));
          setAllowLateSubmission(a.allowLateSubmission);
          setAllowResubmission(a.allowResubmission);
          setMaxAttempts(String(a.maxAttempts || 1));
          setStatus(a.status);
        }
      } catch (err: any) {
        setError(err.response?.data?.error?.message || 'Failed to load assignment details.');
      } finally {
        setLoading(false);
      }
    }
    loadAssignment();
  }, [assignmentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      setSaving(true);
      const res = await api.patch(`/assignments/${assignmentId}`, {
        title,
        subject,
        description,
        instructions,
        totalMarks: Number(totalMarks),
        passingMarks: passingMarks ? Number(passingMarks) : undefined,
        startDate: new Date(startDate).toISOString(),
        deadline: new Date(deadline).toISOString(),
        allowLateSubmission,
        allowResubmission,
        maxAttempts: Number(maxAttempts),
        status,
      });

      if (res.data.success) {
        setSuccess('Assignment updated successfully!');
        setTimeout(() => {
          router.push(`/teacher/assignments/${assignmentId}`);
        }, 1200);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to update assignment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['TEACHER', 'ADMIN']}>
      <DashboardLayout currentTab="assignments" title="Edit Assignment" showSearch={false}>
        <div className="max-w-4xl mx-auto space-y-6">
          <Link
            href={`/teacher/assignments/${assignmentId}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Assignment Details
          </Link>

          {loading ? (
            <DashboardSkeleton />
          ) : (
            <Card className="rounded-2xl border-slate-100 shadow-sm bg-white overflow-hidden">
              <CardHeader className="p-6 border-b border-slate-100 bg-gradient-to-r from-blue-50/50 to-indigo-50/30">
                <CardTitle className="text-lg font-bold text-slate-900">
                  Edit Assignment Details
                </CardTitle>
                <p className="text-xs text-slate-500">
                  Update instructions, adjust deadlines, or modify grading configuration.
                </p>
              </CardHeader>

              <CardContent className="p-6">
                {error && (
                  <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                  </div>
                )}
                {success && (
                  <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" /> {success}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Assignment Title
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold"
                      >
                        <option value="DRAFT">DRAFT</option>
                        <option value="PUBLISHED">PUBLISHED</option>
                        <option value="CLOSED">CLOSED</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Subject</label>
                      <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Short Description</label>
                      <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Instructions</label>
                    <textarea
                      rows={5}
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      required
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Total Marks</label>
                      <input
                        type="number"
                        value={totalMarks}
                        onChange={(e) => setTotalMarks(e.target.value)}
                        required
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Passing Marks</label>
                      <input
                        type="number"
                        value={passingMarks}
                        onChange={(e) => setPassingMarks(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Deadline</label>
                      <input
                        type="datetime-local"
                        value={deadline}
                        onChange={(e) => setDeadline(e.target.value)}
                        required
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-rose-700"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <label className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowLateSubmission}
                        onChange={(e) => setAllowLateSubmission(e.target.checked)}
                        className="rounded text-blue-600"
                      />
                      <span className="text-xs font-bold text-slate-800">Allow Late Submission</span>
                    </label>

                    <label className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowResubmission}
                        onChange={(e) => setAllowResubmission(e.target.checked)}
                        className="rounded text-blue-600"
                      />
                      <span className="text-xs font-bold text-slate-800">Allow Resubmissions</span>
                    </label>
                  </div>

                  <div className="pt-4 flex justify-end gap-3">
                    <Link href={`/teacher/assignments/${assignmentId}`}>
                      <Button variant="outline" size="sm" type="button" className="text-xs rounded-xl">
                        Cancel
                      </Button>
                    </Link>
                    <Button
                      type="submit"
                      disabled={saving}
                      className="bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl text-xs font-bold px-6 gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
