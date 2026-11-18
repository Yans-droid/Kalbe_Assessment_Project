'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, X, Edit2, Trash2 } from 'lucide-react';
import DataTable, { Column } from '@/components/DataTable';
import FormDialog from '@/components/FormDialog';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast';
import { apiFetch } from '@/lib/api';
import { trackerSchema, type TrackerFormData } from '@/lib/schemas';

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
      if (editingItem) {
        await apiFetch(`/api/trackers/${editingItem.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            ...formData,
            id: editingItem.id,
            isActive: true,
          }),
        });
        showToast('success', `Tracker "${formData.code}" updated successfully.`);
      } else {
        await apiFetch('/api/trackers', {
          method: 'POST',
          body: JSON.stringify(formData),
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

  const columns: Column<TrackerItem>[] = [
    {
      key: 'code',
      label: 'Code',
      sortable: true,
      render: (item) => (
        <span className="font-semibold text-gray-900">{item.code}</span>
      ),
    },
    {
      key: 'description',
      label: 'Description',
      sortable: true,
      render: (item) => (
        <span className="text-gray-700 max-w-xs truncate block" title={item.description || ''}>
          {item.description || '-'}
        </span>
      ),
    },
    {
      key: 'actionType',
      label: 'Action Type',
      sortable: true,
      render: (item) => {
        const type = item.actionType || 'none';
        const colors: Record<string, string> = {
          none: 'bg-gray-100 text-gray-700',
          text: 'bg-blue-100 text-blue-700',
          file: 'bg-purple-100 text-purple-700',
          date: 'bg-amber-100 text-amber-700',
        };
        return (
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${colors[type] || 'bg-gray-100 text-gray-700'}`}>
            {type}
          </span>
        );
      },
    },
    {
      key: 'moduleFlow',
      label: 'Module Flow',
      sortable: true,
      render: (item) => <span className="text-gray-600">{item.moduleFlow || '-'}</span>,
    },
    {
      key: 'order',
      label: 'Order',
      sortable: true,
      render: (item) => <span className="text-gray-700 font-mono block text-center">{item.order}</span>,
    },
    {
      key: 'mandays',
      label: 'Mandays',
      sortable: true,
      render: (item) => (
        <span className="text-gray-700 font-mono block text-center">
          {item.mandays != null && item.mandays < 0 ? '-' : item.mandays}
        </span>
      ),
    },
    {
      key: 'isUsingNotification',
      label: 'Notification',
      render: (item) => (
        <div className="flex justify-center">
          {item.isUsingNotification ? (
            <Check className="w-4 h-4 text-kalbe-500" />
          ) : (
            <X className="w-4 h-4 text-gray-300" />
          )}
        </div>
      ),
    },
    {
      key: 'isPublic',
      label: 'Public',
      render: (item) => (
        <div className="flex justify-center">
          {item.isPublic ? (
            <Check className="w-4 h-4 text-kalbe-500" />
          ) : (
            <X className="w-4 h-4 text-gray-300" />
          )}
        </div>
      ),
    },
    {
      key: 'isParallel',
      label: 'Parallel',
      render: (item) => (
        <div className="flex justify-center">
          {item.isParallel ? (
            <Check className="w-4 h-4 text-kalbe-500" />
          ) : (
            <X className="w-4 h-4 text-gray-300" />
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
          <h2 className="text-2xl font-bold text-gray-900">Master Trackers</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage workflow trackers, SLA mandays, and process flow definitions.
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
        addLabel="Add Tracker"
        emptyMessage="No trackers found. Click 'Add Tracker' to create one."
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
        title={editingItem ? `Edit Tracker: ${editingItem.code}` : 'Add New Tracker'}
        onSubmit={handleSubmit(onSubmit)}
        loading={isSubmitting}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="code" className="label-text">
                Code <span className="text-red-500">*</span>
              </label>
              <input
                id="code"
                type="text"
                {...register('code')}
                className={`input-field uppercase ${errors.code ? 'input-error' : ''}`}
                placeholder="e.g. TRK-01"
              />
              {errors.code && <p className="error-text">{errors.code.message}</p>}
            </div>

            <div>
              <label htmlFor="parentCode" className="label-text">
                Parent Code
              </label>
              <input
                id="parentCode"
                type="text"
                {...register('parentCode')}
                className="input-field"
                placeholder="Optional parent code"
              />
            </div>
          </div>

          <div>
            <label htmlFor="description" className="label-text">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              rows={2}
              {...register('description')}
              className={`input-field ${errors.description ? 'input-error' : ''}`}
              placeholder="Detailed description of this tracker"
            />
            {errors.description && (
              <p className="error-text">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="actionType" className="label-text">
                Action Type <span className="text-red-500">*</span>
              </label>
              <select
                id="actionType"
                {...register('actionType')}
                className={`input-field ${errors.actionType ? 'input-error' : ''}`}
              >
                <option value="none">none</option>
                <option value="text">text</option>
                <option value="file">file</option>
                <option value="date">date</option>
              </select>
              {errors.actionType && (
                <p className="error-text">{errors.actionType.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="moduleFlow" className="label-text">
                Module Flow
              </label>
              <input
                id="moduleFlow"
                type="text"
                {...register('moduleFlow')}
                className="input-field"
                placeholder="e.g. LAB_FLOW"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="icon" className="label-text">
                Icon
              </label>
              <input
                id="icon"
                type="text"
                {...register('icon')}
                className="input-field"
                placeholder="Icon name"
              />
            </div>

            <div>
              <label htmlFor="order" className="label-text">
                Order (&gt;= -1)
              </label>
              <input
                id="order"
                type="number"
                {...register('order')}
                className={`input-field ${errors.order ? 'input-error' : ''}`}
              />
              {errors.order && <p className="error-text">{errors.order.message}</p>}
            </div>

            <div>
              <label htmlFor="mandays" className="label-text">
                Mandays (&gt;= -1)
              </label>
              <input
                id="mandays"
                type="number"
                {...register('mandays')}
                className={`input-field ${errors.mandays ? 'input-error' : ''}`}
              />
              {errors.mandays && <p className="error-text">{errors.mandays.message}</p>}
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100 flex flex-wrap gap-6">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
              <input
                type="checkbox"
                {...register('isUsingNotification')}
                className="rounded border-gray-300 text-kalbe-500 focus:ring-kalbe-500"
              />
              <span>Using Notification</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
              <input
                type="checkbox"
                {...register('isPublic')}
                className="rounded border-gray-300 text-kalbe-500 focus:ring-kalbe-500"
              />
              <span>Is Public</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
              <input
                type="checkbox"
                {...register('isParallel')}
                className="rounded border-gray-300 text-kalbe-500 focus:ring-kalbe-500"
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
