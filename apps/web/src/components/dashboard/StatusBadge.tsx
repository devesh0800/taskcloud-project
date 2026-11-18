import React from 'react';
import { Badge } from '@/components/ui/badge';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const getBadgeStyle = () => {
    switch (status.toUpperCase()) {
      case 'PUBLISHED':
      case 'EVALUATED':
      case 'ACTIVE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'DRAFT':
      case 'PENDING':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'SUBMITTED':
      case 'UNDER_REVIEW':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'LATE':
      case 'OVERDUE':
      case 'INACTIVE':
      case 'RESUBMISSION_REQUIRED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'CLOSED':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const formatText = (text: string) => {
    return text.replace(/_/g, ' ');
  };

  return (
    <Badge
      variant="outline"
      className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${getBadgeStyle()} ${className}`}
    >
      {formatText(status)}
    </Badge>
  );
}
