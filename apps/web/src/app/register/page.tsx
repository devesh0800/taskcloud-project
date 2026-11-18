'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  GraduationCap,
  BookOpen,
  ArrowLeft,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Building2,
  Hash,
  BookMarked,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { toast } from 'sonner';

export default function RegisterPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout, registerTeacher, registerStudent } = useAuth();

  const [role, setRole] = useState<'STUDENT' | 'TEACHER'>('STUDENT');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Teacher-specific fields
  const [teacherId, setTeacherId] = useState('');
  const [department, setDepartment] = useState('');

  // Student-specific fields
  const [studentId, setStudentId] = useState('');
  const [course, setCourse] = useState('');
  const [semester, setSemester] = useState('1');
  const [section, setSection] = useState('A');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters long.');
      return;
    }

    if (!/[A-Z]/.test(password)) {
      toast.error('Password must contain at least one uppercase letter (A-Z).');
      return;
    }

    if (!/[a-z]/.test(password)) {
      toast.error('Password must contain at least one lowercase letter (a-z).');
      return;
    }

    if (!/[0-9]/.test(password)) {
      toast.error('Password must contain at least one number (0-9). Example: Teacher123@');
      return;
    }

    setLoading(true);
    try {
      if (role === 'TEACHER') {
        await registerTeacher({
          fullName,
          email,
          password,
          confirmPassword,
          teacherId: teacherId || undefined,
          department: department || undefined,
        });
      } else {
        if (!studentId || !course) {
          toast.error('Student ID and Course are required.');
          setLoading(false);
          return;
        }
        await registerStudent({
          fullName,
          email,
          password,
          confirmPassword,
          studentId,
          course,
          semester,
          section,
        });
      }

      router.push('/login');
    } catch {
      setLoading(false);
    }
  };

  const userDashboard =
    user?.role === 'TEACHER'
      ? '/teacher/dashboard'
      : user?.role === 'ADMIN'
      ? '/admin/dashboard'
      : '/student/dashboard';

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center p-4 py-12">
      <div className="mb-6">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-2 text-slate-600 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4" /> Back to EduSync
          </Button>
        </Link>
      </div>

      {isAuthenticated && user ? (
        <Card className="w-full max-w-md border-border shadow-md bg-white text-center p-2">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center mb-3 shadow-sm border border-blue-100">
              <GraduationCap className="w-6 h-6" />
            </div>
            <CardTitle className="text-xl font-bold text-[#0F172A]">Already Signed In</CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-1">
              Active account already logged in
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-left text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Account:</span>
                <span className="font-semibold text-slate-800">{user.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Email:</span>
                <span className="text-slate-700 font-mono text-[11px]">{user.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Role:</span>
                <span className="font-bold text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                  {user.role}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <Button
                onClick={() => router.push(userDashboard)}
                className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold py-2.5 shadow-sm"
              >
                Go to My {user.role} Dashboard
              </Button>
              <Button
                onClick={async () => {
                  await logout();
                }}
                variant="outline"
                className="w-full border-slate-200 text-rose-600 hover:bg-rose-50 font-semibold py-2.5"
              >
                Sign Out to Register Another Account
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
      <Card className="w-full max-w-lg border-border shadow-md bg-white">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 rounded-xl bg-[#172554] flex items-center justify-center text-white mb-2 shadow">
            <GraduationCap className="w-6 h-6 text-[#2563EB]" />
          </div>
          <CardTitle className="text-xl font-bold text-[#0F172A]">Create EduSync Account</CardTitle>
          <CardDescription>Select your academic profile to register</CardDescription>

          {/* Role Toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg mt-4">
            <button
              type="button"
              onClick={() => setRole('STUDENT')}
              className={`py-2 text-xs font-bold rounded-md flex items-center justify-center gap-2 transition-all ${
                role === 'STUDENT'
                  ? 'bg-white text-[#2563EB] shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-4 h-4" /> Student Portal
            </button>
            <button
              type="button"
              onClick={() => setRole('TEACHER')}
              className={`py-2 text-xs font-bold rounded-md flex items-center justify-center gap-2 transition-all ${
                role === 'TEACHER'
                  ? 'bg-white text-[#172554] shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-4 h-4" /> Teacher Portal
            </button>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-3.5 pt-4">
            {/* Common Fields */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Full Legal Name *</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Jordan Miller"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white text-slate-900 placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Institutional Email *</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@university.edu"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white text-slate-900 placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Role Specific Fields */}
            {role === 'TEACHER' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Teacher ID (Optional)</label>
                  <div className="relative">
                    <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={teacherId}
                      onChange={(e) => setTeacherId(e.target.value)}
                      placeholder="e.g. TCH-2026-04"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#172554] bg-white text-slate-900 placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Department (Optional)</label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="e.g. Computer Science"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#172554] bg-white text-slate-900 placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Student Roll / ID *</label>
                    <div className="relative">
                      <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value)}
                        placeholder="e.g. STU-2026-104"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white text-slate-900 placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Course / Major *</label>
                    <div className="relative">
                      <BookMarked className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        value={course}
                        onChange={(e) => setCourse(e.target.value)}
                        placeholder="e.g. B.Tech Computer Science"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white text-slate-900 placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Current Semester</label>
                    <select
                      value={semester}
                      onChange={(e) => setSemester(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white text-slate-900"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                        <option key={s} value={String(s)}>
                          Semester {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Section</label>
                    <input
                      type="text"
                      value={section}
                      onChange={(e) => setSection(e.target.value)}
                      placeholder="e.g. A"
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white text-slate-900"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Password Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Password *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="w-full pl-9 pr-9 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Confirm Password *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white text-slate-900"
                  />
                </div>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 pt-1">
              * Password must be at least 8 characters with 1 uppercase, 1 lowercase &amp; 1 number (e.g. Teacher123@)
            </p>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 pt-4">
            <Button
              type="submit"
              disabled={loading}
              className={`w-full text-white font-semibold shadow-sm ${
                role === 'TEACHER'
                  ? 'bg-[#172554] hover:bg-[#0b0f19]'
                  : 'bg-[#2563EB] hover:bg-[#1D4ED8]'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Creating Account...
                </>
              ) : (
                `Complete ${role === 'TEACHER' ? 'Teacher' : 'Student'} Registration`
              )}
            </Button>
            <p className="text-xs text-center text-slate-500">
              Already enrolled?{' '}
              <Link href="/login" className="text-[#2563EB] font-semibold hover:underline">
                Sign in to your account
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
      )}
    </div>
  );
}
