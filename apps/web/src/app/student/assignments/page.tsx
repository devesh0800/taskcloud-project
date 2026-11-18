'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { DashboardSkeleton } from '@/components/dashboard/LoadingSkeleton';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/axios';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Paperclip,
  ArrowRight,
  BookOpen,
  Calendar,
  Award,
} from 'lucide-react';

export default function StudentAssignmentsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedClassId, setSelectedClassId] = useState('ALL');
  const [sortBy, setSortBy] = useState<'deadline' | 'recent'>('deadline');

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const [assignRes, classRes] = await Promise.all([
        api.get('/assignments/student', {
          params: {
            classId: selectedClassId !== 'ALL' ? selectedClassId : undefined,
            statusFilter: statusFilter !== 'ALL' ? statusFilter : undefined,
            search: searchQuery.trim() || undefined,
            sortBy,
          },
        }),
        api.get('/classes/student'),
      ]);

      if (assignRes.data.success) {
        setAssignments(assignRes.data.data.assignments);
      }
      if (classRes.data.success) {
        setClasses(classRes.data.data);
      }
    } catch (err) {
      console.error('Failed to load student assignments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [statusFilter, selectedClassId, sortBy]);

  return (
    <ProtectedRoute allowedRoles={['STUDENT', 'ADMIN']}>
      <DashboardLayout
        currentTab="assignments"
        title="My Assignments"
        searchValue={searchQuery}
        onSearchChange={(val) => {
          setSearchQuery(val);
          // Debounced or direct search trigger
        }}
      >
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Your Assignments</h2>
              <p className="text-xs text-slate-500">
                Track coursework deadlines, download reference files, and turn in your completed work.
              </p>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm">
            {/* Status Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'ALL', label: 'All Tasks' },
                { id: 'PENDING', label: 'Pending' },
                { id: 'SUBMITTED', label: 'Submitted' },
                { id: 'EVALUATED', label: 'Evaluated' },
                { id: 'LATE', label: 'Overdue / Late' },
                { id: 'CLOSED', label: 'Closed' },
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setStatusFilter(pill.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    statusFilter === pill.id
                      ? 'bg-[#172554] text-white shadow-sm'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {/* Class & Sort Dropdowns */}
            <div className="flex items-center gap-3">
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-medium text-slate-700 focus:outline-none"
              >
                <option value="ALL">All Classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-medium text-slate-700 focus:outline-none"
              >
                <option value="deadline">Earliest Deadline</option>
                <option value="recent">Recently Published</option>
              </select>
            </div>
          </div>

          {/* Assignments List */}
          {loading ? (
            <DashboardSkeleton />
          ) : assignments.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={statusFilter !== 'ALL' ? 'No Assignments Matching Filter' : 'No Assignments Found'}
              description={
                statusFilter !== 'ALL'
                  ? 'Try selecting a different status filter above.'
                  : "You're all caught up! No coursework is currently assigned for your enrolled classes."
              }
            />
          ) : (
            <div className="space-y-4">
              {assignments.map((a) => (
                <Card
                  key={a.id}
                  className="rounded-2xl border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 bg-white p-5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-2 max-w-2xl">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <Link
                          href={`/student/assignments/${a.id}`}
                          className="text-base font-bold text-slate-900 hover:text-blue-600 transition-colors"
                        >
                          {a.title}
                        </Link>
                        {a.isSubmitted ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                            Turned In
                          </Badge>
                        ) : a.isOverdue ? (
                          <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-xs">
                            Overdue
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                            Pending
                          </Badge>
                        )}
                        {a.attachments?.length > 0 && (
                          <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                            <Paperclip className="w-3 h-3" /> {a.attachments.length} file(s)
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 line-clamp-2">
                        {a.description || a.instructions}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-1">
                        <span>
                          Class: <strong className="text-slate-800">{a.className}</strong>
                        </span>
                        <span>
                          Teacher: <strong className="text-slate-800">{a.teacherName}</strong>
                        </span>
                        <span>
                          Max Marks: <strong className="text-slate-800">{a.totalMarks}</strong>
                        </span>
                        <span className="flex items-center gap-1 text-blue-600 font-semibold">
                          <Clock className="w-3.5 h-3.5" /> {a.countdown}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 flex sm:flex-col items-end gap-3 justify-between">
                      {a.submission?.marksAwarded !== null && a.submission?.marksAwarded !== undefined ? (
                        <div className="text-right">
                          <p className="text-xs font-bold text-emerald-600">
                            Score: {a.submission.marksAwarded} / {a.totalMarks}
                          </p>
                          {a.submission.letterGrade && (
                            <p className="text-[10px] text-slate-400">
                              Grade {a.submission.letterGrade}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-slate-500">
                          Due: {new Date(a.deadline).toLocaleDateString()}
                        </span>
                      )}

                      <Button
                        size="sm"
                        onClick={() => router.push(`/student/assignments/${a.id}`)}
                        className="bg-[#2563EB] hover:bg-blue-700 text-white text-xs rounded-xl h-8 px-4 font-semibold gap-1 cursor-pointer"
                      >
                        {a.isSubmitted ? 'View Submission' : 'View & Submit'} <ArrowRight className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
