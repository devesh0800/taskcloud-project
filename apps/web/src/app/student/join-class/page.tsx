'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import api from '@/lib/axios';
import {
  KeyRound,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  Sparkles,
} from 'lucide-react';

export default function JoinClassPage() {
  const router = useRouter();
  const [classCode, setClassCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joinedResult, setJoinedResult] = useState<any>(null);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanCode = classCode.trim().toUpperCase();
    if (!cleanCode) {
      setError('Please enter a class joining code.');
      return;
    }

    try {
      setLoading(true);
      const res = await api.post('/classes/join', { classCode: cleanCode });
      if (res.data.success) {
        setJoinedResult(res.data.data);
      }
    } catch (err: any) {
      console.error('Failed to join class:', err);
      setError(
        err.response?.data?.error?.message ||
          'Failed to join class. Please verify the code with your teacher.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['STUDENT', 'ADMIN']}>
      <DashboardLayout currentTab="classes" title="Join a Classroom" showSearch={false}>
        <div className="max-w-xl mx-auto space-y-6 pt-4">
          <Link
            href="/student/classes"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to My Classes
          </Link>

          {joinedResult ? (
            <Card className="rounded-2xl border-emerald-100 shadow-md bg-white p-8 text-center space-y-4">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">Successfully Enrolled!</h3>
                <p className="text-sm text-slate-600 mt-1">
                  You have joined <strong>{joinedResult.class.name}</strong> taught by{' '}
                  <strong>{joinedResult.class.teacherName}</strong>.
                </p>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button
                  onClick={() => router.push(`/student/classes/${joinedResult.class.id}`)}
                  className="w-full sm:w-auto bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl text-xs font-bold px-6 py-2.5"
                >
                  Enter Classroom
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setJoinedResult(null);
                    setClassCode('');
                  }}
                  className="w-full sm:w-auto text-xs rounded-xl font-semibold"
                >
                  Join Another Class
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="rounded-2xl border-slate-100 shadow-sm bg-white overflow-hidden">
              <CardHeader className="p-6 border-b border-slate-100 bg-gradient-to-r from-blue-50/50 to-indigo-50/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#2563EB] flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900">
                      Enroll in a Class
                    </CardTitle>
                    <p className="text-xs text-slate-500">
                      Ask your instructor for the 6-character class code and enter it below.
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-4">
                {error && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleJoin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Class Joining Code
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={classCode}
                        onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                        placeholder="e.g. EDU-7X9K2P or 7X9K2P"
                        maxLength={12}
                        required
                        className="w-full px-4 py-3 text-sm font-mono tracking-wider uppercase font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      Class codes are typically formatted as <strong>EDU-XXXXXX</strong>.
                    </p>
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={loading || !classCode.trim()}
                      className="w-full bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl text-xs font-bold py-3 shadow-sm transition-all"
                    >
                      {loading ? 'Validating Code & Enrolling...' : 'Join Class Now'}
                    </Button>
                  </div>
                </form>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-500 space-y-1">
                  <p className="font-semibold text-slate-700">Need help joining?</p>
                  <p>
                    • Make sure you have entered the code accurately without extra spaces.
                    <br />
                    • If the code is rejected, check with your instructor if the class is archived.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
