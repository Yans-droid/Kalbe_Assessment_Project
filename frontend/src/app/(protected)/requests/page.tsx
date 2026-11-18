'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Copy, Check, Edit2, Trash2, Filter, X as XIcon } from 'lucide-react';
import DataTable, { Column } from '@/components/DataTable';
import FormDialog from '@/components/FormDialog';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast';
import { apiFetch } from '@/lib/api';
import { formatRupiah, formatDate, truncateUuid } from '@/lib/formatters';
import { requestSchema, type RequestFormData } from '@/lib/schemas';

interface RequestItem extends Record<string, unknown> {
  id: string;
  partnerId: string | null;
  projectCode: string;
  totalFee: number;
  lastStatus: string | null;
  receivingStatus: string | null;
  leadTime: number | null;
  receivedDate: string | null;
  analysisWipDate: string | null;
  analysisCompletedDate: string | null;
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

function toInputDate(val: string | null | undefined): string {
  if (!val) return '';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  } catch {
    return '';
  }
}

export default function RequestsPage() {
  const { showToast } = useToast();

  const [data, setData] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination & Sort & Search
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [sortBy, setSortBy] = useState('projectCode');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');
  const [search, setSearch] = useState('');

  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RequestItem | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<RequestItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter By state
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterLastStatus, setFilterLastStatus] = useState('');
  const [filterReceivingStatus, setFilterReceivingStatus] = useState('');
  const [activeFilters, setActiveFilters] = useState<{lastStatus?: string; receivingStatus?: string}>({});

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      partnerId: '',
      projectCode: '',
      totalFee: 0,
      lastStatus: '',
      receivingStatus: '',
      leadTime: undefined,
      receivedDate: '',
      analysisWipDate: '',
      analysisCompletedDate: '',
    },
  });

  const wipDate = watch('analysisWipDate');
  const compDate = watch('analysisCompletedDate');

  // Auto calculate lead time if dates are chosen
  useEffect(() => {
    if (wipDate && compDate) {
      const d1 = new Date(wipDate);
      const d2 = new Date(compDate);
      if (!isNaN(d1.getTime()) && !isNaN(d2.getTime()) && d2 >= d1) {
        const diffDays = Math.round((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24));
        setValue('leadTime', diffDays);
      }
    }
  }, [wipDate, compDate, setValue]);

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
      // Build Base64 include filters for active filter values
      const includeFilters: Record<string, string>[] = [];
      if (activeFilters.lastStatus) {
        includeFilters.push({ lastStatus: activeFilters.lastStatus });
      }
      if (activeFilters.receivingStatus) {
        includeFilters.push({ receivingStatus: activeFilters.receivingStatus });
      }
      if (includeFilters.length > 0) {
        params.append('include', btoa(JSON.stringify(includeFilters)));
      }

      const res = await apiFetch<PagingResponse<RequestItem>>(`/api/requests?${params.toString()}`);
      setData(res.items || []);
      setTotalItems(res.totalItems || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load requests';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, sortBy, sortOrder, search, activeFilters]);

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

  const applyFilters = () => {
    setActiveFilters({
      lastStatus: filterLastStatus.trim() || undefined,
      receivingStatus: filterReceivingStatus.trim() || undefined,
    });
    setPage(1);
    setFilterOpen(false);
  };

  const clearFilters = () => {
    setFilterLastStatus('');
    setFilterReceivingStatus('');
    setActiveFilters({});
    setPage(1);
    setFilterOpen(false);
  };

  const hasActiveFilters = !!(activeFilters.lastStatus || activeFilters.receivingStatus);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    showToast('info', 'ID copied to clipboard');
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    reset({
      partnerId: '',
      projectCode: '',
      totalFee: 0,
      lastStatus: 'SUBMITTED',
      receivingStatus: 'RECEIVED',
      leadTime: undefined,
      receivedDate: new Date().toISOString().split('T')[0],
      analysisWipDate: '',
      analysisCompletedDate: '',
    });
    setFormOpen(true);
  };

  const handleOpenEdit = (item: RequestItem) => {
    setEditingItem(item);
    reset({
      partnerId: item.partnerId || '',
      projectCode: item.projectCode || '',
      totalFee: Number(item.totalFee) || 0,
      lastStatus: item.lastStatus || '',
      receivingStatus: item.receivingStatus || '',
      leadTime: item.leadTime ?? undefined,
      receivedDate: toInputDate(item.receivedDate),
      analysisWipDate: toInputDate(item.analysisWipDate),
      analysisCompletedDate: toInputDate(item.analysisCompletedDate),
    });
    setFormOpen(true);
  };

  const handleOpenDelete = (item: RequestItem) => {
    setDeletingItem(item);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    setIsDeleting(true);
    try {
      await apiFetch(`/api/requests/${deletingItem.id}`, { method: 'DELETE' });
      showToast('success', `Request "${deletingItem.projectCode}" deleted successfully.`);
      setDeleteOpen(false);
      setDeletingItem(null);
      fetchData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete request';
      showToast('error', msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const onSubmit = async (formData: RequestFormData) => {
    try {
      const payload = {
        partnerId: formData.partnerId?.trim() || null,
        projectCode: formData.projectCode.trim(),
        totalFee: Number(formData.totalFee),
        lastStatus: formData.lastStatus?.trim() || null,
        receivingStatus: formData.receivingStatus?.trim() || null,
        leadTime: formData.leadTime !== undefined && formData.leadTime !== null && !isNaN(Number(formData.leadTime))
          ? Number(formData.leadTime)
          : null,
        receivedDate: formData.receivedDate ? new Date(formData.receivedDate).toISOString() : null,
        analysisWipDate: formData.analysisWipDate ? new Date(formData.analysisWipDate).toISOString() : null,
        analysisCompletedDate: formData.analysisCompletedDate ? new Date(formData.analysisCompletedDate).toISOString() : null,
      };

      if (editingItem) {
        await apiFetch(`/api/requests/${editingItem.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            ...payload,
            id: editingItem.id,
            isActive: true,
          }),
        });
        showToast('success', `Request "${formData.projectCode}" updated successfully.`);
      } else {
        await apiFetch('/api/requests', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        showToast('success', `Request "${formData.projectCode}" created successfully.`);
      }
      setFormOpen(false);
      setEditingItem(null);
      fetchData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save request';
      showToast('error', msg);
    }
  };

  const columns: Column<RequestItem>[] = [
    {
      key: 'id',
      label: 'Request ID',
      render: (item) => (
        <div className="flex items-center gap-1.5 font-mono text-xs text-gray-700">
          <span>{truncateUuid(item.id)}</span>
          <button
            onClick={() => copyToClipboard(item.id, item.id)}
            className="p-1 text-gray-400 hover:text-gray-700 rounded transition-colors"
            title="Copy Request ID"
          >
            {copiedId === item.id ? (
              <Check className="w-3.5 h-3.5 text-kalbe-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      ),
    },
    {
      key: 'projectCode',
      label: 'Project Code',
      sortable: true,
      render: (item) => (
        <span className="font-semibold text-gray-900">{item.projectCode}</span>
      ),
    },
    {
      key: 'partnerId',
      label: 'Partner / Company',
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
      key: 'totalFee',
      label: 'Total Fee',
      sortable: true,
      render: (item) => (
        <span className="font-medium text-gray-900">
          {formatRupiah(Number(item.totalFee) || 0)}
        </span>
      ),
    },
    {
      key: 'lastStatus',
      label: 'Last Status',
      sortable: true,
      render: (item) => {
        const status = item.lastStatus || '-';
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-kalbe-50 text-kalbe-700 border border-kalbe-200">
            {status}
          </span>
        );
      },
    },
    {
      key: 'receivingStatus',
      label: 'Receiving Status',
      sortable: true,
      render: (item) => (
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
          {item.receivingStatus || '-'}
        </span>
      ),
    },
    {
      key: 'receivedDate',
      label: 'Received Date',
      sortable: true,
      render: (item) => (
        <span className="text-gray-600 text-xs">{formatDate(item.receivedDate)}</span>
      ),
    },
    {
      key: 'leadTime',
      label: 'Lead Time',
      render: (item) => (
        <span className="text-gray-700 font-mono text-xs">
          {item.leadTime != null ? `${item.leadTime} days` : '-'}
        </span>
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
          <h2 className="text-2xl font-bold text-gray-900">Transaction Requests</h2>
          <p className="text-sm text-gray-500 mt-1">
            Track customer requests, project codes, SLA lead times, and analysis status.
          </p>
        </div>
        {/* Filter By button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm border transition-colors ${
              hasActiveFilters
                ? 'bg-kalbe-500 text-white border-kalbe-500'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filter By
            {hasActiveFilters && (
              <span className="bg-white text-kalbe-600 rounded-full text-xs font-bold px-1.5 py-0.5 leading-none">
                {Object.values(activeFilters).filter(Boolean).length}
              </span>
            )}
          </button>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
              title="Clear filters"
            >
              <XIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter panel */}
      {filterOpen && (
        <div className="card p-4 border-kalbe-200 bg-kalbe-50">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="label-text">Last Status</label>
              <input
                type="text"
                value={filterLastStatus}
                onChange={(e) => setFilterLastStatus(e.target.value)}
                placeholder="e.g. SUBMITTED, WIP..."
                className="input-field"
              />
            </div>
            <div className="flex-1">
              <label className="label-text">Receiving Status</label>
              <input
                type="text"
                value={filterReceivingStatus}
                onChange={(e) => setFilterReceivingStatus(e.target.value)}
                placeholder="e.g. RECEIVED, PENDING..."
                className="input-field"
              />
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={applyFilters} className="btn-primary">Apply</button>
              <button onClick={clearFilters} className="btn-secondary">Clear</button>
            </div>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        error={error}
        onRetry={fetchData}
        searchValue={search}
        onSearch={handleSearch}
        onAdd={handleOpenAdd}
        addLabel="Add Request"
        emptyMessage="No transaction requests found. Click 'Add Request' to create one."
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
        title={editingItem ? `Edit Request: ${editingItem.projectCode}` : 'Add New Request'}
        onSubmit={handleSubmit(onSubmit)}
        loading={isSubmitting}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="projectCode" className="label-text">
                Project Code <span className="text-red-500">*</span>
              </label>
              <input
                id="projectCode"
                type="text"
                {...register('projectCode')}
                className={`input-field ${errors.projectCode ? 'input-error' : ''}`}
                placeholder="e.g. PRJ-2025-001"
              />
              {errors.projectCode && (
                <p className="error-text">{errors.projectCode.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="partnerId" className="label-text">
                Partner ID
              </label>
              <input
                id="partnerId"
                type="text"
                {...register('partnerId')}
                className="input-field"
                placeholder="Optional partner UUID"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="totalFee" className="label-text">
                Total Fee (IDR) <span className="text-red-500">*</span>
              </label>
              <input
                id="totalFee"
                type="number"
                step="1000"
                {...register('totalFee')}
                className={`input-field ${errors.totalFee ? 'input-error' : ''}`}
                placeholder="e.g. 1500000"
              />
              {errors.totalFee && (
                <p className="error-text">{errors.totalFee.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="leadTime" className="label-text">
                Lead Time (days)
              </label>
              <input
                id="leadTime"
                type="number"
                {...register('leadTime')}
                className="input-field"
                placeholder="Auto-calculated if dates set"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="lastStatus" className="label-text">
                Last Status
              </label>
              <input
                id="lastStatus"
                type="text"
                {...register('lastStatus')}
                className="input-field"
                placeholder="e.g. SUBMITTED, WIP, COMPLETED"
              />
            </div>

            <div>
              <label htmlFor="receivingStatus" className="label-text">
                Receiving Status
              </label>
              <input
                id="receivingStatus"
                type="text"
                {...register('receivingStatus')}
                className="input-field"
                placeholder="e.g. RECEIVED, PENDING"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="receivedDate" className="label-text">
                Received Date
              </label>
              <input
                id="receivedDate"
                type="date"
                {...register('receivedDate')}
                className="input-field"
              />
            </div>

            <div>
              <label htmlFor="analysisWipDate" className="label-text">
                Analysis WIP Date
              </label>
              <input
                id="analysisWipDate"
                type="date"
                {...register('analysisWipDate')}
                className="input-field"
              />
            </div>

            <div>
              <label htmlFor="analysisCompletedDate" className="label-text">
                Completed Date
              </label>
              <input
                id="analysisCompletedDate"
                type="date"
                {...register('analysisCompletedDate')}
                className={`input-field ${errors.analysisCompletedDate ? 'input-error' : ''}`}
              />
              {errors.analysisCompletedDate && (
                <p className="error-text">{errors.analysisCompletedDate.message}</p>
              )}
            </div>
          </div>
        </form>
      </FormDialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Request"
        message={`Are you sure you want to delete request "${deletingItem?.projectCode}"? This will perform a soft delete.`}
        loading={isDeleting}
      />
    </div>
  );
}
