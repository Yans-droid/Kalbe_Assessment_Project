'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/formatters';

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  className?: string;
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
  filterButton?: React.ReactNode;
  extraActions?: React.ReactNode;
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
  filterButton,
  extraActions,
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
        <ChevronUp className="w-3.5 h-3.5 text-white" />
      ) : (
        <ChevronDown className="w-3.5 h-3.5 text-white" />
      );
    }
    return <ChevronsUpDown className="w-3.5 h-3.5 text-white/50" />;
  };

  const pageSizes = [10, 25, 50];

  const totalItems = pagination?.totalItems || 0;
  const page = pagination?.page || 1;
  const pageSize = pagination?.pageSize || 10;
  const from = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);

  return (
    <div className="card overflow-hidden">
      {/* Toolbar Atas */}
      <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white">
        {/* Kiri: Show [10/25/50] + Filter By + Search */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
          {pagination && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500 flex-shrink-0">
              <span className="font-medium">Show</span>
              <select
                value={pagination.pageSize}
                onChange={(e) => pagination.onPageSizeChange(Number(e.target.value))}
                className="input-field w-auto py-1 px-2 text-xs font-semibold bg-white border-gray-300 rounded-md"
              >
                {pageSizes.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          )}

          {filterButton}

          {onSearch && (
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={localSearch}
                onChange={(e) => handleSearch(e.target.value)}
                className="input-field pl-9 py-1.5 text-xs bg-gray-50 focus:bg-white"
              />
            </div>
          )}
        </div>

        {/* Kanan: Extra Actions (e.g. RFA List) + Tombol Add */}
        <div className="flex items-center gap-2 flex-shrink-0 justify-end">
          {extraActions}
          {onAdd && (
            <button onClick={onAdd} className="btn-primary py-1.5 px-3 text-xs whitespace-nowrap">
              <Plus className="w-4 h-4" />
              {addLabel}
            </button>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-8 text-center bg-white">
          <div className="text-red-500 mb-2 font-medium">Error loading data</div>
          <p className="text-gray-500 text-sm mb-4">{error}</p>
          {onRetry && (
            <button onClick={onRetry} className="btn-primary text-xs">
              Retry
            </button>
          )}
        </div>
      )}

      {/* Table */}
      {!error && (
        <div className="overflow-x-auto relative min-h-[160px]">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-[#008444] text-white">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white whitespace-nowrap',
                      col.sortable && sort && 'cursor-pointer select-none hover:bg-[#006b37] transition-colors',
                      col.align === 'right' && 'text-right',
                      col.align === 'center' && 'text-center',
                      col.className
                    )}
                    onClick={() => col.sortable && sort?.onSort(col.key)}
                  >
                    <div
                      className={cn(
                        'flex items-center gap-1.5',
                        col.align === 'right' && 'justify-end',
                        col.align === 'center' && 'justify-center'
                      )}
                    >
                      <span>{col.label}</span>
                      {renderSortIcon(col)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                // Skeleton rows
                Array.from({ length: pagination?.pageSize || 5 }).map((_, i) => (
                  <tr key={`skeleton-${i}`}>
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <Search className="w-10 h-10 text-gray-300" />
                      <p className="text-sm font-medium">{emptyMessage}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((item, index) => (
                  <tr
                    key={(item.id as string) || index}
                    className="hover:bg-gray-50/80 transition-colors"
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          'px-4 py-3 text-xs text-gray-700',
                          col.align === 'right' && 'text-right',
                          col.align === 'center' && 'text-center',
                          col.className
                        )}
                      >
                        {col.render ? col.render(item) : (item[col.key] as React.ReactNode) ?? '-'}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {loading && data.length > 0 && (
            <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10">
              <Loader2 className="w-6 h-6 animate-spin text-[#008444]" />
            </div>
          )}
        </div>
      )}

      {/* Footer Tabel */}
      {pagination && !error && (
        <div className="p-4 border-t border-gray-100 bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-xs text-gray-600">
            Showing <span className="font-semibold text-gray-900">{from}</span> to{' '}
            <span className="font-semibold text-gray-900">{to}</span> of{' '}
            <span className="font-semibold text-gray-900">{totalItems}</span> entries
          </div>

          <div className="flex items-center gap-1 self-center sm:self-auto">
            <button
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1 || loading}
              className="btn-secondary py-1 px-2.5 text-xs font-medium disabled:opacity-40"
            >
              Prev
            </button>
            {generatePageNumbers(pagination.page, pagination.totalPages).map((p, i) =>
              p === '...' ? (
                <span key={`ellipsis-${i}`} className="px-2 text-xs text-gray-400">
                  ...
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => pagination.onPageChange(p as number)}
                  disabled={loading}
                  className={cn(
                    'py-1 px-2.5 text-xs rounded-md font-medium transition-colors',
                    p === pagination.page
                      ? 'bg-[#008444] text-white shadow-sm'
                      : 'hover:bg-gray-100 text-gray-700 border border-gray-200 bg-white'
                  )}
                >
                  {p}
                </button>
              )
            )}
            <button
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || loading}
              className="btn-secondary py-1 px-2.5 text-xs font-medium disabled:opacity-40"
            >
              Next
            </button>
          </div>
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
