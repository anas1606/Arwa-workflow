import React, { useState, useEffect } from 'react';
import { Pencil, Trash2, Eye, ShieldCheck } from 'lucide-react';
import CommonTable from '@/common/table/CommonTable';
import DeleteModal from '@/common/modal/DeleteModal';
import EditUser from '../modal/EditUser';
import ViewUser from '../modal/ViewUser';
import { getUsersApi, deleteUserApi, updateUserApi } from '@/lib/fetcher';
import { toast } from 'sonner';
import { usePermission } from '@/hooks/usePermission';

export default function UsersList({ searchQuery = '', refreshTrigger = 0 }) {
    const { canRead, canCreate, canUpdate, canDelete } = usePermission('users');

    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Pagination
    const [pageNo, setPageNo] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalItems, setTotalItems] = useState(0);

    // Modals
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [viewOpen, setViewOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [dropdownState, setDropdownState] = useState(null);

    // Close dropdown on click outside
    useEffect(() => {
        const closeDropdown = () => setDropdownState(null);
        if (dropdownState) window.addEventListener('click', closeDropdown);
        return () => window.removeEventListener('click', closeDropdown);
    }, [dropdownState]);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const response = await getUsersApi(pageNo, pageSize, searchQuery);
            if (response.data && response.data.success) {
                setUsers(response.data.data.users || []);
                setTotalItems(response.data.data.pagination?.total || response.data.data.total || 0);
            } else {
                setUsers([]);
                setTotalItems(0);
            }
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [pageNo, pageSize, searchQuery, refreshTrigger]);

    // Reset page when search changes
    useEffect(() => {
        setPageNo(1);
    }, [searchQuery]);

    const totalPages = Math.ceil(totalItems / pageSize);

    const handleDelete = async (deletedUser) => {
        try {
            const res = await deleteUserApi(deletedUser.id);
            if (res.error || (res.data && !res.data.success)) {
                throw new Error(res.error?.message || res.data?.message || 'Failed to delete user');
            }
            setUsers((list) => list.filter(u => u.id !== deletedUser.id));
            setDeleteOpen(false);
            toast.success('User deleted successfully');
        } catch (err) {
            toast.error(err.message || 'An unexpected error occurred.');
            throw err;
        }
    };

    const toggleStatus = async (id, currentStatus) => {
        try {
            setUsers((list) => list.map(u => u.id === id ? { ...u, isActive: !currentStatus } : u));
            
            const res = await updateUserApi(id, { isActive: !currentStatus });
            if (res.error || (res.data && !res.data.success)) {
                setUsers((list) => list.map(u => u.id === id ? { ...u, isActive: currentStatus } : u));
                toast.error(res.error?.message || res.data?.message || 'Failed to update status');
            } else {
                toast.success('Status updated successfully');
            }
        } catch (err) {
            setUsers((list) => list.map(u => u.id === id ? { ...u, isActive: currentStatus } : u));
            toast.error('An unexpected error occurred.');
        }
    };

    const handleUpdate = () => {
        fetchUsers();
        setEditOpen(false);
    };

    const columns = [
        {
            key: 'username',
            label: 'Name',
            render: (row) => (
                <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary-dark">
                        {row.username?.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="font-semibold text-grey-text-strong truncate max-w-[180px]">{row.username}</span>
                </div>
            )
        },
        {
            key: 'email',
            label: 'Email',
            render: (row) => <span className="text-sm text-grey-text block truncate max-w-[220px]">{row.email || '-'}</span>
        },
        {
            key: 'phone',
            label: 'Phone',
            render: (row) => <span className="text-sm text-grey-text block truncate max-w-[220px]">{row.phone || '-'}</span>
        },
        {
            key: 'role',
            label: 'Role',
            align: 'center',
            render: (row) => {
                const isSuperAdmin = !row.security_role_id;
                if (isSuperAdmin) {
                    return (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-bold text-white shadow-sm">
                            <ShieldCheck size={13} strokeWidth={2.5} />
                            SUPER ADMIN
                        </span>
                    );
                }
                return (
                    <span className="inline-flex items-center rounded-full bg-grey-bg px-3 py-1 text-xs font-semibold text-grey-text-strong ring-1 ring-inset ring-grey-border">
                        {row.security_role?.role_name || '-'}
                    </span>
                );
            }
        },
        {
            key: 'isActive',
            label: 'Status',
            align: 'center',
            render: (row) => {
                const isSuperAdmin = !row.security_role_id;
                if (!canUpdate || isSuperAdmin) {
                    return (
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            row.isActive
                                ? 'bg-success-bg text-success-dark ring-1 ring-inset ring-success-dark/20'
                                : 'bg-danger-bg text-danger-dark ring-1 ring-inset ring-danger-dark/20'
                        }`}>
                            {row.isActive ? 'Active' : 'Inactive'}
                        </span>
                    );
                }
                
                return (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleStatus(row.id, row.isActive);
                        }}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${row.isActive ? 'bg-primary' : 'bg-grey-border-strong'}`}
                    >
                        <span className="sr-only">Toggle</span>
                        <span
                            aria-hidden="true"
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${row.isActive ? 'translate-x-2' : '-translate-x-2'}`}
                        />
                    </button>
                );
            }
        },
        {
            key: 'createdBy',
            label: 'Created By',
            render: (row) => (
                <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-grey-text-strong">{row.createdByName || '-'}</span>
                    <span className="text-xs text-grey-muted">
                        {row.createdAt ? new Date(row.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '-'}
                    </span>
                </div>
            ),
        },
        {
            key: 'updatedBy',
            label: 'Updated By',
            render: (row) => (
                <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-grey-text-strong">{row.updatedByName || '-'}</span>
                    {row.updatedBy ? (
                        <span className="text-xs text-grey-muted">
                            {row.updatedAt ? new Date(row.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : ''}
                        </span>
                    ) : null}
                </div>
            ),
        }
    ];

    if (canUpdate || canDelete) {
        columns.push({
            key: 'actions',
            label: 'Actions',
            type: 'action',
            align: 'center',
            onClick: (row, e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const dropdownHeight = 130;
                const spaceBelow = window.innerHeight - rect.bottom;
                let yPos = rect.bottom + window.scrollY;
                if (spaceBelow < dropdownHeight) {
                    yPos = rect.top + window.scrollY - dropdownHeight;
                }
                setDropdownState({
                    row,
                    x: rect.right - 160,
                    y: yPos,
                });
            },
        });
    }

    return (
        <>
            <CommonTable
                columns={columns}
                data={users}
                isLoading={isLoading}
                emptyState="No users match your search."
                pagination={{
                    totalItems,
                    pageSize,
                    pageNo,
                    totalPages,
                }}
                onPageChange={setPageNo}
                onPageSizeChange={(size) => {
                    setPageSize(size);
                    setPageNo(1);
                }}
            />

            {dropdownState && (
                <div
                    className="absolute z-50 bg-white border border-grey-border shadow-lg rounded-md py-1 w-40 flex flex-col"
                    style={{ top: dropdownState.y, left: dropdownState.x }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {canRead && (
                        <button
                            className="text-left px-4 py-2 text-sm text-grey-text hover:bg-grey-bg hover:text-grey-text-strong transition-colors flex items-center gap-2"
                            onClick={() => {
                                setSelectedUser(dropdownState.row);
                                setViewOpen(true);
                                setDropdownState(null);
                            }}
                        >
                            <Eye size={14} /> View Details
                        </button>
                    )}
                    {canUpdate && dropdownState.row?.security_role_id && (
                        <button
                            className="text-left px-4 py-2 text-sm text-grey-text hover:bg-grey-bg hover:text-grey-text-strong transition-colors flex items-center gap-2"
                            onClick={() => {
                                setSelectedUser(dropdownState.row);
                                setEditOpen(true);
                                setDropdownState(null);
                            }}
                        >
                            <Pencil size={14} /> Edit
                        </button>
                    )}
                    {canDelete && dropdownState.row?.security_role_id && (
                        <button
                            className="text-left px-4 py-2 text-sm text-danger-main hover:bg-danger-bg transition-colors flex items-center gap-2"
                            onClick={() => {
                                setSelectedUser(dropdownState.row);
                                setDeleteOpen(true);
                                setDropdownState(null);
                            }}
                        >
                            <Trash2 size={14} /> Delete
                        </button>
                    )}
                </div>
            )}

            <DeleteModal
                open={deleteOpen}
                onClose={() => setDeleteOpen(false)}
                onConfirm={handleDelete}
                item={selectedUser}
                itemNameKey="username"
                title="Delete user"
            />

            <EditUser
                open={editOpen}
                onClose={() => setEditOpen(false)}
                onUpdate={handleUpdate}
                user={selectedUser}
            />

            <ViewUser
                open={viewOpen}
                onClose={() => setViewOpen(false)}
                user={selectedUser}
            />
        </>
    );
}
