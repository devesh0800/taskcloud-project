'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { DashboardSkeleton } from '@/components/dashboard/LoadingSkeleton';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/axios';
import {
  BookOpen,
  Plus,
  Users,
  FileText,
  Copy,
  Check,
  Search,
  ExternalLink,
  Archive,
  ArrowRight,
  GraduationCap,
} from 'lucide-react';

export default function TeacherClassesPage() {
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    async function fetchClasses() {
      try {
        setLoading(true);
        const res = await api.get('/classes/teacher', {
          params: { includeArchived: showArchived },
        });
        if (res.data.success) {
          setClasses(res.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch classes:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchClasses();
  }, [showArchived]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const filteredClasses = classes.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.subject && c.subject.toLowerCase().includes(q)) ||
      c.classCode.toLowerCase().includes(q)
    );
  });

  return (
    <ProtectedRoute allowedRoles={['TEACHER', 'ADMIN']}>
      <DashboardLayout
        currentTab="classes"
        title="Classroom Management"
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
      >
        <div className="space-y-6">
          {/* Header Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Your Classes</h2>
              <p className="text-xs text-slate-500">
                Create and organize course sections, generate joining codes, and manage students.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowArchived(!showArchived)}
                className={`text-xs rounded-xl font-semibold gap-1.5 ${
                  showArchived ? 'bg-slate-100 text-slate-800' : 'text-slate-600'
                }`}
              >
                <Archive className="w-3.5 h-3.5" />
                {showArchived ? 'Hide Archived' : 'Show Archived'}
              </Button>
              <Link href="/teacher/classes/create">
                <Button className="bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl text-xs font-semibold gap-1.5 shadow-sm">
                  <Plus className="w-4 h-4" /> Create Class
                </Button>
              </Link>
            </div>
          </div>

          {/* Classes Cards Grid */}
          {loading ? (
            <DashboardSkeleton />
          ) : filteredClasses.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title={searchQuery ? 'No Matching Classes Found' : 'No Classes Created Yet'}
              description={
                searchQuery
                  ? 'Try searching with a different keyword or class code.'
                  : 'Get started by creating your first academic class to invite students.'
              }
              actionLabel={searchQuery ? undefined : 'Create Your First Class'}
              onAction={() => (window.location.href = '/teacher/classes/create')}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClasses.map((c) => (
                <Card
                  key={c.id}
                  className="rounded-2xl border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 bg-white flex flex-col justify-between"
                >
                  <CardHeader className="p-5 border-b border-slate-100">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base font-bold text-slate-900 leading-tight">
                            {c.name}
                          </CardTitle>
                          {c.isArchived && (
                            <Badge className="bg-slate-100 text-slate-600 text-[10px]">Archived</Badge>
                          )}
                        </div>
                        {c.subject && (
                          <p className="text-xs font-semibold text-blue-600">{c.subject}</p>
                        )}
                        {(c.semester || c.section) && (
                          <p className="text-[11px] text-slate-400">
                            {[c.semester, c.section].filter(Boolean).join(' • ')}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                    <p className="text-xs text-slate-600 line-clamp-2 min-h-[32px]">
                      {c.description || 'No class description provided.'}
                    </p>

                    {/* Code Card Snippet */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          Joining Code
                        </span>
                        <p className="font-mono font-bold text-sm text-[#172554] tracking-wider">
                          {c.classCode}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyCode(c.classCode)}
                        className="h-8 px-2.5 text-xs text-slate-600 hover:text-blue-600 hover:bg-white rounded-lg gap-1 border border-slate-200"
                      >
                        {copiedCode === c.classCode ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-600 font-semibold">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Stats & Link Footer */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 font-semibold text-slate-700">
                          <Users className="w-3.5 h-3.5 text-slate-400" /> {c.totalStudents}
                        </span>
                        <span className="flex items-center gap-1 font-semibold text-slate-700">
                          <FileText className="w-3.5 h-3.5 text-slate-400" /> {c.totalAssignments}
                        </span>
                      </div>
                      <Link
                        href={`/teacher/classes/${c.id}`}
                        className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline"
                      >
                        Manage <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
