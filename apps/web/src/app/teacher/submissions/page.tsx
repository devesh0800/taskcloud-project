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
  Inbox,
  Search,
  Filter,
  Eye,
  FileCheck,
  Clock,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  BookOpen,
  ArrowUpDown,
  Calendar,
  Paperclip,
} from 'lucide-react';

export default function TeacherSubmissionsPage() {
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [statistics, setStatistics] = useState({
    total: 0,
    submitted: 0,
    late: 0,
    underReview: 0,
    evaluated: 0,
    resubmissionRequired: 0,
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
    fetchSubmissions();
  }, [selectedClass, selectedStatus, searchQuery, currentPage]);

  const fetchTeacherClasses = async () => {
    try {
      const res = await api.get('/api/v1/classes/teacher');
      if (res.data.success) {
        setClasses(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load teacher classes', err);
    }
  };

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        limit: 20,
      };

      if (selectedClass !== 'ALL') params.classId = selectedClass;
      if (selectedStatus !== 'ALL') params.status = selectedStatus;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await api.get('/api/v1/submissions/teacher', { params });
      if (res.data.success) {
        setSubmissions(res.data.data);
        if (res.data.pagination) setPagination(res.data.pagination);
        if (res.data.statistics) setStatistics(res.data.statistics);
      }
    } catch (err) {
      console.error('Failed to load submissions', err);
    } finally {
      setLoading(false);
    }
  };

  const pendingReviewCount = statistics.submitted + statistics.late + statistics.underReview;

  return (
    <ProtectedRoute allowedRoles={['TEACHER', 'ADMIN']}>
      <DashboardLayout currentTab="submissions" title="Submissions Management" showSearch={false}>
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                <Inbox className="w-6 h-6 text-blue-600" /> Student Submissions
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Review submitted student responses, inspect uploaded files, and track grading progress.
              </p>
            </div>
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="border-slate-200/80 shadow-sm p-4 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Received</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">{statistics.total}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Inbox className="w-5 h-5" />
                </div>
              </div>
            </Card>

            <Card className="border-slate-200/80 shadow-sm p-4 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-amber-500 uppercase tracking-wider">Pending Review</p>
                  <p className="text-2xl font-black text-amber-600 mt-1">{pendingReviewCount}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
            </Card>

            <Card className="border-slate-200/80 shadow-sm p-4 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-rose-500 uppercase tracking-wider">Late Submissions</p>
                  <p className="text-2xl font-black text-rose-600 mt-1">{statistics.late}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>
            </Card>

            <Card className="border-slate-200/80 shadow-sm p-4 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider">Evaluated</p>
                  <p className="text-2xl font-black text-emerald-600 mt-1">{statistics.evaluated}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
            </Card>
          </div>

          {/* Filter & Search Bar */}
          <Card className="border-slate-200/80 shadow-sm p-4 bg-white">
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
              {/* Search */}
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search student name, roll no, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 text-xs h-9 bg-slate-50 border-slate-200 rounded-xl"
                />
              </div>

              {/* Filters Group */}
              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                {/* Class Filter */}
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

                {/* Status Filter */}
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

          {/* Submissions Table */}
          {loading ? (
            <DashboardSkeleton />
          ) : submissions.length === 0 ? (
            <Card className="p-12 text-center border-slate-200/80 bg-white shadow-sm">
              <Inbox className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">No Submissions Found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No student submissions matched your selected filters or search terms.
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
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Work / Files</th>
                      <th className="py-3 px-4">Score</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {submissions.map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Student */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 uppercase text-[11px]">
                              {sub.studentName.slice(0, 2)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 leading-tight">{sub.studentName}</p>
                              <p className="text-[10px] text-slate-400">
                                {sub.studentRollNo ? `ID: ${sub.studentRollNo}` : sub.studentEmail}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Assignment & Class */}
                        <td className="py-3 px-4">
                          <div className="space-y-0.5">
                            <p className="font-semibold text-slate-800 truncate max-w-[200px]">{sub.assignmentTitle}</p>
                            <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600 font-mono">
                              {sub.className}
                            </Badge>
                          </div>
                        </td>

                        {/* Submitted At */}
                        <td className="py-3 px-4">
                          <div className="text-slate-600 space-y-0.5">
                            <p className="font-medium text-[11px]">
                              {new Date(sub.submittedAt).toLocaleDateString()}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {new Date(sub.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          <StatusBadge status={sub.status} />
                        </td>

                        {/* Files & Attempts */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {sub.fileCount > 0 && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">
                                <Paperclip className="w-3 h-3 mr-1" /> {sub.fileCount} {sub.fileCount === 1 ? 'file' : 'files'}
                              </Badge>
                            )}
                            {sub.attemptNumber > 1 && (
                              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[10px]">
                                <RotateCcw className="w-3 h-3 mr-1" /> Att #{sub.attemptNumber}
                              </Badge>
                            )}
                            {sub.fileCount === 0 && sub.answerText && (
                              <Badge variant="outline" className="bg-slate-50 text-slate-600 text-[10px]">
                                Text Only
                              </Badge>
                            )}
                          </div>
                        </td>

                        {/* Score */}
                        <td className="py-3 px-4">
                          {sub.grade ? (
                            <span className="font-black text-emerald-700 text-xs">
                              {sub.grade.marks} / {sub.totalMarks}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Not evaluated</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <Link href={`/teacher/submissions/${sub.id}`}>
                            <Button size="sm" className="bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold h-8 px-3 rounded-xl shadow-sm">
                              <Eye className="w-3.5 h-3.5 mr-1" /> Review
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
                    Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total submissions)
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
