import React, { useEffect, useState } from 'react';
import { 
    Keyboard, Plus, Search, Edit2, Trash2, Eye, 
    RefreshCw, ChevronLeft, ChevronRight, X, CheckSquare 
} from 'lucide-react';

/**
 * Reusable Custom Hook for Page-level Keyboard Shortcuts
 */
export const useKeyboardShortcuts = ({
    onAdd,
    onEdit,
    onDelete,
    onView,
    onRefresh,
    onSave,
    onToggleSelect,
    onToggleSelectAll,
    searchId = 'page-search-input',
    onSearchFocus,
    onEscape,
    onNextPage,
    onPrevPage,
    onNextStep,
    onPrevStep,
    setPageNo,
    pageNo,
    totalPages,
    items = [],
    selectedRowIndex = 0,
    setSelectedRowIndex,
    isModalOpen = false,
    customShortcuts = [],
    disabled = false,
    disableInputCycling = false
} = {}) => {
    useEffect(() => {
        if (disabled) return;

        const handleKeyDown = (e) => {
            const activeEl = document.activeElement;
            const isInputActive = activeEl && ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeEl.tagName);
            const isSearchFocused = activeEl && activeEl.id === searchId;

            // 0. Custom Shortcuts (Highest Priority)
            for (const shortcut of customShortcuts) {
                if (shortcut.altKey && !e.altKey) continue;
                if (shortcut.ctrlKey && !e.ctrlKey) continue;
                if (shortcut.shiftKey && !e.shiftKey) continue;
                let isMatch = false;
                if (shortcut.key) {
                    const sKey = shortcut.key.toLowerCase();
                    const eKey = e.key.toLowerCase();
                    const eCode = (e.code || '').toLowerCase();
                    isMatch = (eKey === sKey) || (eCode === sKey);
                    
                    if (!isMatch && /^\d$/.test(shortcut.key)) {
                        isMatch = (e.code === `Digit${shortcut.key}` || e.code === `Numpad${shortcut.key}`);
                    }
                    if (!isMatch && (sKey === '+' || sKey === '-')) {
                        isMatch = (eKey === sKey) || (eCode === `numpad${sKey === '+' ? 'add' : 'subtract'}`);
                    }
                }

                if (isMatch) {
                    if (shortcut.ignoreInInput && isInputActive) continue;
                    e.preventDefault();
                    shortcut.action();
                    return;
                }
            }

            // 1. Search Focus: Ctrl + K, Alt + S, or "/" (when not typing)
            if ((e.ctrlKey && e.key.toLowerCase() === 'k') || (e.altKey && e.key.toLowerCase() === 's') || (!isInputActive && e.key === '/')) {
                e.preventDefault();
                const searchEl = document.getElementById(searchId);
                if (searchEl) {
                    searchEl.focus();
                    searchEl.select();
                }
                if (onSearchFocus) onSearchFocus();
                return;
            }

            // 2. Escape: Close modals, blur search, or clear
            if (e.key === 'Escape') {
                if (onEscape) {
                    onEscape();
                } else if (isSearchFocused) {
                    activeEl.blur();
                }
                return;
            }

            // 3. Add: Alt + A or Alt + N
            if (e.altKey && (e.key.toLowerCase() === 'a' || e.key.toLowerCase() === 'n')) {
                e.preventDefault();
                if (onAdd) onAdd();
                return;
            }

            // 4. Refresh: Alt + R
            if (e.altKey && e.key.toLowerCase() === 'r') {
                e.preventDefault();
                if (onRefresh) onRefresh();
                return;
            }

            // 5. Select All Checkboxes: Alt + X
            if (e.altKey && e.key.toLowerCase() === 'x') {
                e.preventDefault();
                if (onToggleSelectAll) {
                    onToggleSelectAll();
                }
                return;
            }

            // 5.5 Input Cycling: Alt + Right / Alt + Left when inside an input
            if (!disableInputCycling && e.altKey && (e.key === 'ArrowRight' || e.key === 'ArrowLeft') && isInputActive) {
                e.preventDefault();
                const focusable = Array.from(document.querySelectorAll('input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])')).filter(el => el.offsetParent !== null);
                const currentIndex = focusable.indexOf(document.activeElement);
                if (currentIndex !== -1) {
                    if (e.key === 'ArrowRight') {
                       const next = (currentIndex + 1) % focusable.length;
                       focusable[next]?.focus();
                    } else {
                       const prev = (currentIndex - 1 + focusable.length) % focusable.length;
                       focusable[prev]?.focus();
                    }
                    return;
                }
            }

            // 6. Pagination: Alt + Right (Next) / Alt + Left (Prev)
            if (e.altKey && e.key === 'ArrowRight' && !isInputActive) {
                e.preventDefault();
                if (onNextPage && pageNo < totalPages) onNextPage();
                else if (setPageNo && pageNo < totalPages) setPageNo(prev => prev + 1);
                return;
            }
            if (e.altKey && e.key === 'ArrowLeft' && !isInputActive) {
                e.preventDefault();
                if (onPrevPage && pageNo > 1) onPrevPage();
                else if (setPageNo && pageNo > 1) setPageNo(prev => prev - 1);
                return;
            }

            // 7. Wizard Navigation: Shift + Enter (Next) / Ctrl + Shift + Enter (Prev)
            if (e.shiftKey && e.key === 'Enter') {
                if (e.ctrlKey) {
                    if (onPrevStep) {
                        e.preventDefault();
                        onPrevStep();
                        return;
                    }
                } else {
                    if (onNextStep) {
                        e.preventDefault();
                        onNextStep();
                        return;
                    }
                }
            }

            // 7.5 Save: Ctrl + S
            if (e.ctrlKey && e.key.toLowerCase() === 's') {
                e.preventDefault();
                if (onSave) onSave();
                return;
            }

            // 8. Table Navigation & Row Actions (Only when NOT typing inside inputs and modal is not open)
            if (!isInputActive && !isModalOpen && items.length > 0) {
                // Navigate Down: ArrowDown or 'J'
                if (e.key === 'ArrowDown' || e.key.toLowerCase() === 'j') {
                    e.preventDefault();
                    if (setSelectedRowIndex) {
                        setSelectedRowIndex(prev => (prev < items.length - 1 ? prev + 1 : prev));
                    }
                    return;
                }

                // Navigate Up: ArrowUp or 'K'
                if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'k') {
                    e.preventDefault();
                    if (setSelectedRowIndex) {
                        setSelectedRowIndex(prev => (prev > 0 ? prev - 1 : 0));
                    }
                    return;
                }

                // Toggle Checkbox for Focused Row: Space or 'X'
                if (e.key === ' ' || e.key.toLowerCase() === 'x') {
                    e.preventDefault();
                    if (onToggleSelect && selectedRowIndex >= 0 && selectedRowIndex < items.length) {
                        onToggleSelect(items[selectedRowIndex], selectedRowIndex);
                    }
                    return;
                }

                // Edit Selected: Enter or Alt + E
                if (e.key === 'Enter' || (e.altKey && e.key.toLowerCase() === 'e')) {
                    e.preventDefault();
                    if (onEdit && selectedRowIndex >= 0 && selectedRowIndex < items.length) {
                        onEdit(items[selectedRowIndex], selectedRowIndex);
                    }
                    return;
                }

                // Delete Selected: Delete / Del or Alt + D
                if (e.key === 'Delete' || (e.altKey && e.key.toLowerCase() === 'd')) {
                    e.preventDefault();
                    if (onDelete && selectedRowIndex >= 0 && selectedRowIndex < items.length) {
                        onDelete(items[selectedRowIndex], selectedRowIndex);
                    }
                    return;
                }

                // View Selected: Alt + V
                if (e.altKey && e.key.toLowerCase() === 'v') {
                    e.preventDefault();
                    if (onView && selectedRowIndex >= 0 && selectedRowIndex < items.length) {
                        onView(items[selectedRowIndex], selectedRowIndex);
                    }
                    return;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [
        onAdd, onEdit, onDelete, onView, onRefresh, onSave, onToggleSelect, onToggleSelectAll, searchId, onSearchFocus, onEscape,
        onNextPage, onPrevPage, onNextStep, onPrevStep, setPageNo, pageNo, totalPages, items, selectedRowIndex,
        setSelectedRowIndex, isModalOpen, customShortcuts, disabled, disableInputCycling
    ]);
};

/**
 * Reusable Top Single-Line Keyboard Shortcut Toolbar Component (Light Theme)
 */
export const KeyboardShortcutBar = ({
    onAdd,
    onEdit,
    onDelete,
    onView,
    onRefresh,
    onToggleSelect,
    searchId = 'page-search-input',
    onSearchFocus,
    pageNo,
    totalPages,
    selectedItem,
    selectedRowIndex,
    title = 'Shortcuts:',
    addLabel = 'Add',
    editLabel = 'Edit',
    deleteLabel = 'Delete',
    viewLabel = 'View',
    customActions = [],
    hideSearch = false,
    className = ''
}) => {
    const handleFocusSearch = () => {
        const searchEl = document.getElementById(searchId);
        if (searchEl) {
            searchEl.focus();
            searchEl.select();
        }
        if (onSearchFocus) onSearchFocus();
    };

    return (
        <div className={`w-full bg-white border border-gray-200/90 rounded-lg px-3 py-1.5 shadow-2xs flex items-center justify-between gap-2 text-xs overflow-x-auto custom-scrollbar ${className}`}>
            <div className="flex items-center gap-2 shrink-0">
                {/* Header Tag */}
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-primary/5 text-primary border border-primary/15 font-semibold text-[11px] shrink-0">
                    <Keyboard size={13} />
                    <span>{title}</span>
                </div>

                {/* Add Action */}
                {onAdd && (
                    <button
                        type="button"
                        onClick={onAdd}
                        className="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-50 hover:bg-emerald-50 border border-gray-200/80 hover:border-emerald-300 text-gray-700 hover:text-emerald-700 transition-colors shrink-0 cursor-pointer"
                        title="Add (Alt + A)"
                    >
                        <span className="flex items-center gap-0.5">
                            <kbd className="px-1 py-0.2 rounded bg-white border border-gray-300 text-[9px] font-mono font-bold text-gray-600 shadow-2xs">Alt</kbd>
                            <span className="text-[9px] text-gray-400">+</span>
                            <kbd className="px-1 py-0.2 rounded bg-white border border-gray-300 text-[9px] font-mono font-bold text-gray-600 shadow-2xs">A</kbd>
                        </span>
                        <span className="font-medium text-[11px] flex items-center gap-0.5 ml-0.5">
                            <Plus size={11} className="text-emerald-600" />
                            {addLabel}
                        </span>
                    </button>
                )}

                {/* Search Focus */}
                {!hideSearch && (
                    <button
                        type="button"
                        onClick={handleFocusSearch}
                        className="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-50 hover:bg-blue-50 border border-gray-200/80 hover:border-blue-300 text-gray-700 hover:text-blue-700 transition-colors shrink-0 cursor-pointer"
                        title="Search (Ctrl + K or /)"
                    >
                    <span className="flex items-center gap-0.5">
                        <kbd className="px-1 py-0.2 rounded bg-white border border-gray-300 text-[9px] font-mono font-bold text-gray-600 shadow-2xs">Ctrl</kbd>
                        <span className="text-[9px] text-gray-400">+</span>
                        <kbd className="px-1 py-0.2 rounded bg-white border border-gray-300 text-[9px] font-mono font-bold text-gray-600 shadow-2xs">K</kbd>
                    </span>
                    <span className="font-medium text-[11px] flex items-center gap-0.5 ml-0.5">
                        <Search size={11} className="text-blue-600" />
                        Search <span className="text-[9px] text-gray-400">(/)</span>
                    </span>
                </button>
                )}

                {/* Navigate Rows */}
                {selectedRowIndex !== undefined && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-50 border border-gray-200/80 text-gray-600 shrink-0">
                        <span className="flex items-center gap-0.5">
                            <kbd className="px-1 py-0.2 rounded bg-white border border-gray-300 text-[9px] font-mono font-bold text-gray-600 shadow-2xs">↑</kbd>
                            <kbd className="px-1 py-0.2 rounded bg-white border border-gray-300 text-[9px] font-mono font-bold text-gray-600 shadow-2xs">↓</kbd>
                        </span>
                        <span className="font-medium text-[11px] ml-0.5">Navigate</span>
                    </div>
                )}

                {/* Toggle Select Checkbox */}
                {onToggleSelect && (
                    <button
                        type="button"
                        onClick={() => selectedItem && onToggleSelect(selectedItem, selectedRowIndex)}
                        disabled={!selectedItem}
                        className={`flex items-center gap-1 px-2 py-1 rounded-md border transition-colors shrink-0 ${
                            selectedItem 
                                ? 'bg-gray-50 hover:bg-indigo-50 border-gray-200/80 hover:border-indigo-300 text-gray-700 hover:text-indigo-700 cursor-pointer' 
                                : 'bg-gray-50/50 border-gray-100 text-gray-300 cursor-not-allowed'
                        }`}
                        title="Toggle Checkbox (Space or X)"
                    >
                        <kbd className="px-1 py-0.2 rounded bg-white border border-gray-300 text-[9px] font-mono font-bold text-gray-600 shadow-2xs">Space</kbd>
                        <span className="font-medium text-[11px] flex items-center gap-0.5 ml-0.5">
                            <CheckSquare size={11} className={selectedItem ? "text-indigo-600" : "text-gray-300"} />
                            Select
                        </span>
                    </button>
                )}

                {/* Edit Selected */}
                {onEdit && (
                    <button
                        type="button"
                        onClick={() => selectedItem && onEdit(selectedItem, selectedRowIndex)}
                        disabled={!selectedItem}
                        className={`flex items-center gap-1 px-2 py-1 rounded-md border transition-colors shrink-0 ${
                            selectedItem 
                                ? 'bg-gray-50 hover:bg-amber-50 border-gray-200/80 hover:border-amber-300 text-gray-700 hover:text-amber-700 cursor-pointer' 
                                : 'bg-gray-50/50 border-gray-100 text-gray-300 cursor-not-allowed'
                        }`}
                        title="Edit Selected (Enter)"
                    >
                        <kbd className="px-1 py-0.2 rounded bg-white border border-gray-300 text-[9px] font-mono font-bold text-gray-600 shadow-2xs">Enter</kbd>
                        <span className="font-medium text-[11px] flex items-center gap-0.5 ml-0.5">
                            <Edit2 size={11} className={selectedItem ? "text-amber-600" : "text-gray-300"} />
                            {editLabel}
                        </span>
                    </button>
                )}

                {/* View Selected */}
                {onView && (
                    <button
                        type="button"
                        onClick={() => selectedItem && onView(selectedItem, selectedRowIndex)}
                        disabled={!selectedItem}
                        className={`flex items-center gap-1 px-2 py-1 rounded-md border transition-colors shrink-0 ${
                            selectedItem 
                                ? 'bg-gray-50 hover:bg-purple-50 border-gray-200/80 hover:border-purple-300 text-gray-700 hover:text-purple-700 cursor-pointer' 
                                : 'bg-gray-50/50 border-gray-100 text-gray-300 cursor-not-allowed'
                        }`}
                        title="View Selected (Alt + V)"
                    >
                        <span className="flex items-center gap-0.5">
                            <kbd className="px-1 py-0.2 rounded bg-white border border-gray-300 text-[9px] font-mono font-bold text-gray-600 shadow-2xs">Alt</kbd>
                            <span className="text-[9px] text-gray-400">+</span>
                            <kbd className="px-1 py-0.2 rounded bg-white border border-gray-300 text-[9px] font-mono font-bold text-gray-600 shadow-2xs">V</kbd>
                        </span>
                        <span className="font-medium text-[11px] flex items-center gap-0.5 ml-0.5">
                            <Eye size={11} className={selectedItem ? "text-purple-600" : "text-gray-300"} />
                            {viewLabel}
                        </span>
                    </button>
                )}

                {/* Delete Selected */}
                {onDelete && (
                    <button
                        type="button"
                        onClick={() => selectedItem && onDelete(selectedItem, selectedRowIndex)}
                        disabled={!selectedItem}
                        className={`flex items-center gap-1 px-2 py-1 rounded-md border transition-colors shrink-0 ${
                            selectedItem 
                                ? 'bg-gray-50 hover:bg-red-50 border-gray-200/80 hover:border-red-300 text-gray-700 hover:text-red-700 cursor-pointer' 
                                : 'bg-gray-50/50 border-gray-100 text-gray-300 cursor-not-allowed'
                        }`}
                        title="Delete Selected (Del)"
                    >
                        <kbd className="px-1 py-0.2 rounded bg-white border border-gray-300 text-[9px] font-mono font-bold text-gray-600 shadow-2xs">Del</kbd>
                        <span className="font-medium text-[11px] flex items-center gap-0.5 ml-0.5">
                            <Trash2 size={11} className={selectedItem ? "text-red-600" : "text-gray-300"} />
                            {deleteLabel}
                        </span>
                    </button>
                )}

                {/* Page Navigation */}
                {pageNo && totalPages && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-50 border border-gray-200/80 text-gray-600 shrink-0">
                        <span className="flex items-center gap-0.5">
                            <kbd className="px-1 py-0.2 rounded bg-white border border-gray-300 text-[9px] font-mono font-bold text-gray-600 shadow-2xs">Alt</kbd>
                            <span className="text-[9px] text-gray-400">+</span>
                            <kbd className="px-1 py-0.2 rounded bg-white border border-gray-300 text-[9px] font-mono font-bold text-gray-600 shadow-2xs">←</kbd>
                            <kbd className="px-1 py-0.2 rounded bg-white border border-gray-300 text-[9px] font-mono font-bold text-gray-600 shadow-2xs">→</kbd>
                        </span>
                        <span className="font-medium text-[11px] ml-0.5">Page ({pageNo}/{totalPages})</span>
                    </div>
                )}

                {/* Refresh */}
                {onRefresh && (
                    <button
                        type="button"
                        onClick={onRefresh}
                        className="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-50 hover:bg-cyan-50 border border-gray-200/80 hover:border-cyan-300 text-gray-700 hover:text-cyan-700 transition-colors shrink-0 cursor-pointer"
                        title="Refresh List (Alt + R)"
                    >
                        <span className="flex items-center gap-0.5">
                            <kbd className="px-1 py-0.2 rounded bg-white border border-gray-300 text-[9px] font-mono font-bold text-gray-600 shadow-2xs">Alt</kbd>
                            <span className="text-[9px] text-gray-400">+</span>
                            <kbd className="px-1 py-0.2 rounded bg-white border border-gray-300 text-[9px] font-mono font-bold text-gray-600 shadow-2xs">R</kbd>
                        </span>
                        <span className="font-medium text-[11px] flex items-center gap-0.5 ml-0.5">
                            <RefreshCw size={11} className="text-cyan-600" />
                            Refresh
                        </span>
                    </button>
                )}

                {/* Custom Action Chips */}
                {customActions.map((action, idx) => (
                    <button
                        key={idx}
                        type="button"
                        onClick={action.onClick}
                        className="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-50 hover:bg-gray-100 border border-gray-200/80 text-gray-700 transition-colors shrink-0 cursor-pointer"
                        title={action.title || action.label}
                    >
                        {action.keyCombo && (
                            <span className="flex items-center gap-0.5">
                                {action.keyCombo.map((k, kIdx) => (
                                    <React.Fragment key={kIdx}>
                                        <kbd className="px-1 py-0.2 rounded bg-white border border-gray-300 text-[9px] font-mono font-bold text-gray-600 shadow-2xs">{k}</kbd>
                                        {kIdx < action.keyCombo.length - 1 && <span className="text-[9px] text-gray-400">+</span>}
                                    </React.Fragment>
                                ))}
                            </span>
                        )}
                        <span className="font-medium text-[11px] ml-0.5 flex items-center gap-1">
                            {action.icon}
                            {action.label}
                        </span>
                    </button>
                ))}
            </div>

            {/* Right: Selected Row Badge */}
            {selectedItem && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-primary/5 border border-primary/20 text-[11px] text-primary shrink-0 ml-auto">
                    <span className="text-gray-400 font-medium">Selected:</span>
                    <span className="font-bold text-gray-900 max-w-[130px] truncate">
                        {selectedItem.productName || selectedItem.name || selectedItem.poNumber || selectedItem.username || selectedItem.title || 'Item'}
                    </span>
                    {selectedRowIndex !== undefined && (
                        <span className="bg-primary text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                            #{selectedRowIndex + 1}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
};

export default KeyboardShortcutBar;
