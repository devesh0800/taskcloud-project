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
  ArrowRight,
  GraduationCap,
  Calendar,
} from 'lucide-react';

export default function StudentClassesPage() {
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchStudentClasses() {
      try {
        setLoading(true);
        const res = await api.get('/classes/student');
        if (res.data.success) {
          setClasses(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load student classes:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStudentClasses();
  }, []);

  const filtered = classes.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.subject && c.subject.toLowerCase().includes(q)) ||
      (c.teacherName && c.teacherName.toLowerCase().includes(q))
    );
  });

  return (
    <ProtectedRoute allowedRoles={['STUDENT', 'ADMIN']}>
      <DashboardLayout
        currentTab="classes"
        title="My Classes"
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
      >
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Your Enrolled Classes</h2>
              <p className="text-xs text-slate-500">
                View all academic courses, instructions, classmates, and active assignments.
              </p>
            </div>
            <Link href="/student/join-class">
              <Button className="bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl text-xs font-semibold gap-1.5 shadow-sm">
                <Plus className="w-4 h-4" /> Join New Class
              </Button>
            </Link>
          </div>

          {loading ? (
            <DashboardSkeleton />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title={searchQuery ? 'No Matching Classes' : 'Not Enrolled in Any Classes'}
              description={
                searchQuery
                  ? 'Try searching with another subject or instructor name.'
                  : 'Enter a joining code provided by your teacher to enroll in your class.'
              }
              actionLabel={searchQuery ? undefined : 'Join a Class'}
              onAction={() => (window.location.href = '/student/join-class')}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((c) => (
                <Card
                  key={c.id}
                  className="rounded-2xl border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 bg-white flex flex-col justify-between"
                >
                  <CardHeader className="p-5 border-b border-slate-100">
                    <div className="space-y-1">
                      <CardTitle className="text-base font-bold text-slate-900 leading-tight">
                        {c.name}
                      </CardTitle>
                      {c.subject && (
                        <p className="text-xs font-semibold text-blue-600">{c.subject}</p>
                      )}
                      <p className="text-[11px] text-slate-500">
                        Instructor: <strong className="text-slate-700">{c.teacherName || 'Faculty'}</strong>
                      </p>
                    </div>
                  </CardHeader>

                  <CardContent className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                    <p className="text-xs text-slate-600 line-clamp-2 min-h-[32px]">
                      {c.description || 'No class description provided.'}
                    </p>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 font-semibold text-slate-700">
                          <Users className="w-3.5 h-3.5 text-slate-400" /> {c.totalStudents} Peers
                        </span>
                        <span className="flex items-center gap-1 font-semibold text-slate-700">
                          <FileText className="w-3.5 h-3.5 text-slate-400" /> {c.totalAssignments} Tasks
                        </span>
                      </div>
                      <Link
                        href={`/student/classes/${c.id}`}
                        className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline"
                      >
                        Enter Class <ArrowRight className="w-3.5 h-3.5" />
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
