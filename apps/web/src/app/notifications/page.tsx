'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useSocket, NotificationItem } from '@/contexts/SocketContext';
import { apiClient } from '@/lib/axios';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bell,
  CheckCheck,
  Trash2,
  ExternalLink,
  BookOpen,
  GraduationCap,
  FileCheck2,
  Users,
  Info,
  Clock,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';

function formatDateTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function getNotificationTypeBadge(type: string) {
  switch (type) {
    case 'ASSIGNMENT_PUBLISHED':
      return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200">Assignment</Badge>;
    case 'GRADE_PUBLISHED':
      return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200">Grade</Badge>;
    case 'SUBMISSION_CREATED':
      return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200">Submission</Badge>;
    case 'STUDENT_JOINED':
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200">Enrollment</Badge>;
    case 'STUDENT_REMOVED':
      return <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-200">Class Update</Badge>;
    default:
      return <Badge variant="outline">Notification</Badge>;
  }
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'ASSIGNMENT_PUBLISHED':
      return <BookOpen className="w-5 h-5 text-blue-600" />;
    case 'GRADE_PUBLISHED':
      return <GraduationCap className="w-5 h-5 text-emerald-600" />;
    case 'SUBMISSION_CREATED':
      return <FileCheck2 className="w-5 h-5 text-purple-600" />;
    case 'STUDENT_JOINED':
    case 'STUDENT_REMOVED':
      return <Users className="w-5 h-5 text-amber-600" />;
    default:
      return <Info className="w-5 h-5 text-slate-600" />;
  }
}

export default function NotificationsPage() {
  const router = useRouter();
  const { markAsRead, markAllAsRead, deleteNotification, unreadCount } = useSocket();
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);

  const loadNotifications = async (targetPage = page, unreadOnly = activeTab === 'unread') => {
    try {
      setLoading(true);
      const res = await apiClient.get('/notifications', {
        params: {
          page: targetPage,
          limit: 15,
          unreadOnly: unreadOnly ? 'true' : undefined,
        },
      });

      if (res.data?.success && res.data?.data) {
        setNotifications(res.data.data.notifications || []);
        setTotal(res.data.data.total || 0);
        setTotalPages(res.data.data.totalPages || 1);
        setPage(res.data.data.page || 1);
      }
    } catch (err: any) {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications(1, activeTab === 'unread');
  }, [activeTab]);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteNotification(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setTotal((prev) => Math.max(0, prev - 1));
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleItemClick = async (notif: NotificationItem) => {
    if (!notif.isRead) {
      await markAsRead(notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
      );
    }
    if (notif.link) {
      router.push(notif.link);
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout title="Notifications" showSearch={false}>
        <div className="space-y-6">
          {/* Top Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Activity & Notifications
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Stay up to date with class updates, submissions, deadlines, and grade feedback.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  onClick={handleMarkAllRead}
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-slate-200 text-xs font-semibold flex items-center gap-1.5"
                >
                  <CheckCheck className="w-4 h-4 text-blue-600" />
                  Mark all as read
                </Button>
              )}
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
                activeTab === 'all'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              All Notifications
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  activeTab === 'all' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {activeTab === 'all' ? total : ''}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('unread')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
                activeTab === 'unread'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Unread Only
              {unreadCount > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    activeTab === 'unread'
                      ? 'bg-blue-700 text-white'
                      : 'bg-blue-100 text-blue-700 font-bold'
                  }`}
                >
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Notification List */}
          <Card className="rounded-2xl border-slate-100 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-slate-400 text-sm">Loading notifications...</div>
              ) : notifications.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Bell className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">No notifications found</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    {activeTab === 'unread'
                      ? 'You have read all your notifications! Great job staying organized.'
                      : 'When new classes, assignments, submissions or grades occur, they will appear here.'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleItemClick(notif)}
                      className={`p-4 sm:p-5 flex items-start gap-4 hover:bg-slate-50 transition-colors cursor-pointer ${
                        !notif.isRead ? 'bg-blue-50/30' : ''
                      }`}
                    >
                      {/* Icon */}
                      <div className="p-3 rounded-2xl bg-slate-100 flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notif.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h4
                            className={`text-sm ${
                              !notif.isRead
                                ? 'font-bold text-slate-900'
                                : 'font-semibold text-slate-800'
                            }`}
                          >
                            {notif.title}
                          </h4>
                          {getNotificationTypeBadge(notif.type)}
                          {!notif.isRead && (
                            <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />
                          )}
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                          {notif.message}
                        </p>

                        <div className="flex items-center gap-4 mt-3 text-[11px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDateTime(notif.createdAt)}
                          </span>

                          {notif.link && (
                            <span className="text-blue-600 font-semibold flex items-center gap-1 hover:underline">
                              Go to details <ExternalLink className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!notif.isRead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleMarkAsRead(notif.id, e)}
                            title="Mark as read"
                            className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                          >
                            <CheckCheck className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleDelete(notif.id, e)}
                          title="Delete notification"
                          className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2 pt-2">
              <p className="text-xs text-slate-500 font-medium">
                Page {page} of {totalPages} ({total} total)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => {
                    const prev = Math.max(1, page - 1);
                    setPage(prev);
                    loadNotifications(prev);
                  }}
                  className="rounded-xl text-xs"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => {
                    const next = Math.min(totalPages, page + 1);
                    setPage(next);
                    loadNotifications(next);
                  }}
                  className="rounded-xl text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
