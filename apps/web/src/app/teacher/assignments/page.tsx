'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  CheckCircle2,
  Inbox,
  ArrowRight,
  BookOpen,
  Paperclip,
} from 'lucide-react';

export default function TeacherAssignmentsPage() {
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [assignRes, classRes] = await Promise.all([
          api.get('/assignments/teacher'),
          api.get('/classes/teacher'),
        ]);

        if (assignRes.data.success) {
          setAssignments(assignRes.data.data.assignments);
        }
        if (classRes.data.success) {
          setClasses(classRes.data.data);
        }
      } catch (err) {
        console.error('Failed to load assignments:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filtered = assignments.filter((a) => {
    const matchesSearch =
      a.title.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      (a.subject && a.subject.toLowerCase().includes(searchQuery.toLowerCase().trim())) ||
      a.className.toLowerCase().includes(searchQuery.toLowerCase().trim());

    const matchesStatus = statusFilter === 'ALL' || a.status === statusFilter;
    const matchesClass = selectedClassId === 'ALL' || a.classId === selectedClassId;

    return matchesSearch && matchesStatus && matchesClass;
  });

  return (
    <ProtectedRoute allowedRoles={['TEACHER', 'ADMIN']}>
      <DashboardLayout
        currentTab="assignments"
        title="Coursework Assignments"
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
      >
        <div className="space-y-6">
          {/* Header Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Assignments & Tasks
              </h2>
              <p className="text-xs text-slate-500">
                Design coursework, attach reference documents, set deadlines, and manage publishing.
              </p>
            </div>
            <Link href="/teacher/assignments/create">
              <Button className="bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl text-xs font-semibold gap-1.5 shadow-sm">
                <Plus className="w-4 h-4" /> Create Assignment
              </Button>
            </Link>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm">
            {/* Status Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {['ALL', 'DRAFT', 'PUBLISHED', 'CLOSED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    statusFilter === st
                      ? 'bg-[#172554] text-white shadow-sm'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {st === 'ALL' ? 'All Assignments' : st}
                </button>
              ))}
            </div>

            {/* Class Selector Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Class:</span>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="ALL">All Classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.classCode})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Assignments List */}
          {loading ? (
            <DashboardSkeleton />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={searchQuery ? 'No Matching Assignments' : 'No Assignments Found'}
              description={
                searchQuery
                  ? 'Try adjusting your search query or status filter.'
                  : 'Get started by creating your first task or reference assignment for students.'
              }
              actionLabel={searchQuery ? undefined : 'Create New Assignment'}
              onAction={() => (window.location.href = '/teacher/assignments/create')}
            />
          ) : (
            <div className="space-y-4">
              {filtered.map((a) => (
                <Card
                  key={a.id}
                  className="rounded-2xl border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 bg-white p-5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-2 max-w-2xl">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <Link
                          href={`/teacher/assignments/${a.id}`}
                          className="text-base font-bold text-slate-900 hover:text-blue-600 transition-colors"
                        >
                          {a.title}
                        </Link>
                        <StatusBadge status={a.status} />
                        {a.attachmentsCount > 0 && (
                          <Badge variant="outline" className="text-[10px] gap-1 font-mono text-slate-600 bg-slate-50">
                            <Paperclip className="w-3 h-3" /> {a.attachmentsCount} file(s)
                          </Badge>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 line-clamp-2">
                        {a.description || a.instructions}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-1">
                        <span>
                          Class: <strong className="text-slate-800">{a.className}</strong>
                        </span>
                        {a.subject && (
                          <span>
                            Subject: <strong className="text-blue-600">{a.subject}</strong>
                          </span>
                        )}
                        <span>
                          Max Marks: <strong className="text-slate-800">{a.totalMarks}</strong>
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          Due: <strong className="text-slate-800">{new Date(a.deadline).toLocaleDateString()}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 flex sm:flex-col items-end gap-3 justify-between">
                      <div className="text-right sm:block">
                        <p className="text-xs font-bold text-slate-900">
                          {a.submissionCount} Submissions
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {a.evaluatedCount} Evaluated
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link href={`/teacher/assignments/${a.id}/edit`}>
                          <Button variant="outline" size="sm" className="text-xs rounded-xl h-8 px-3">
                            Edit
                          </Button>
                        </Link>
                        <Link href={`/teacher/assignments/${a.id}`}>
                          <Button
                            size="sm"
                            className="bg-[#2563EB] hover:bg-blue-700 text-white text-xs rounded-xl h-8 px-3.5 font-semibold gap-1"
                          >
                            Details <ArrowRight className="w-3 h-3" />
                          </Button>
                        </Link>
                      </div>
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
