'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import api from '@/lib/axios';
import {
  FileText,
  ArrowLeft,
  Upload,
  X,
  AlertCircle,
  CheckCircle2,
  Paperclip,
  Calendar,
  Sparkles,
} from 'lucide-react';

export default function CreateAssignmentPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingClasses, setFetchingClasses] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [classId, setClassId] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [totalMarks, setTotalMarks] = useState('100');
  const [passingMarks, setPassingMarks] = useState('40');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 16));
  const [deadline, setDeadline] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  );
  const [allowLateSubmission, setAllowLateSubmission] = useState(true);
  const [allowResubmission, setAllowResubmission] = useState(false);
  const [maxAttempts, setMaxAttempts] = useState('1');

  // File Attachments
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  useEffect(() => {
    async function fetchClasses() {
      try {
        setFetchingClasses(true);
        const res = await api.get('/classes/teacher');
        if (res.data.success) {
          setClasses(res.data.data);
          if (res.data.data.length > 0) {
            setClassId(res.data.data[0].id);
            setSubject(res.data.data[0].subject || '');
          }
        }
      } catch (err) {
        console.error('Failed to load classes:', err);
      } finally {
        setFetchingClasses(false);
      }
    }
    fetchClasses();
  }, []);

  const handleClassChange = (cId: string) => {
    setClassId(cId);
    const selected = classes.find((c) => c.id === cId);
    if (selected && selected.subject) {
      setSubject(selected.subject);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files);

    // Validate size (10 MB limit)
    const validFiles: File[] = [];
    for (const file of newFiles) {
      if (file.size > 10 * 1024 * 1024) {
        alert(`File "${file.name}" exceeds maximum allowed size of 10 MB.`);
      } else {
        validFiles.push(file);
      }
    }

    setSelectedFiles((prev) => [...prev, ...validFiles]);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (targetStatus: 'DRAFT' | 'PUBLISHED') => {
    setError(null);
    setSuccess(null);

    if (!title.trim()) {
      setError('Assignment Title is required.');
      return;
    }
    if (!instructions.trim()) {
      setError('Detailed instructions are required.');
      return;
    }
    if (!classId) {
      setError('Please select a target class.');
      return;
    }
    if (!deadline) {
      setError('Submission deadline is required.');
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append('title', title);
      formData.append('subject', subject);
      formData.append('classId', classId);
      formData.append('description', description);
      formData.append('instructions', instructions);
      formData.append('totalMarks', totalMarks);
      if (passingMarks) formData.append('passingMarks', passingMarks);
      formData.append('startDate', new Date(startDate).toISOString());
      formData.append('deadline', new Date(deadline).toISOString());
      formData.append('allowLateSubmission', String(allowLateSubmission));
      formData.append('allowResubmission', String(allowResubmission));
      formData.append('maxAttempts', maxAttempts);
      formData.append('status', targetStatus);

      selectedFiles.forEach((file) => {
        formData.append('attachments', file);
      });

      const res = await api.post('/assignments', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.data.success) {
        setSuccess(
          targetStatus === 'PUBLISHED'
            ? 'Assignment created and published to students!'
            : 'Assignment saved as draft.'
        );
        setTimeout(() => {
          router.push(`/teacher/assignments/${res.data.data.id}`);
        }, 1200);
      }
    } catch (err: any) {
      console.error('Failed to create assignment:', err);
      setError(err.response?.data?.error?.message || 'Failed to create assignment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['TEACHER', 'ADMIN']}>
      <DashboardLayout currentTab="assignments" title="Create Assignment" showSearch={false}>
        <div className="max-w-4xl mx-auto space-y-6">
          <Link
            href="/teacher/assignments"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Assignments
          </Link>

          <Card className="rounded-2xl border-slate-100 shadow-sm bg-white overflow-hidden">
            <CardHeader className="p-6 border-b border-slate-100 bg-gradient-to-r from-blue-50/50 to-indigo-50/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#2563EB] flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900">
                    Create Coursework Assignment
                  </CardTitle>
                  <p className="text-xs text-slate-500">
                    Define objectives, attach reference files, configure grading parameters, and publish.
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {error && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}
              {success && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" /> {success}
                </div>
              )}

              {/* SECTION 1: Class Selection & Basic Details */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  1. Basic Information
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Target Classroom <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={classId}
                      onChange={(e) => handleClassChange(e.target.value)}
                      required
                      className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium text-slate-800"
                    >
                      {fetchingClasses ? (
                        <option>Loading classrooms...</option>
                      ) : classes.length === 0 ? (
                        <option value="">No classes found. Please create a class first.</option>
                      ) : (
                        classes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.classCode})
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Subject</label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g. Distributed Computing"
                      className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Assignment Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Lab 4: Raft Consensus Algorithm Implementation"
                    required
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Brief Summary</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Short overview of assignment goals..."
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Detailed Instructions & Requirements <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={5}
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="Provide full instructions, grading rubric, required deliverables, code standards..."
                    required
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono"
                  />
                </div>
              </div>

              {/* SECTION 2: Grading & Deadline Configuration */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  2. Grading & Deadlines
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Total Marks</label>
                    <input
                      type="number"
                      value={totalMarks}
                      onChange={(e) => setTotalMarks(e.target.value)}
                      required
                      min={1}
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
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Start Date</label>
                    <input
                      type="datetime-local"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Submission Deadline <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-rose-700"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <label className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100/70 transition-colors">
                    <input
                      type="checkbox"
                      checked={allowLateSubmission}
                      onChange={(e) => setAllowLateSubmission(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-800 block">Allow Late Submission</span>
                      <span className="text-slate-400 text-[10px]">Accept submissions after deadline</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100/70 transition-colors">
                    <input
                      type="checkbox"
                      checked={allowResubmission}
                      onChange={(e) => setAllowResubmission(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-800 block">Allow Resubmissions</span>
                      <span className="text-slate-400 text-[10px]">Students can update answers</span>
                    </div>
                  </label>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Max Attempts</label>
                    <input
                      type="number"
                      value={maxAttempts}
                      onChange={(e) => setMaxAttempts(e.target.value)}
                      min={1}
                      max={10}
                      className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: Reference Attachments */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5" /> 3. Reference Attachments (Max 10 MB per file)
                </h4>

                <div className="p-6 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 hover:bg-slate-50 text-center transition-colors">
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700">
                    Upload reference PDFs, starter code, handouts or datasets
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Allowed formats: PDF, DOCX, PPTX, TXT, PNG, JPG (Multiple files supported)
                  </p>
                  <label className="mt-3 inline-block">
                    <input
                      type="file"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.zip"
                    />
                    <span className="bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl cursor-pointer inline-flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5" /> Choose Files
                    </span>
                  </label>
                </div>

                {/* Selected Files Preview */}
                {selectedFiles.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-700">Selected Attachments ({selectedFiles.length}):</p>
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white overflow-hidden">
                      {selectedFiles.map((file, idx) => (
                        <div key={idx} className="p-3 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                            <span className="font-semibold text-slate-800">{file.name}</span>
                            <span className="text-[10px] text-slate-400">
                              ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(idx)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <Link href="/teacher/assignments">
                  <Button variant="outline" size="sm" type="button" className="text-xs rounded-xl">
                    Cancel
                  </Button>
                </Link>

                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading}
                    onClick={() => handleSubmit('DRAFT')}
                    className="text-xs font-semibold rounded-xl border-slate-300"
                  >
                    Save as Draft
                  </Button>
                  <Button
                    type="button"
                    disabled={loading}
                    onClick={() => handleSubmit('PUBLISHED')}
                    className="bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl text-xs font-bold px-6 shadow-sm gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {loading ? 'Publishing...' : 'Publish Assignment'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
