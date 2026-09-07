import React from "react";
import { ChevronLeft, ChevronRight, MoreVertical } from "lucide-react";

export default function CommonTable({
    columns = [],
    data = [],
    onRowClick,
    emptyState = "No data available",
    isLoading = false,
    pagination = {
        totalItems: 0,
        pageSize: 10,
        pageNo: 1,
        totalPages: 1
    },
    onPageChange,
    onPageSizeChange
}) {
    const { totalItems, pageSize, pageNo, totalPages } = pagination;
    const isEmpty = !data || data.length === 0;

    const getPageWindow = () => {
        if (isEmpty || totalPages <= 1) return [1];
        const pages = [];
        let start = Math.max(1, pageNo - 2);
        let end = Math.min(totalPages, pageNo + 2);

        if (pageNo <= 3) end = Math.min(5, totalPages);
        if (pageNo >= totalPages - 2) start = Math.max(1, totalPages - 4);

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }
        return pages.length > 0 ? pages : [1];
    };

    const getNestedValue = (obj, path) => {
        if (!path || !obj) return undefined;
        if (typeof path === 'string' && path.includes('.')) {
            return path.split('.').reduce((acc, part) => acc && acc[part], obj);
        }
        return obj[path];
    };

    const renderCell = (col, row, index) => {
        if (col.render) return col.render(row, index);
        const value = getNestedValue(row, col.key);

        if (col.type === "action") {
            return (
                <div className="relative flex justify-center">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            col.onClick && col.onClick(row, e);
                        }}
                        className="p-1.5 hover:bg-white/20 rounded-full text-ink-400 cursor-pointer transition-colors"
                    >
                        <MoreVertical size={18} />
                    </button>
                </div>
            );
        }

        return <span className="text-ink-700">{value ?? "-"}</span>;
    };

    return (
        <div className="card-panel flex flex-col relative overflow-hidden p-0 w-full border-none">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    {/* HEADER */}
                    <thead className="bg-white">
                        <tr>
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    className={`px-5 py-4 font-semibold text-xs tracking-wide text-ink-600 uppercase whitespace-nowrap 
                                        ${col.align === "center" ? "text-center" : col.align === "right" ? "text-right" : "text-left"} ${col.headerClassName || ""}
                                        ${col.key === "actions" ? "sticky right-0 z-20 bg-white" : ""}`}
                                >
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    {/* BODY */}
                    <tbody className="divide-y divide-white/10">
                        {isLoading ? (
                            Array.from({ length: Math.min(pageSize, 10) }).map((_, idx) => (
                                <tr key={`skeleton-${idx}`} className="animate-pulse">
                                    {columns.map((col) => (
                                        <td key={`sk-${col.key}`} className="px-5 py-4">
                                            <div className="h-4 bg-ink-200 rounded w-3/4 opacity-50"></div>
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : data.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="text-center py-10 text-ink-500">
                                    <div className="flex flex-col items-center gap-2">
                                        <span className="text-sm font-medium">{emptyState}</span>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            data.map((row, index) => (
                                <tr
                                    key={index}
                                    onClick={() => onRowClick && onRowClick(row)}
                                    className={`transition-colors group ${onRowClick ? 'cursor-pointer hover:bg-white/40' : 'hover:bg-white/30'}`}
                                >
                                    {columns.map((col) => (
                                        <td
                                            key={col.key}
                                            className={`px-5 py-4 overflow-visible ${col.className || ""} ${col.align === "center" ? "text-center" : col.align === "right" ? "text-right" : "text-left"}
                                                ${col.key === "actions" ? "sticky right-0 z-10 bg-[#f4f7fb] group-hover:bg-[#fafbfc]" : ""}`}
                                        >
                                            {renderCell(col, row, index)}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* ================= FOOTER / PAGINATION ================= */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 border-t border-white/40 bg-white/60 backdrop-blur-md mt-auto shadow-sm">
                <div className="text-sm text-ink-600 whitespace-nowrap">
                    Showing <b className="text-ink-900">{data?.length || 0}</b> of <b className="text-ink-900">{totalItems}</b>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-ink-600 whitespace-nowrap">Per page</span>
                        <div className="relative inline-block">
                            <select
                                disabled={isEmpty}
                                value={pageSize}
                                onChange={(e) => onPageSizeChange && onPageSizeChange(Number(e.target.value))}
                                className="appearance-none bg-white border border-ink-200 text-ink-900 rounded-md px-3 py-1.5 pr-8 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50 cursor-pointer shadow-sm transition-all hover:bg-white"
                            >
                                <option value={2}>2</option>
                                <option value={5}>5</option>
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                            </select>
                            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-500">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => onPageChange && onPageChange(pageNo - 1)}
                            disabled={pageNo <= 1 || isEmpty}
                            className={`w-8 h-8 flex justify-center items-center rounded-md transition-all border ${(pageNo <= 1 || isEmpty) ? "border-transparent text-ink-300 cursor-not-allowed opacity-50" : "bg-white border-ink-200 text-ink-700 hover:bg-ink-50 hover:text-ink-900 cursor-pointer shadow-sm"}`}
                        >
                            <ChevronLeft size={16} />
                        </button>

                        <div className="flex items-center gap-1.5 hidden sm:flex">
                            {getPageWindow().map((p) => (
                                <button
                                    key={p}
                                    onClick={() => onPageChange && onPageChange(p)}
                                    disabled={isEmpty}
                                    className={`w-8 h-8 rounded-md text-sm font-medium transition-all flex items-center justify-center border ${p === pageNo && !isEmpty
                                        ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                                        : 'bg-white border-ink-200 text-ink-700 hover:bg-ink-50 hover:text-ink-900 cursor-pointer disabled:cursor-not-allowed shadow-sm'
                                        }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => onPageChange && onPageChange(pageNo + 1)}
                            disabled={pageNo >= totalPages || isEmpty}
                            className={`w-8 h-8 flex justify-center items-center rounded-md transition-all border ${(pageNo >= totalPages || isEmpty) ? "border-transparent text-ink-300 cursor-not-allowed opacity-50" : "bg-white border-ink-200 text-ink-700 hover:bg-ink-50 hover:text-ink-900 cursor-pointer shadow-sm"}`}
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
