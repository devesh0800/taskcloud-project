'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardSkeleton } from '@/components/dashboard/LoadingSkeleton';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';
import {
  Award,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  RotateCcw,
  BookOpen,
  ArrowUpDown,
  FileCheck,
  AlertCircle,
  Eye,
  PenTool,
  Calendar,
} from 'lucide-react';

export default function TeacherEvaluationsPage() {
  const [loading, setLoading] = useState(true);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [statistics, setStatistics] = useState({
    total: 0,
    pending: 0,
    underReview: 0,
    evaluated: 0,
    resubmissionRequested: 0,
  });

  // Filters
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });

  useEffect(() => {
    fetchTeacherClasses();
  }, []);

  useEffect(() => {
    fetchEvaluations();
  }, [selectedClass, selectedStatus, searchQuery, currentPage]);

  const fetchTeacherClasses = async () => {
    try {
      const res = await api.get('/api/v1/classes/teacher');
      if (res.data.success) {
        setClasses(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load classes', err);
    }
  };

  const fetchEvaluations = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        limit: 20,
      };

      if (selectedClass !== 'ALL') params.classId = selectedClass;
      if (selectedStatus !== 'ALL') params.status = selectedStatus;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await api.get('/api/v1/grades/teacher', { params });
      if (res.data.success) {
        setEvaluations(res.data.data);
        if (res.data.pagination) setPagination(res.data.pagination);
        if (res.data.statistics) setStatistics(res.data.statistics);
      }
    } catch (err) {
      console.error('Failed to load evaluations', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['TEACHER', 'ADMIN']}>
      <DashboardLayout currentTab="evaluations" title="Evaluation Studio" showSearch={false}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                <Award className="w-6 h-6 text-purple-600" /> Evaluation & Grading Studio
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Assess student submissions, assign percentage-calculated letter grades, and publish qualitative feedback.
              </p>
            </div>
          </div>

          {/* Statistics Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
            <Card className="border-slate-200/80 shadow-sm p-3.5 bg-white">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Submissions</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{statistics.total}</p>
            </Card>

            <Card className="border-slate-200/80 shadow-sm p-3.5 bg-white">
              <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Pending Review</p>
              <p className="text-2xl font-black text-amber-600 mt-1">{statistics.pending}</p>
            </Card>

            <Card className="border-slate-200/80 shadow-sm p-3.5 bg-white">
              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Under Review</p>
              <p className="text-2xl font-black text-blue-600 mt-1">{statistics.underReview}</p>
            </Card>

            <Card className="border-slate-200/80 shadow-sm p-3.5 bg-white">
              <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Evaluated</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">{statistics.evaluated}</p>
            </Card>

            <Card className="border-slate-200/80 shadow-sm p-3.5 bg-white col-span-2 sm:col-span-1">
              <p className="text-[10px] font-bold text-purple-500 uppercase tracking-wider">Resubmission Req</p>
              <p className="text-2xl font-black text-purple-600 mt-1">{statistics.resubmissionRequested}</p>
            </Card>
          </div>

          {/* Filter & Search Bar */}
          <Card className="border-slate-200/80 shadow-sm p-4 bg-white">
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
              {/* Search */}
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search student name or roll number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 text-xs h-9 bg-slate-50 border-slate-200 rounded-xl"
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                <select
                  value={selectedClass}
                  onChange={(e) => {
                    setSelectedClass(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="ALL">All Classes</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} ({cls.classCode})
                    </option>
                  ))}
                </select>

                <select
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="LATE">Late</option>
                  <option value="UNDER_REVIEW">Under Review</option>
                  <option value="EVALUATED">Evaluated</option>
                  <option value="RESUBMISSION_REQUIRED">Resubmission Required</option>
                </select>

                {(selectedClass !== 'ALL' || selectedStatus !== 'ALL' || searchQuery) && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSelectedClass('ALL');
                      setSelectedStatus('ALL');
                      setSearchQuery('');
                      setCurrentPage(1);
                    }}
                    className="h-9 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* Evaluations Table */}
          {loading ? (
            <DashboardSkeleton />
          ) : evaluations.length === 0 ? (
            <Card className="p-12 text-center border-slate-200/80 bg-white shadow-sm">
              <Award className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">No Submissions Found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No submissions require evaluation matching the selected filter criteria.
              </p>
            </Card>
          ) : (
            <Card className="border-slate-200/80 shadow-sm bg-white overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Assignment & Class</th>
                      <th className="py-3 px-4">Submitted At</th>
                      <th className="py-3 px-4">Submission Status</th>
                      <th className="py-3 px-4">Evaluation Status</th>
                      <th className="py-3 px-4">Score & Grade</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {evaluations.map((ev) => (
                      <tr key={ev.submissionId} className="hover:bg-slate-50/60 transition-colors">
                        {/* Student */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center shrink-0 uppercase text-[11px]">
                              {ev.studentName.slice(0, 2)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 leading-tight">{ev.studentName}</p>
                              <p className="text-[10px] text-slate-400">
                                {ev.studentRollNo ? `ID: ${ev.studentRollNo}` : ev.studentEmail}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Assignment & Class */}
                        <td className="py-3 px-4">
                          <div className="space-y-0.5">
                            <p className="font-semibold text-slate-800 truncate max-w-[200px]">{ev.assignmentTitle}</p>
                            <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600 font-mono">
                              {ev.className}
                            </Badge>
                          </div>
                        </td>

                        {/* Submission Date */}
                        <td className="py-3 px-4">
                          <div className="text-slate-600 space-y-0.5">
                            <p className="font-medium text-[11px]">
                              {new Date(ev.submissionDate).toLocaleDateString()}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {new Date(ev.submissionDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </td>

                        {/* Submission Status */}
                        <td className="py-3 px-4">
                          <StatusBadge status={ev.submissionStatus} />
                        </td>

                        {/* Evaluation Status */}
                        <td className="py-3 px-4">
                          {ev.isEvaluated ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Published
                            </Badge>
                          ) : ev.hasDraft ? (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">
                              <Clock className="w-3 h-3 mr-1" /> Draft Saved
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-slate-50 text-slate-600 text-[10px]">
                              Unevaluated
                            </Badge>
                          )}
                        </td>

                        {/* Score & Grade */}
                        <td className="py-3 px-4">
                          {ev.marks !== null ? (
                            <div className="flex items-center gap-2">
                              <span className="font-black text-slate-900 text-xs">
                                {ev.marks} / {ev.totalMarks}
                              </span>
                              <Badge className="bg-[#172554] text-white font-bold text-[10px] px-1.5 py-0">
                                {ev.grade}
                              </Badge>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">--</span>
                          )}
                        </td>

                        {/* Action */}
                        <td className="py-3 px-4 text-right">
                          <Link href={`/teacher/evaluations/${ev.submissionId}`}>
                            <Button
                              size="sm"
                              className={`text-xs font-bold h-8 px-3 rounded-xl shadow-sm ${
                                ev.isEvaluated
                                  ? 'bg-slate-800 hover:bg-slate-900 text-white'
                                  : 'bg-[#2563EB] hover:bg-blue-700 text-white'
                              }`}
                            >
                              <PenTool className="w-3.5 h-3.5 mr-1" />
                              {ev.isEvaluated ? 'View Grade' : ev.hasDraft ? 'Resume Draft' : 'Grade'}
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <p>
                    Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => p - 1)}
                      className="h-8 text-xs"
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= pagination.totalPages}
                      onClick={() => setCurrentPage((p) => p + 1)}
                      className="h-8 text-xs"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
