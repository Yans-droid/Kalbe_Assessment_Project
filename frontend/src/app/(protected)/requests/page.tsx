'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Copy, Check, Filter, X as XIcon, FileSpreadsheet } from 'lucide-react';
import DataTable, { Column } from '@/components/DataTable';
import ActionMenu from '@/components/ActionMenu';
import FormDialog from '@/components/FormDialog';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast';
import { apiFetch } from '@/lib/api';
import { formatDate, truncateUuid, formatRupiahWithDecimals, cn } from '@/lib/formatters';
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
  const [activeFilters, setActiveFilters] = useState<{ lastStatus?: string; receivingStatus?: string }>({});

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
        leadTime:
          formData.leadTime !== undefined && formData.leadTime !== null && !isNaN(Number(formData.leadTime))
            ? Number(formData.leadTime)
            : null,
        receivedDate: formData.receivedDate ? new Date(formData.receivedDate).toISOString() : null,
        analysisWipDate: formData.analysisWipDate ? new Date(formData.analysisWipDate).toISOString() : null,
        analysisCompletedDate: formData.analysisCompletedDate
          ? new Date(formData.analysisCompletedDate).toISOString()
          : null,
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

  // Kolom persis sesuai spesifikasi:
  // Action (paling kiri •••), Request ID (18 char + hover tooltip), Company / Partner ID,
  // Project Code, Request Date (20 Jun 2025), Last Status, Receiving Status, Total Fee (rata kanan)
  const columns: Column<RequestItem>[] = [
    {
      key: 'actions',
      label: 'Action',
      render: (item) => (
        <ActionMenu
          onEdit={() => handleOpenEdit(item)}
          onDelete={() => handleOpenDelete(item)}
        />
      ),
    },
    {
      key: 'id',
      label: 'Request ID',
      render: (item) => (
        <div
          className="flex items-center gap-1.5 font-mono text-xs text-gray-700"
          title={item.id}
        >
          <span className="cursor-help">{truncateUuid(item.id, 18)}</span>
          <button
            type="button"
            onClick={() => copyToClipboard(item.id, item.id)}
            className="p-1 text-gray-400 hover:text-gray-700 rounded transition-colors"
            title="Copy full Request ID"
          >
            {copiedId === item.id ? (
              <Check className="w-3.5 h-3.5 text-[#008444]" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      ),
    },
    {
      key: 'partnerId',
      label: 'Company / Partner ID',
      render: (item) => (
        <div
          className="flex items-center gap-1.5 text-xs text-gray-600"
          title={item.partnerId || ''}
        >
          <span>{item.partnerId ? truncateUuid(item.partnerId, 14) : '-'}</span>
          {item.partnerId && (
            <button
              type="button"
              onClick={() => copyToClipboard(item.partnerId!, `partner-${item.id}`)}
              className="p-1 text-gray-400 hover:text-gray-700 rounded transition-colors"
              title="Copy Partner ID"
            >
              {copiedId === `partner-${item.id}` ? (
                <Check className="w-3.5 h-3.5 text-[#008444]" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          )}
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
      key: 'receivedDate',
      label: 'Request Date',
      sortable: true,
      render: (item) => (
        <span className="text-gray-600 text-xs font-medium whitespace-nowrap">
          {formatDate(item.receivedDate)}
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
          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-[#008444] border border-emerald-200">
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
        <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-700">
          {item.receivingStatus || '-'}
        </span>
      ),
    },
    {
      key: 'totalFee',
      label: 'Total Fee',
      sortable: true,
      align: 'right',
      render: (item) => (
        <span className="font-semibold text-gray-900 whitespace-nowrap">
          {formatRupiahWithDecimals(Number(item.totalFee) || 0)}
        </span>
      ),
    },
  ];

  const filterButtonNode = (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => setFilterOpen((prev) => !prev)}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-xs',
          hasActiveFilters
            ? 'bg-[#008444] text-white hover:bg-[#006b37]'
            : 'bg-[#008444] text-white hover:bg-[#006b37]'
        )}
      >
        <Filter className="w-3.5 h-3.5" />
        <span>Filter By</span>
        {hasActiveFilters && (
          <span className="bg-white text-[#008444] rounded-full text-[10px] font-bold px-1.5 py-0.2">
            {Object.values(activeFilters).filter(Boolean).length}
          </span>
        )}
      </button>
      {hasActiveFilters && (
        <button
          type="button"
          onClick={clearFilters}
          className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
          title="Clear filters"
        >
          <XIcon className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );

  const extraActionsNode = (
    <button
      type="button"
      onClick={() => showToast('info', 'RFA List: Showing standard Lab Analysis requests')}
      className="btn-secondary py-1.5 px-3 text-xs whitespace-nowrap"
      title="RFA List"
    >
      <FileSpreadsheet className="w-3.5 h-3.5 text-gray-500" />
      <span>RFA List</span>
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">
            Lab Analysis Request
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Manage all data</p>
        </div>
      </div>

      {/* Panel Filter Collapsible */}
      {filterOpen && (
        <div className="card p-4 border-[#008444]/20 bg-white shadow-sm animate-in fade-in-50 duration-150">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
            <span className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-[#008444]" /> Filter Parameters
            </span>
            <button
              type="button"
              onClick={() => setFilterOpen(false)}
              className="text-gray-400 hover:text-gray-600 text-xs"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="label-text text-xs">Last Status</label>
              <input
                type="text"
                value={filterLastStatus}
                onChange={(e) => setFilterLastStatus(e.target.value)}
                placeholder="e.g. SUBMITTED, WIP, COMPLETED"
                className="input-field text-xs py-1.5"
              />
            </div>
            <div>
              <label className="label-text text-xs">Receiving Status</label>
              <input
                type="text"
                value={filterReceivingStatus}
                onChange={(e) => setFilterReceivingStatus(e.target.value)}
                placeholder="e.g. RECEIVED, PENDING"
                className="input-field text-xs py-1.5"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={applyFilters}
                className="btn-primary py-1.5 px-4 text-xs font-semibold"
              >
                Apply
              </button>
              <button
                type="button"
                onClick={clearFilters}
                className="btn-secondary py-1.5 px-3 text-xs"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main DataTable */}
      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        error={error}
        onRetry={fetchData}
        searchValue={search}
        onSearch={handleSearch}
        onAdd={handleOpenAdd}
        addLabel="Add"
        filterButton={filterButtonNode}
        extraActions={extraActionsNode}
        emptyMessage="No lab analysis requests found. Click '+ Add' to create one."
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

      {/* Add / Edit Form Dialog: Responsive Grid & Max-H Scroll */}
      <FormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingItem ? `Edit Request: ${editingItem.projectCode}` : 'Add New Request'}
        onSubmit={handleSubmit(onSubmit)}
        loading={isSubmitting}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-h-[75vh] overflow-y-auto px-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="projectCode" className="label-text text-xs font-semibold">
                Project Code <span className="text-red-500">*</span>
              </label>
              <input
                id="projectCode"
                type="text"
                {...register('projectCode')}
                className={`input-field text-xs ${errors.projectCode ? 'input-error' : ''}`}
                placeholder="e.g. PRJ-2025-001"
              />
              {errors.projectCode && (
                <p className="error-text text-xs">{errors.projectCode.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="partnerId" className="label-text text-xs font-semibold">
                Company / Partner ID
              </label>
              <input
                id="partnerId"
                type="text"
                {...register('partnerId')}
                className="input-field text-xs font-mono"
                placeholder="Optional partner UUID"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="totalFee" className="label-text text-xs font-semibold">
                Total Fee (IDR) <span className="text-red-500">*</span>
              </label>
              <input
                id="totalFee"
                type="number"
                step="1000"
                {...register('totalFee')}
                className={`input-field text-xs ${errors.totalFee ? 'input-error' : ''}`}
                placeholder="e.g. 1500000"
              />
              {errors.totalFee && (
                <p className="error-text text-xs">{errors.totalFee.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="leadTime" className="label-text text-xs font-semibold">
                Lead Time (days)
              </label>
              <input
                id="leadTime"
                type="number"
                {...register('leadTime')}
                className="input-field text-xs"
                placeholder="Auto-calculated from dates"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="lastStatus" className="label-text text-xs font-semibold">
                Last Status
              </label>
              <input
                id="lastStatus"
                type="text"
                {...register('lastStatus')}
                className="input-field text-xs"
                placeholder="e.g. SUBMITTED, WIP, COMPLETED"
              />
            </div>

            <div>
              <label htmlFor="receivingStatus" className="label-text text-xs font-semibold">
                Receiving Status
              </label>
              <input
                id="receivingStatus"
                type="text"
                {...register('receivingStatus')}
                className="input-field text-xs"
                placeholder="e.g. RECEIVED, PENDING"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="receivedDate" className="label-text text-xs font-semibold">
                Received Date
              </label>
              <input
                id="receivedDate"
                type="date"
                {...register('receivedDate')}
                className="input-field text-xs"
              />
            </div>

            <div>
              <label htmlFor="analysisWipDate" className="label-text text-xs font-semibold">
                Analysis WIP Date
              </label>
              <input
                id="analysisWipDate"
                type="date"
                {...register('analysisWipDate')}
                className="input-field text-xs"
              />
            </div>

            <div>
              <label htmlFor="analysisCompletedDate" className="label-text text-xs font-semibold">
                Completed Date
              </label>
              <input
                id="analysisCompletedDate"
                type="date"
                {...register('analysisCompletedDate')}
                className={`input-field text-xs ${errors.analysisCompletedDate ? 'input-error' : ''}`}
              />
              {errors.analysisCompletedDate && (
                <p className="error-text text-xs">{errors.analysisCompletedDate.message}</p>
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
