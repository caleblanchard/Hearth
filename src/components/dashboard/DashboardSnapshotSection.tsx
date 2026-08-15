'use client';

import { MapPinIcon } from '@heroicons/react/24/outline';
import type {
  DashboardSnapshotCard,
  DashboardSnapshotTone,
} from '@/types/dashboard-snapshot';

function toneClasses(tone: DashboardSnapshotTone = 'neutral') {
  switch (tone) {
    case 'good':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'warning':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'alert':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  }
}

interface DashboardSnapshotSectionProps {
  card: DashboardSnapshotCard;
  style?: React.CSSProperties;
  onOpen: (href: string) => void;
}

export default function DashboardSnapshotSection({
  card,
  style,
  onOpen,
}: DashboardSnapshotSectionProps) {
  const clickable = card.href.length > 0;

  return (
    <div
      style={style}
      className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-shadow ${
        clickable ? 'hover:shadow-lg cursor-pointer' : ''
      }`}
      onClick={() => {
        if (clickable) {
          onOpen(card.href);
        }
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {card.title}
        </h2>
        {card.badge && (
          <span
            className={`text-xs font-medium px-2.5 py-0.5 rounded ${toneClasses(
              card.badge.tone
            )}`}
          >
            {card.badge.label}
          </span>
        )}
      </div>

      {card.state === 'unavailable' && (
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          {card.unavailableMessage || 'This card is temporarily unavailable.'}
        </p>
      )}

      {card.state === 'empty' && (
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          {card.emptyMessage || 'No data available.'}
        </p>
      )}

      {card.state === 'ready' && (
        <>
          {card.kind === 'credits' && card.summary.length > 0 ? (
            <div className="space-y-2">
              {card.summary.map((row) => (
                <div
                  key={row.label}
                  className={`flex justify-between ${
                    row.label === 'Current Balance' ? 'text-sm' : 'text-xs'
                  }`}
                >
                  <span className="text-gray-600 dark:text-gray-400">
                    {row.label}
                  </span>
                  <span
                    className={`${
                      row.label === 'Current Balance'
                        ? 'text-gray-900 dark:text-white font-semibold'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          ) : card.kind === 'screentime' ? (
            <div>
              {card.summary.length > 0 && (
                <div className="mb-3 space-y-1">
                  {card.summary.map((row) => (
                    <div key={row.label} className="flex justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400">
                        {row.label}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-3">
                {card.preview.map((item) => (
                  <div
                    key={item.id}
                    className="border border-gray-200 dark:border-gray-700 rounded p-2"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.primary}
                      </span>
                      <span
                        className={`text-xs font-semibold ${
                          item.tone === 'alert'
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-green-600 dark:text-green-400'
                        }`}
                      >
                        {item.secondary}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${
                          item.tone === 'alert'
                            ? 'bg-red-600 dark:bg-red-400'
                            : 'bg-green-600 dark:bg-green-400'
                        }`}
                        style={{ width: `${item.progress ?? 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              {card.moreCount > 0 && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-3 text-center">
                  +{card.moreCount} more type{card.moreCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          ) : card.kind === 'calendar' ? (
            <div className="space-y-2">
              {card.preview.map((item) => (
                <div key={item.id} className="p-2 bg-gray-50 dark:bg-gray-700 rounded">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {item.primary}
                  </p>
                  {item.secondary && (
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {item.secondary}
                    </p>
                  )}
                  {item.meta && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                      <MapPinIcon className="h-3 w-3" />
                      {item.meta}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : card.kind === 'projects' ? (
            <div className="space-y-2">
              {card.preview.map((item) => (
                <div
                  key={item.id}
                  className="p-2 bg-gray-50 dark:bg-gray-700 rounded"
                  onClick={(event) => {
                    if (!item.href) {
                      return;
                    }
                    event.stopPropagation();
                    onOpen(item.href);
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.primary}
                      </p>
                      {item.secondary && (
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {item.secondary}
                        </p>
                      )}
                    </div>
                    {item.meta && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${toneClasses(
                          item.tone
                        )}`}
                      >
                        {item.meta}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {card.moreCount > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                  +{card.moreCount} more
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {card.summary.length > 0 && (
                <div className="space-y-1">
                  {card.summary.map((row) => (
                    <div key={row.label} className="flex justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400">
                        {row.label}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {card.preview.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {item.primary}
                    </p>
                    {item.secondary && (
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {item.secondary}
                      </p>
                    )}
                  </div>
                  {item.meta && (
                    <span
                      className={`text-xs px-2 py-1 rounded ${toneClasses(item.tone)}`}
                    >
                      {item.meta}
                    </span>
                  )}
                </div>
              ))}
              {card.moreCount > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                  +{card.moreCount} more
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
