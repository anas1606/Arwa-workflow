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
                        className="p-1.5 hover:bg-white/20 rounded-full text-grey-icon cursor-pointer transition-colors"
                    >
                        <MoreVertical size={18} />
                    </button>
                </div>
            );
        }

        if (col.type === "toggle") {
            const isChecked = Boolean(value);
            return (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        col.onChange && col.onChange(row, !isChecked, e);
                    }}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${isChecked ? 'bg-primary' : 'bg-grey-border-strong'}`}
                >
                    <span className="sr-only">Toggle</span>
                    <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isChecked ? 'translate-x-2' : '-translate-x-2'}`}
                    />
                </button>
            );
        }

        return <span className="text-grey-text">{value ?? "-"}</span>;
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
                                    className={`px-5 py-4 font-semibold text-xs tracking-wide text-grey-text-light uppercase whitespace-nowrap 
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
                                            <div className="h-4 bg-grey-border rounded w-3/4 opacity-50"></div>
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : data.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="text-center py-10 text-grey-muted">
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
                <div className="text-sm text-grey-text-light whitespace-nowrap">
                    Showing <b className="text-grey-text-strong">{data?.length || 0}</b> of <b className="text-grey-text-strong">{totalItems}</b>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-grey-text-light whitespace-nowrap">Per page</span>
                        <div className="relative inline-block">
                            <select
                                disabled={isEmpty}
                                value={pageSize}
                                onChange={(e) => onPageSizeChange && onPageSizeChange(Number(e.target.value))}
                                className="appearance-none bg-white border border-grey-border text-grey-text-strong rounded-md px-3 py-1.5 pr-8 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-muted disabled:opacity-50 cursor-pointer shadow-sm transition-all hover:bg-white"
                            >
                                <option value={2}>2</option>
                                <option value={5}>5</option>
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                            </select>
                            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-grey-muted">
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
                            className={`w-8 h-8 flex justify-center items-center rounded-md transition-all border ${(pageNo <= 1 || isEmpty) ? "border-transparent text-grey-border-strong cursor-not-allowed opacity-50" : "bg-white border-grey-border text-grey-text hover:bg-grey-bg hover:text-grey-text-strong cursor-pointer shadow-sm"}`}
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
                                        ? 'bg-primary text-white border-primary shadow-sm'
                                        : 'bg-white border-grey-border text-grey-text hover:bg-grey-bg hover:text-grey-text-strong cursor-pointer disabled:cursor-not-allowed shadow-sm'
                                        }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => onPageChange && onPageChange(pageNo + 1)}
                            disabled={pageNo >= totalPages || isEmpty}
                            className={`w-8 h-8 flex justify-center items-center rounded-md transition-all border ${(pageNo >= totalPages || isEmpty) ? "border-transparent text-grey-border-strong cursor-not-allowed opacity-50" : "bg-white border-grey-border text-grey-text hover:bg-grey-bg hover:text-grey-text-strong cursor-pointer shadow-sm"}`}
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
