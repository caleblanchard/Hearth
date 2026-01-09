'use client';

import { useState } from 'react';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';

interface DashboardCustomizerButtonProps {
  onClick: () => void;
}

export default function DashboardCustomizerButton({
  onClick,
}: DashboardCustomizerButtonProps) {
  return (
    <button
      onClick={onClick}
      className="hidden md:flex fixed bottom-6 right-6 bg-ember-700 hover:bg-ember-500 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all hover:scale-110 z-50 items-center gap-2 ring-2 ring-white dark:ring-gray-700"
      aria-label="Customize Dashboard"
      title="Customize Dashboard"
    >
      <Cog6ToothIcon className="h-6 w-6" />
      <span className="hidden lg:inline font-medium">Customize</span>
    </button>
  );
}
