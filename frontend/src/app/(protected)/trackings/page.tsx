'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Copy, Check, Edit2, Trash2 } from 'lucide-react';
import DataTable, { Column } from '@/components/DataTable';
import FormDialog from '@/components/FormDialog';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast';
import { apiFetch } from '@/lib/api';
import { truncateUuid } from '@/lib/formatters';
import { trackingSchema, type TrackingFormData } from '@/lib/schemas';

interface TrackingItem extends Record<string, unknown> {
  id: string;
  trackerCode: string | null;
  value: string | null;
  trackerId: string;
  requestId: string;
  partnerId: string | null;
  isActive: boolean;
  createdBy: string | null;
  updatedBy: string | null;
}

interface PagingResponse<T> {
  items: T[];
  pageCurrent: number;
  totalItems: number;
  totalPages: number;
  pageSize: number;
}

export default function TrackingsPage() {
  const { showToast } = useToast();

  const [data, setData] = useState<TrackingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination & Sort & Search
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [sortBy, setSortBy] = useState('trackerCode');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');
  const [search, setSearch] = useState('');

  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TrackingItem | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<TrackingItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TrackingFormData>({
    resolver: zodResolver(trackingSchema),
    defaultValues: {
      trackerCode: '',
      value: '',
      trackerId: '',
      requestId: '',
      partnerId: '',
    },
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        sortBy,
        sortOrder,
      });
      if (search.trim()) {
        params.append('search', search.trim());
      }

      const res = await apiFetch<PagingResponse<TrackingItem>>(`/api/trackings?${params.toString()}`);
      setData(res.items || []);
      setTotalItems(res.totalItems || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load trackings';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, sortBy, sortOrder, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortBy(field);
      setSortOrder('ASC');
    }
    setPage(1);
  };

  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    showToast('info', 'ID copied to clipboard');
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    reset({
      trackerCode: '',
      value: '',
      trackerId: '',
      requestId: '',
      partnerId: '',
    });
    setFormOpen(true);
  };

  const handleOpenEdit = (item: TrackingItem) => {
    setEditingItem(item);
    reset({
      trackerCode: item.trackerCode || '',
      value: item.value || '',
      trackerId: item.trackerId || '',
      requestId: item.requestId || '',
      partnerId: item.partnerId || '',
    });
    setFormOpen(true);
  };

  const handleOpenDelete = (item: TrackingItem) => {
    setDeletingItem(item);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    setIsDeleting(true);
    try {
      await apiFetch(`/api/trackings/${deletingItem.id}`, { method: 'DELETE' });
      showToast('success', `Tracking deleted successfully.`);
      setDeleteOpen(false);
      setDeletingItem(null);
      fetchData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete tracking';
      showToast('error', msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const onSubmit = async (formData: TrackingFormData) => {
    try {
      const payload = {
        trackerCode: formData.trackerCode.trim(),
        value: formData.value?.trim() || null,
        trackerId: formData.trackerId.trim(),
        requestId: formData.requestId.trim(),
        partnerId: formData.partnerId?.trim() || null,
      };

      if (editingItem) {
        await apiFetch(`/api/trackings/${editingItem.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            ...payload,
            id: editingItem.id,
            isActive: true,
          }),
        });
        showToast('success', `Tracking updated successfully.`);
      } else {
        await apiFetch('/api/trackings', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        showToast('success', `Tracking created successfully.`);
      }
      setFormOpen(false);
      setEditingItem(null);
      fetchData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save tracking';
      showToast('error', msg);
    }
  };

  const columns: Column<TrackingItem>[] = [
    {
      key: 'trackerCode',
      label: 'Tracker Code',
      sortable: true,
      render: (item) => (
        <span className="font-semibold text-gray-900">{item.trackerCode || '-'}</span>
      ),
    },
    {
      key: 'value',
      label: 'Value',
      sortable: true,
      render: (item) => (
        <span className="text-gray-700">{item.value || '-'}</span>
      ),
    },
    {
      key: 'requestId',
      label: 'Request ID',
      sortable: true,
      render: (item) => (
        <div className="flex items-center gap-1.5 font-mono text-xs text-gray-600">
          <span>{truncateUuid(item.requestId)}</span>
          <button
            onClick={() => copyToClipboard(item.requestId, `req-${item.id}`)}
            className="p-1 text-gray-400 hover:text-gray-700 rounded transition-colors"
            title="Copy Request ID"
          >
            {copiedId === `req-${item.id}` ? (
              <Check className="w-3.5 h-3.5 text-kalbe-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      ),
    },
    {
      key: 'trackerId',
      label: 'Tracker ID',
      sortable: true,
      render: (item) => (
        <div className="flex items-center gap-1.5 font-mono text-xs text-gray-600">
          <span>{truncateUuid(item.trackerId)}</span>
          <button
            onClick={() => copyToClipboard(item.trackerId, `trk-${item.id}`)}
            className="p-1 text-gray-400 hover:text-gray-700 rounded transition-colors"
            title="Copy Tracker ID"
          >
            {copiedId === `trk-${item.id}` ? (
              <Check className="w-3.5 h-3.5 text-kalbe-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      ),
    },
    {
      key: 'partnerId',
      label: 'Partner ID',
      render: (item) => (
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <span>{item.partnerId ? truncateUuid(item.partnerId) : '-'}</span>
          {item.partnerId && (
            <button
              onClick={() => copyToClipboard(item.partnerId!, `partner-${item.id}`)}
              className="p-1 text-gray-400 hover:text-gray-700 rounded transition-colors"
              title="Copy Partner ID"
            >
              {copiedId === `partner-${item.id}` ? (
                <Check className="w-3.5 h-3.5 text-kalbe-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (item) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenEdit(item)}
            className="p-1.5 text-gray-500 hover:text-kalbe-600 hover:bg-kalbe-50 rounded transition-colors"
            title="Edit"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleOpenDelete(item)}
            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Transaction Trackings</h2>
          <p className="text-sm text-gray-500 mt-1">
            Associate trackers with customer requests and log step values.
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        error={error}
        onRetry={fetchData}
        searchValue={search}
        onSearch={handleSearch}
        onAdd={handleOpenAdd}
        addLabel="Add Tracking"
        emptyMessage="No transaction trackings found. Click 'Add Tracking' to create one."
        sort={{
          sortBy,
          sortOrder,
          onSort: handleSort,
        }}
        pagination={{
          page,
          pageSize,
          totalPages,
          totalItems,
          onPageChange: (p) => setPage(p),
          onPageSizeChange: (s) => {
            setPageSize(s);
            setPage(1);
          },
        }}
      />

      {/* Add / Edit Form Dialog */}
      <FormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingItem ? `Edit Tracking: ${editingItem.trackerCode}` : 'Add New Tracking'}
        onSubmit={handleSubmit(onSubmit)}
        loading={isSubmitting}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="trackerCode" className="label-text">
                Tracker Code <span className="text-red-500">*</span>
              </label>
              <input
                id="trackerCode"
                type="text"
                {...register('trackerCode')}
                className={`input-field ${errors.trackerCode ? 'input-error' : ''}`}
                placeholder="e.g. TRK-01"
              />
              {errors.trackerCode && (
                <p className="error-text">{errors.trackerCode.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="value" className="label-text">
                Value
              </label>
              <input
                id="value"
                type="text"
                {...register('value')}
                className="input-field"
                placeholder="Value / status description"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="trackerId" className="label-text">
                Tracker ID (UUID) <span className="text-red-500">*</span>
              </label>
              <input
                id="trackerId"
                type="text"
                {...register('trackerId')}
                className={`input-field font-mono text-xs ${errors.trackerId ? 'input-error' : ''}`}
                placeholder="Target tracker UUID"
              />
              {errors.trackerId && (
                <p className="error-text">{errors.trackerId.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="requestId" className="label-text">
                Request ID (UUID) <span className="text-red-500">*</span>
              </label>
              <input
                id="requestId"
                type="text"
                {...register('requestId')}
                className={`input-field font-mono text-xs ${errors.requestId ? 'input-error' : ''}`}
                placeholder="Target request UUID"
              />
              {errors.requestId && (
                <p className="error-text">{errors.requestId.message}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="partnerId" className="label-text">
              Partner ID (UUID)
            </label>
            <input
              id="partnerId"
              type="text"
              {...register('partnerId')}
              className="input-field font-mono text-xs"
              placeholder="Optional partner UUID"
            />
          </div>
        </form>
      </FormDialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Tracking"
        message="Are you sure you want to delete this tracking entry? This will perform a soft delete."
        loading={isDeleting}
      />
    </div>
  );
}
