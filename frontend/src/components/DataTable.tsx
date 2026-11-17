'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/formatters';

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
}

export interface PaginationInfo {
  page: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export interface SortInfo {
  sortBy: string;
  sortOrder: 'ASC' | 'DESC';
  onSort: (field: string) => void;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  pagination?: PaginationInfo;
  sort?: SortInfo;
  searchValue?: string;
  onSearch?: (value: string) => void;
  emptyMessage?: string;
  onAdd?: () => void;
  addLabel?: string;
  error?: string | null;
  onRetry?: () => void;
}

export default function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  loading = false,
  pagination,
  sort,
  searchValue = '',
  onSearch,
  emptyMessage = 'No data found.',
  onAdd,
  addLabel = 'Add New',
  error,
  onRetry,
}: DataTableProps<T>) {
  const [localSearch, setLocalSearch] = useState(searchValue);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalSearch(searchValue);
  }, [searchValue]);

  const handleSearch = useCallback(
    (value: string) => {
      setLocalSearch(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onSearch?.(value);
      }, 300);
    },
    [onSearch]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const renderSortIcon = (column: Column<T>) => {
    if (!column.sortable || !sort) return null;
    if (sort.sortBy === column.key) {
      return sort.sortOrder === 'ASC' ? (
        <ChevronUp className="w-4 h-4" />
      ) : (
        <ChevronDown className="w-4 h-4" />
      );
    }
    return <ChevronsUpDown className="w-4 h-4 opacity-40" />;
  };

  const pageSizes = [10, 25, 50];

  return (
    <div className="card overflow-hidden">
      {/* Toolbar */}
      <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          {onSearch && (
            <>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={localSearch}
                onChange={(e) => handleSearch(e.target.value)}
                className="input-field pl-9"
              />
            </>
          )}
        </div>
        {onAdd && (
          <button onClick={onAdd} className="btn-primary whitespace-nowrap">
            <Plus className="w-4 h-4" />
            {addLabel}
          </button>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="p-8 text-center">
          <div className="text-red-500 mb-2 font-medium">Error loading data</div>
          <p className="text-gray-500 text-sm mb-4">{error}</p>
          {onRetry && (
            <button onClick={onRetry} className="btn-primary">
              Retry
            </button>
          )}
        </div>
      )}

      {/* Table */}
      {!error && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-kalbe-500 text-white">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      'px-4 py-3 text-left font-semibold whitespace-nowrap',
                      col.sortable && sort && 'cursor-pointer select-none hover:bg-kalbe-600'
                    )}
                    onClick={() => col.sortable && sort?.onSort(col.key)}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {renderSortIcon(col)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                // Skeleton rows
                Array.from({ length: pagination?.pageSize || 5 }).map((_, i) => (
                  <tr key={`skeleton-${i}`} className="border-b border-gray-100">
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <Search className="w-10 h-10 text-gray-300" />
                      <p>{emptyMessage}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((item, index) => (
                  <tr
                    key={(item.id as string) || index}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3">
                        {col.render ? col.render(item) : (item[col.key] as React.ReactNode) ?? '-'}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination && !error && (
        <div className="p-4 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Show</span>
            <select
              value={pagination.pageSize}
              onChange={(e) => pagination.onPageSizeChange(Number(e.target.value))}
              className="input-field w-auto py-1 px-2"
            >
              {pageSizes.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span>of {pagination.totalItems} entries</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1 || loading}
              className="btn-secondary py-1 px-3 text-sm"
            >
              Prev
            </button>
            {generatePageNumbers(pagination.page, pagination.totalPages).map((p, i) =>
              p === '...' ? (
                <span key={`ellipsis-${i}`} className="px-2 text-gray-400">
                  ...
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => pagination.onPageChange(p as number)}
                  disabled={loading}
                  className={cn(
                    'py-1 px-3 text-sm rounded-lg font-medium transition-colors',
                    p === pagination.page
                      ? 'bg-kalbe-500 text-white'
                      : 'hover:bg-gray-100 text-gray-700'
                  )}
                >
                  {p}
                </button>
              )
            )}
            <button
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || loading}
              className="btn-secondary py-1 px-3 text-sm"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {loading && data.length > 0 && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-kalbe-500" />
        </div>
      )}
    </div>
  );
}

function generatePageNumbers(
  current: number,
  total: number
): (number | string)[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | string)[] = [1];
  if (current > 3) pages.push('...');
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i);
  }
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
}
