'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, X, Filter, X as XIcon } from 'lucide-react';
import DataTable, { Column } from '@/components/DataTable';
import ActionMenu from '@/components/ActionMenu';
import FormDialog from '@/components/FormDialog';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast';
import { apiFetch } from '@/lib/api';
import { trackerSchema, type TrackerFormData } from '@/lib/schemas';
import { cn } from '@/lib/formatters';

interface TrackerItem extends Record<string, unknown> {
  id: string;
  code: string;
  parentCode: string | null;
  description: string | null;
  actionType: string | null;
  moduleFlow: string | null;
  isUsingNotification: boolean;
  isPublic: boolean;
  icon: string | null;
  order: number;
  mandays: number;
  isParallel: boolean;
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

export default function TrackersPage() {
  const { showToast } = useToast();

  const [data, setData] = useState<TrackerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination & Sort & Search
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [sortBy, setSortBy] = useState('code');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');
  const [search, setSearch] = useState('');

  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TrackerItem | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<TrackerItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter By state
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterCode, setFilterCode] = useState('');
  const [filterActionType, setFilterActionType] = useState('');
  const [filterModuleFlow, setFilterModuleFlow] = useState('');
  const [activeFilters, setActiveFilters] = useState<{
    code?: string;
    actionType?: string;
    moduleFlow?: string;
  }>({});

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TrackerFormData>({
    resolver: zodResolver(trackerSchema),
    defaultValues: {
      code: '',
      parentCode: '',
      description: '',
      actionType: 'none',
      moduleFlow: '',
      icon: '',
      order: 0,
      mandays: 0,
      isUsingNotification: false,
      isPublic: false,
      isParallel: false,
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
      const filterObj: Record<string, string> = {};
      if (activeFilters.code) filterObj.code = activeFilters.code;
      if (activeFilters.actionType) filterObj.actionType = activeFilters.actionType;
      if (activeFilters.moduleFlow) filterObj.moduleFlow = activeFilters.moduleFlow;

      if (Object.keys(filterObj).length > 0) {
        params.append('include', btoa(JSON.stringify(filterObj)));
      }

      const res = await apiFetch<PagingResponse<TrackerItem>>(`/api/trackers?${params.toString()}`);
      setData(res.items || []);
      setTotalItems(res.totalItems || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load trackers';
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
      code: filterCode.trim() || undefined,
      actionType: filterActionType.trim() || undefined,
      moduleFlow: filterModuleFlow.trim() || undefined,
    });
    setPage(1);
    setFilterOpen(false);
  };

  const clearFilters = () => {
    setFilterCode('');
    setFilterActionType('');
    setFilterModuleFlow('');
    setActiveFilters({});
    setPage(1);
    setFilterOpen(false);
  };

  const hasActiveFilters = Object.values(activeFilters).some(Boolean);

  const handleOpenAdd = () => {
    setEditingItem(null);
    reset({
      code: '',
      parentCode: '',
      description: '',
      actionType: 'none',
      moduleFlow: '',
      icon: '',
      order: 0,
      mandays: 0,
      isUsingNotification: false,
      isPublic: false,
      isParallel: false,
    });
    setFormOpen(true);
  };

  const handleOpenEdit = (item: TrackerItem) => {
    setEditingItem(item);
    reset({
      code: item.code || '',
      parentCode: item.parentCode || '',
      description: item.description || '',
      actionType: (item.actionType as 'none' | 'text' | 'file' | 'date') || 'none',
      moduleFlow: item.moduleFlow || '',
      icon: item.icon || '',
      order: item.order ?? 0,
      mandays: item.mandays ?? 0,
      isUsingNotification: !!item.isUsingNotification,
      isPublic: !!item.isPublic,
      isParallel: !!item.isParallel,
    });
    setFormOpen(true);
  };

  const handleOpenDelete = (item: TrackerItem) => {
    setDeletingItem(item);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    setIsDeleting(true);
    try {
      await apiFetch(`/api/trackers/${deletingItem.id}`, { method: 'DELETE' });
      showToast('success', `Tracker "${deletingItem.code}" deleted successfully.`);
      setDeleteOpen(false);
      setDeletingItem(null);
      fetchData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete tracker';
      showToast('error', msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const onSubmit = async (formData: TrackerFormData) => {
    try {
      const payload = {
        code: formData.code.trim(),
        parentCode: formData.parentCode?.trim() || null,
        description: formData.description.trim(),
        actionType: formData.actionType,
        moduleFlow: formData.moduleFlow?.trim() || null,
        icon: formData.icon?.trim() || null,
        order: Number(formData.order) || 0,
        mandays: Number(formData.mandays) || 0,
        isUsingNotification: !!formData.isUsingNotification,
        isPublic: !!formData.isPublic,
        isParallel: !!formData.isParallel,
      };

      if (editingItem) {
        await apiFetch(`/api/trackers/${editingItem.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            ...payload,
            id: editingItem.id,
            isActive: true,
          }),
        });
        showToast('success', `Tracker "${formData.code}" updated successfully.`);
      } else {
        await apiFetch('/api/trackers', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        showToast('success', `Tracker "${formData.code}" created successfully.`);
      }
      setFormOpen(false);
      setEditingItem(null);
      fetchData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save tracker';
      showToast('error', msg);
    }
  };

  // Kolom persis: Action di paling kiri dengan ••• dropdown
  const columns: Column<TrackerItem>[] = [
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
      key: 'code',
      label: 'Tracker Code',
      sortable: true,
      render: (item) => (
        <span className="font-semibold text-gray-900">{item.code}</span>
      ),
    },
    {
      key: 'parentCode',
      label: 'Parent Code',
      render: (item) => (
        <span className="text-gray-500">{item.parentCode || '-'}</span>
      ),
    },
    {
      key: 'description',
      label: 'Description',
      render: (item) => (
        <span className="max-w-xs truncate block text-gray-700" title={item.description || ''}>
          {item.description || '-'}
        </span>
      ),
    },
    {
      key: 'actionType',
      label: 'Action Type',
      sortable: true,
      render: (item) => (
        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-700">
          {item.actionType || 'none'}
        </span>
      ),
    },
    {
      key: 'moduleFlow',
      label: 'Module Flow',
      render: (item) => (
        <span className="text-gray-600 text-xs">{item.moduleFlow || '-'}</span>
      ),
    },
    {
      key: 'order',
      label: 'Order',
      sortable: true,
      align: 'center',
      render: (item) => (
        <span className="font-mono text-xs">{item.order}</span>
      ),
    },
    {
      key: 'mandays',
      label: 'Mandays',
      sortable: true,
      align: 'center',
      render: (item) => (
        <span className="font-mono text-xs">
          {item.mandays < 0 ? '-' : `${item.mandays}d`}
        </span>
      ),
    },
    {
      key: 'isUsingNotification',
      label: 'Notification',
      align: 'center',
      render: (item) => (
        <div className="flex justify-center">
          {item.isUsingNotification ? (
            <Check className="w-4 h-4 text-[#008444]" />
          ) : (
            <X className="w-4 h-4 text-gray-300" />
          )}
        </div>
      ),
    },
    {
      key: 'isPublic',
      label: 'Public',
      align: 'center',
      render: (item) => (
        <div className="flex justify-center">
          {item.isPublic ? (
            <Check className="w-4 h-4 text-[#008444]" />
          ) : (
            <X className="w-4 h-4 text-gray-300" />
          )}
        </div>
      ),
    },
    {
      key: 'isParallel',
      label: 'Parallel',
      align: 'center',
      render: (item) => (
        <div className="flex justify-center">
          {item.isParallel ? (
            <Check className="w-4 h-4 text-[#008444]" />
          ) : (
            <X className="w-4 h-4 text-gray-300" />
          )}
        </div>
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
          title="Clear filter"
        >
          <XIcon className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">
            Master Tracker
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Manage all data</p>
        </div>
      </div>

      {/* Filter Collapsible Panel */}
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="label-text text-xs">Tracker Code</label>
              <input
                type="text"
                value={filterCode}
                onChange={(e) => setFilterCode(e.target.value)}
                placeholder="e.g. ITSR, TRK"
                className="input-field text-xs py-1.5"
              />
            </div>
            <div>
              <label className="label-text text-xs">Action Type</label>
              <select
                value={filterActionType}
                onChange={(e) => setFilterActionType(e.target.value)}
                className="input-field text-xs py-1.5"
              >
                <option value="">All Action Types</option>
                <option value="none">none</option>
                <option value="text">text</option>
                <option value="file">file</option>
                <option value="date">date</option>
              </select>
            </div>
            <div>
              <label className="label-text text-xs">Module Flow</label>
              <input
                type="text"
                value={filterModuleFlow}
                onChange={(e) => setFilterModuleFlow(e.target.value)}
                placeholder="e.g. REQUEST, ANALYSIS"
                className="input-field text-xs py-1.5"
              />
            </div>
            <div className="sm:col-span-3 flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={clearFilters}
                className="btn-secondary py-1.5 px-3 text-xs"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={applyFilters}
                className="btn-primary py-1.5 px-4 text-xs font-semibold"
              >
                Apply
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
        emptyMessage="No trackers found. Click '+ Add' to create one."
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
        title={editingItem ? `Edit Tracker: ${editingItem.code}` : 'Add New Tracker'}
        onSubmit={handleSubmit(onSubmit)}
        loading={isSubmitting}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-h-[75vh] overflow-y-auto px-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="code" className="label-text text-xs font-semibold">
                Tracker Code <span className="text-red-500">*</span>
              </label>
              <input
                id="code"
                type="text"
                {...register('code')}
                className={`input-field text-xs ${errors.code ? 'input-error' : ''}`}
                placeholder="e.g. TRK-01"
              />
              {errors.code && <p className="error-text text-xs">{errors.code.message}</p>}
            </div>

            <div>
              <label htmlFor="parentCode" className="label-text text-xs font-semibold">
                Parent Code
              </label>
              <input
                id="parentCode"
                type="text"
                {...register('parentCode')}
                className="input-field text-xs"
                placeholder="Optional parent code"
              />
            </div>
          </div>

          <div>
            <label htmlFor="description" className="label-text text-xs font-semibold">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              rows={2}
              {...register('description')}
              className={`input-field text-xs ${errors.description ? 'input-error' : ''}`}
              placeholder="Detailed description of this tracker"
            />
            {errors.description && (
              <p className="error-text text-xs">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="actionType" className="label-text text-xs font-semibold">
                Action Type <span className="text-red-500">*</span>
              </label>
              <select
                id="actionType"
                {...register('actionType')}
                className={`input-field text-xs ${errors.actionType ? 'input-error' : ''}`}
              >
                <option value="none">none</option>
                <option value="text">text</option>
                <option value="file">file</option>
                <option value="date">date</option>
              </select>
              {errors.actionType && (
                <p className="error-text text-xs">{errors.actionType.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="moduleFlow" className="label-text text-xs font-semibold">
                Module Flow
              </label>
              <input
                id="moduleFlow"
                type="text"
                {...register('moduleFlow')}
                className="input-field text-xs"
                placeholder="e.g. LAB_FLOW"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="icon" className="label-text text-xs font-semibold">
                Icon
              </label>
              <input
                id="icon"
                type="text"
                {...register('icon')}
                className="input-field text-xs"
                placeholder="Icon name"
              />
            </div>

            <div>
              <label htmlFor="order" className="label-text text-xs font-semibold">
                Order (&gt;= -1)
              </label>
              <input
                id="order"
                type="number"
                {...register('order')}
                className={`input-field text-xs ${errors.order ? 'input-error' : ''}`}
              />
              {errors.order && <p className="error-text text-xs">{errors.order.message}</p>}
            </div>

            <div>
              <label htmlFor="mandays" className="label-text text-xs font-semibold">
                Mandays (&gt;= -1)
              </label>
              <input
                id="mandays"
                type="number"
                {...register('mandays')}
                className={`input-field text-xs ${errors.mandays ? 'input-error' : ''}`}
              />
              {errors.mandays && <p className="error-text text-xs">{errors.mandays.message}</p>}
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100 flex flex-wrap gap-6">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-700 font-medium">
              <input
                type="checkbox"
                {...register('isUsingNotification')}
                className="rounded border-gray-300 text-[#008444] focus:ring-[#008444]"
              />
              <span>Using Notification</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-700 font-medium">
              <input
                type="checkbox"
                {...register('isPublic')}
                className="rounded border-gray-300 text-[#008444] focus:ring-[#008444]"
              />
              <span>Is Public</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-700 font-medium">
              <input
                type="checkbox"
                {...register('isParallel')}
                className="rounded border-gray-300 text-[#008444] focus:ring-[#008444]"
              />
              <span>Is Parallel</span>
            </label>
          </div>
        </form>
      </FormDialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Tracker"
        message={`Are you sure you want to delete tracker "${deletingItem?.code}"? This will perform a soft delete.`}
        loading={isDeleting}
      />
    </div>
  );
}
