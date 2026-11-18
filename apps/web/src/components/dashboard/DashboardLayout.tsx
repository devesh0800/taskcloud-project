'use client';

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface DashboardLayoutProps {
  children: React.ReactNode;
  currentTab?: string;
  onSelectTab?: (tab: string) => void;
  title?: string;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  showSearch?: boolean;
}

export function DashboardLayout({
  children,
  currentTab = 'overview',
  onSelectTab,
  title = 'Dashboard',
  searchValue,
  onSearchChange,
  showSearch = true,
}: DashboardLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={onSelectTab}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Main Body with left margin for md desktop sidebar */}
      <div className="md:pl-64 flex flex-col min-h-screen">
        <Header
          title={title}
          onOpenMobile={() => setMobileOpen(true)}
          searchValue={searchValue}
          onSearchChange={onSearchChange}
          showSearch={showSearch}
        />

        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
