'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/axios';
import {
  FileBarChart,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  BookOpen,
  User,
  CheckCircle2,
  Calendar,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

function TeacherReportsContent() {
  const searchParams = useSearchParams();
  const initialClassId = searchParams.get('classId') || '';
  const initialStudentId = searchParams.get('studentId') || '';

  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClassId);
  const [reportType, setReportType] = useState<'class' | 'student'>('class');
  const [studentIdInput, setStudentIdInput] = useState<string>(initialStudentId);

  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  // Load teacher classes
  useEffect(() => {
    async function loadClasses() {
      try {
        const res = await apiClient.get('/classes');
        if (res.data?.success && res.data?.data) {
          const list = res.data.data.classes || [];
          setClasses(list);
          if (list.length > 0 && !selectedClassId) {
            setSelectedClassId(list[0].id);
          }
        }
      } catch {
        // Non-blocking
      }
    }
    loadClasses();
  }, []);

  // Fetch report data
  const generateReport = async () => {
    try {
      setLoading(true);
      let endpoint = '';
      if (reportType === 'class') {
        if (!selectedClassId) {
          toast.error('Please select a class');
          return;
        }
        endpoint = `/reports/class/${selectedClassId}`;
      } else {
        if (!studentIdInput) {
          toast.error('Please provide a student ID');
          return;
        }
        endpoint = `/reports/student/${studentIdInput}`;
      }

      const res = await apiClient.get(endpoint);
      if (res.data?.success && res.data?.data) {
        setReportData(res.data.data);
        toast.success('Report generated successfully');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedClassId && reportType === 'class') {
      generateReport();
    }
  }, [selectedClassId, reportType]);

  // Handle Export Downloads
  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      let endpoint = '';
      let filename = 'edusync-report';

      if (reportType === 'class') {
        endpoint = `/reports/class/${selectedClassId}?format=${format}`;
        filename = `edusync-class-${reportData?.classInfo?.code || 'report'}.${format}`;
      } else {
        endpoint = `/reports/student/${studentIdInput}?format=${format}`;
        filename = `edusync-student-transcript.${format}`;
      }

      toast.info(`Preparing ${format.toUpperCase()} download...`);

      const response = await apiClient.get(endpoint, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(`${format.toUpperCase()} exported successfully!`);
    } catch {
      toast.error(`Failed to export ${format.toUpperCase()}`);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['TEACHER', 'ADMIN']}>
      <DashboardLayout title="Academic Reports" currentTab="reports">
        <div className="space-y-6">
          {/* Header & Mode Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                <FileBarChart className="w-6 h-6 text-blue-600" />
                Academic Reports & Exports
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Generate formal institutional reports, grade transcripts, and audit logs with one click.
              </p>
            </div>

            {/* Export Buttons */}
            {reportData && (
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => handleExport('csv')}
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-slate-200 text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-50"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  Export CSV
                </Button>
                <Button
                  onClick={() => handleExport('pdf')}
                  size="sm"
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </Button>
                <Button
                  onClick={() => window.print()}
                  variant="ghost"
                  size="sm"
                  className="rounded-xl text-slate-600 hover:text-slate-900 text-xs"
                >
                  <Printer className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Filter Configuration Card */}
          <Card className="rounded-2xl border-slate-100 shadow-sm p-5 bg-white">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Report Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setReportType('class')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                      reportType === 'class'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Class Report
                  </button>
                  <button
                    onClick={() => setReportType('student')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                      reportType === 'student'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Student Transcript
                  </button>
                </div>
              </div>

              {reportType === 'class' ? (
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Select Target Class
                  </label>
                  <select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.classCode}) — {c.subject}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Student User ID
                  </label>
                  <input
                    type="text"
                    placeholder="Enter student UUID..."
                    value={studentIdInput}
                    onChange={(e) => setStudentIdInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              )}

              <div className="flex items-end">
                <Button
                  onClick={generateReport}
                  disabled={loading}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl h-9"
                >
                  {loading ? 'Generating...' : 'Refresh Report'}
                </Button>
              </div>
            </div>
          </Card>

          {/* Report Preview Document */}
          {reportData && (
            <Card className="rounded-2xl border-slate-200 shadow-md bg-white overflow-hidden print:shadow-none print:border-none">
              {/* Document Header Banner */}
              <div className="bg-[#172554] text-white p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-5 h-5 text-blue-400" />
                    <span className="text-xs font-extrabold tracking-wider uppercase text-blue-300">
                      EduSync Official Record
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight">{reportData.reportType}</h2>
                  <p className="text-xs text-blue-200 mt-1">
                    Official evaluation data synchronized directly from Neon PostgreSQL
                  </p>
                </div>

                <div className="text-left sm:text-right text-xs text-blue-200">
                  <p className="flex items-center sm:justify-end gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(reportData.generatedAt).toLocaleString()}
                  </p>
                  <p className="text-[11px] text-blue-300 mt-1">Document Hash: Validated</p>
                </div>
              </div>

              {/* Class Summary Box */}
              {reportData.classInfo && (
                <div className="p-6 bg-slate-50/70 border-b border-slate-100">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Class Name</span>
                      <p className="font-bold text-slate-900 mt-0.5">{reportData.classInfo.name}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Class Code</span>
                      <p className="font-mono font-bold text-blue-600 mt-0.5">{reportData.classInfo.code}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Class Average</span>
                      <p className="font-bold text-emerald-600 mt-0.5">
                        {reportData.classInfo.classAveragePercentage}% ({reportData.classInfo.classAverageGrade})
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Enrolled Students</span>
                      <p className="font-bold text-slate-800 mt-0.5">{reportData.classInfo.totalStudents} pupils</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Student Summary Box */}
              {reportData.student && (
                <div className="p-6 bg-slate-50/70 border-b border-slate-100">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Student Name</span>
                      <p className="font-bold text-slate-900 mt-0.5">{reportData.student.fullName}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Student ID</span>
                      <p className="font-mono font-bold text-blue-600 mt-0.5">{reportData.student.studentId || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Cumulative Average</span>
                      <p className="font-bold text-emerald-600 mt-0.5">
                        {reportData.summary.overallAveragePercentage}% ({reportData.summary.cumulativeGrade})
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Evaluated Submissions</span>
                      <p className="font-bold text-slate-800 mt-0.5">
                        {reportData.summary.evaluatedSubmissions} / {reportData.summary.totalSubmissions}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Class Report Table */}
              {reportData.students && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#2563EB] text-white font-bold uppercase text-[10px] tracking-wider">
                        <th className="py-3 px-5">Student Name</th>
                        <th className="py-3 px-5">ID</th>
                        <th className="py-3 px-5">Email</th>
                        <th className="py-3 px-5">Submissions</th>
                        <th className="py-3 px-5">Evaluated</th>
                        <th className="py-3 px-5">Average Score</th>
                        <th className="py-3 px-5">Letter Grade</th>
                        <th className="py-3 px-5">Completion</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportData.students.map((s: any, idx: number) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                          <td className="py-3 px-5 font-bold text-slate-900">{s.studentName}</td>
                          <td className="py-3 px-5 text-slate-500 font-mono">{s.studentId}</td>
                          <td className="py-3 px-5 text-slate-500">{s.email}</td>
                          <td className="py-3 px-5 text-slate-700">{s.submissionsCount}</td>
                          <td className="py-3 px-5 text-slate-700">{s.evaluatedCount}</td>
                          <td className="py-3 px-5 font-bold text-slate-900">{s.averagePercentage}%</td>
                          <td className="py-3 px-5">
                            <Badge className="bg-blue-50 text-blue-700 font-bold border-blue-100">
                              {s.letterGrade}
                            </Badge>
                          </td>
                          <td className="py-3 px-5 font-semibold text-emerald-600">{s.completionRate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Student Report Table */}
              {reportData.assignments && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#2563EB] text-white font-bold uppercase text-[10px] tracking-wider">
                        <th className="py-3 px-5">Assignment</th>
                        <th className="py-3 px-5">Class</th>
                        <th className="py-3 px-5">Date</th>
                        <th className="py-3 px-5">Status</th>
                        <th className="py-3 px-5">Marks</th>
                        <th className="py-3 px-5">Percentage</th>
                        <th className="py-3 px-5">Grade</th>
                        <th className="py-3 px-5">Teacher Feedback</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportData.assignments.map((a: any, idx: number) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                          <td className="py-3 px-5 font-bold text-slate-900">{a.assignmentTitle}</td>
                          <td className="py-3 px-5 text-slate-600">{a.className}</td>
                          <td className="py-3 px-5 text-slate-500">{a.submittedAt}</td>
                          <td className="py-3 px-5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                a.isLate === 'Late' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                              }`}
                            >
                              {a.isLate}
                            </span>
                          </td>
                          <td className="py-3 px-5 font-bold text-slate-800">
                            {a.marks} / {a.totalMarks}
                          </td>
                          <td className="py-3 px-5 font-bold text-blue-600">{a.percentage}</td>
                          <td className="py-3 px-5">
                            <Badge className="bg-blue-50 text-blue-700 font-bold border-blue-100">
                              {a.letterGrade}
                            </Badge>
                          </td>
                          <td className="py-3 px-5 text-slate-600 max-w-xs">{a.feedback}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Footer Audit Notice */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 text-center text-[11px] text-slate-400">
                This academic report is authenticated by EduSync Cloud Academic Operating System.
              </div>
            </Card>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

export default function TeacherReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-8">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin text-[#2563EB]" /> Loading report generator...
          </div>
        </div>
      }
    >
      <TeacherReportsContent />
    </Suspense>
  );
}
