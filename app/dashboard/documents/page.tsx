'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  IdentificationIcon,
  BeakerIcon,
  CurrencyDollarIcon,
  HomeIcon,
  AcademicCapIcon,
  ScaleIcon,
  HeartIcon,
  DocumentIcon,
  ExclamationTriangleIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';

interface Document {
  id: string;
  name: string;
  category: string;
  fileSize: number;
  mimeType: string;
  documentNumber: string | null;
  issuedDate: string | null;
  expiresAt: string | null;
  tags: string[];
  notes: string | null;
  createdAt: string;
  uploader: { id: string; name: string };
}

const CATEGORY_LABELS: Record<string, string> = {
  IDENTITY: 'Identity',
  MEDICAL: 'Medical',
  FINANCIAL: 'Financial',
  HOUSEHOLD: 'Household',
  EDUCATION: 'Education',
  LEGAL: 'Legal',
  PETS: 'Pets',
  OTHER: 'Other',
};

const CATEGORY_ICONS: Record<string, typeof IdentificationIcon> = {
  IDENTITY: IdentificationIcon,
  MEDICAL: BeakerIcon,
  FINANCIAL: CurrencyDollarIcon,
  HOUSEHOLD: HomeIcon,
  EDUCATION: AcademicCapIcon,
  LEGAL: ScaleIcon,
  PETS: HeartIcon,
  OTHER: DocumentIcon,
};

export default function DocumentsPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [expiring, setExpiring] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadDocuments();
    loadExpiringDocuments();
  }, [filter]);

  const loadDocuments = async () => {
    try {
      const url = filter === 'all'
        ? '/api/documents'
        : `/api/documents?category=${filter}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to load documents');
      const data = await response.json();
      setDocuments(data.documents);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadExpiringDocuments = async () => {
    try {
      const response = await fetch('/api/documents/expiring?days=90');
      if (!response.ok) return;
      const data = await response.json();
      setExpiring(data.documents);
    } catch (err) {
      console.error(err);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const maskDocumentNumber = (num: string | null): string | null => {
    if (!num || num.length <= 4) return num;
    return '****' + num.slice(-4);
  };

  const getDaysUntilExpiry = (expiresAt: string): number => {
    const expiry = new Date(expiresAt);
    const now = new Date();
    return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-gray-600 dark:text-gray-400">Loading documents...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Document Vault
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Secure storage for important family documents
          </p>
        </div>
        <button
          onClick={() => router.push('/dashboard/documents/upload')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          Upload Document
        </button>
      </div>

      {/* Expiring Soon Alert */}
      {expiring.length > 0 && (
        <div className="bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-orange-900 dark:text-orange-100 mb-2 flex items-center gap-2">
            <ExclamationTriangleIcon className="h-5 w-5" />
            Documents Expiring Soon
          </h2>
          <div className="space-y-2">
            {expiring.map(doc => (
              <div key={doc.id} className="text-sm text-orange-800 dark:text-orange-300">
                {doc.name} - Expires in {getDaysUntilExpiry(doc.expiresAt!)} days
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 rounded ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
        >
          All
        </button>
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
          const Icon = CATEGORY_ICONS[key];
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1 rounded flex items-center gap-2 ${filter === key ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          );
        })}
      </div>

      {/* Documents Grid */}
      {documents.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">
            No documents yet. Upload important family documents to keep them secure.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {documents.map(doc => (
            <div
              key={doc.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3 mb-3">
                {(() => {
                  const Icon = CATEGORY_ICONS[doc.category] || DocumentIcon;
                  return (
                    <div className="flex-shrink-0">
                      <Icon className="h-8 w-8 text-gray-600 dark:text-gray-400" />
                    </div>
                  );
                })()}
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {doc.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {CATEGORY_LABELS[doc.category]}
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="text-gray-600 dark:text-gray-400">
                  Size: {formatFileSize(doc.fileSize)}
                </div>
                {doc.documentNumber && (
                  <div className="text-gray-600 dark:text-gray-400">
                    Number: {maskDocumentNumber(doc.documentNumber)}
                  </div>
                )}
                {doc.expiresAt && (
                  <div className={`font-medium ${getDaysUntilExpiry(doc.expiresAt) < 30 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-600 dark:text-gray-400'}`}>
                    Expires: {new Date(doc.expiresAt).toLocaleDateString()}
                  </div>
                )}
                {doc.notes && (
                  <div className="text-gray-500 dark:text-gray-500 italic text-xs">
                    {doc.notes}
                  </div>
                )}
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Uploaded by {doc.uploader.name}
                </div>
              </div>

              {doc.tags.length > 0 && (
                <div className="flex gap-1 mt-3 flex-wrap">
                  {doc.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
