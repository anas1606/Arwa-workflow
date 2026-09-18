import React, { useState, useEffect } from 'react';
import { Pencil, Trash2, Eye } from 'lucide-react';
import CommonTable from '@/common/table/CommonTable';
import DeleteModal from '@/common/modal/DeleteModal';
import { useRouter } from 'next/router';
import { getSecurityRolesApi, deleteSecurityRoleApi } from '@/lib/fetcher';
import { toast } from 'sonner';
import { usePermission } from '@/hooks/usePermission';

// Permission badge colors
const PERM_BADGE = {
    R: { label: 'R', bg: 'bg-red-100 text-red-700', title: 'Read' },
    C: { label: 'C', bg: 'bg-blue-100 text-blue-700', title: 'Create' },
    U: { label: 'U', bg: 'bg-green-100 text-green-700', title: 'Update' },
    D: { label: 'D', bg: 'bg-orange-100 text-orange-700', title: 'Delete' },
};

function PermissionsSummary({ permissions = [] }) {
    if (!permissions || permissions.length === 0) {
        return <span className="text-xs text-grey-muted italic">No permissions</span>;
    }

    // Filter only modules that have at least one permission
    const activePerms = permissions.filter(
        p => p.can_read || p.can_create || p.can_update || p.can_delete
    );

    if (activePerms.length === 0) {
        return <span className="text-xs text-grey-muted italic">No permissions</span>;
    }

    return (
        <div className="flex flex-wrap gap-2">
            {activePerms.map((p) => {
                const badges = [];
                if (p.can_read) badges.push({ letter: 'R', title: 'Read' });
                if (p.can_create) badges.push({ letter: 'C', title: 'Create' });
                if (p.can_update) badges.push({ letter: 'U', title: 'Update' });
                if (p.can_delete) badges.push({ letter: 'D', title: 'Delete' });

                // Capitalize module name
                const moduleName = (p.module?.name || p.module_key || '').replace(/_/g, ' ');
                const displayName = moduleName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

                return (
                    <span
                        key={p.module_key}
                        className="inline-flex items-center gap-2.5 rounded-md bg-white px-2 py-1 text-[11px] font-bold text-[#334155] border border-grey-border shadow-sm"
                    >
                        {displayName}
                        <span className="flex items-center gap-1">
                            {badges.map((b) => (
                                <span
                                    key={b.letter}
                                    title={b.title}
                                    className="inline-flex items-center justify-center h-[15px] w-[15px] rounded border-2 border-[#bbf7d0] bg-[#f0fdf4] text-[10px] font-black text-[#16a34a]"
                                >
                                    {b.letter}
                                </span>
                            ))}
                        </span>
                    </span>
                );
            })}
        </div>
    );
}

export default function SecurityRolesList({ searchQuery = '', refreshTrigger = 0 }) {
    const { canRead, canCreate, canUpdate, canDelete } = usePermission('security_roles');
    const router = useRouter();

    const [roles, setRoles] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Pagination
    const [pageNo, setPageNo] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalItems, setTotalItems] = useState(0);

    // Modals
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [selectedRole, setSelectedRole] = useState(null);
    const [dropdownState, setDropdownState] = useState(null);

    useEffect(() => {
        const closeDropdown = () => setDropdownState(null);
        if (dropdownState) window.addEventListener('click', closeDropdown);
        return () => window.removeEventListener('click', closeDropdown);
    }, [dropdownState]);

    const fetchRoles = async () => {
        setIsLoading(true);
        try {
            const response = await getSecurityRolesApi(pageNo, pageSize, searchQuery);
            if (response.data && response.data.success) {
                setRoles(response.data.data.roles || []);
                setTotalItems(response.data.data.pagination?.total || response.data.data.total || 0);
            } else {
                setRoles([]);
                setTotalItems(0);
            }
        } catch (error) {
            console.error('Failed to fetch roles:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRoles();
    }, [pageNo, pageSize, searchQuery, refreshTrigger]);

    // Reset page when search changes
    useEffect(() => {
        setPageNo(1);
    }, [searchQuery]);

    const totalPages = Math.ceil(totalItems / pageSize);

    const handleDelete = async (deletedRole) => {
        try {
            const res = await deleteSecurityRoleApi(deletedRole.id);
            if (res.error || (res.data && !res.data.success)) {
                throw new Error(res.error?.message || res.data?.message || 'Failed to delete role');
            }
            setRoles((list) => list.filter(r => r.id !== deletedRole.id));
            setDeleteOpen(false);
            toast.success('Security Role deleted successfully');
        } catch (err) {
            toast.error(err.message || 'An unexpected error occurred.');
            throw err;
        }
    };

    const handleUpdate = () => {
        fetchRoles();
    };

    const columns = [
        {
            key: 'role_name',
            label: 'Role Name',
            render: (row) => (
                <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary-dark">
                        {row.role_name?.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="font-semibold text-grey-text-strong truncate">{row.role_name}</span>
                </div>
            )
        },

        {
            key: 'permissions',
            label: 'Permissions Summary',
            render: (row) => <PermissionsSummary permissions={row.permissions} />
        },
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
                data={roles}
                isLoading={isLoading}
                emptyState="No security roles match your search."
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

                    {canUpdate && (
                        <button
                            className="text-left px-4 py-2 text-sm text-grey-text hover:bg-grey-bg hover:text-grey-text-strong transition-colors flex items-center gap-2"
                            onClick={() => {
                                setDropdownState(null);
                                router.push(`/users/roles/edit/${dropdownState.row.id}`);
                            }}
                        >
                            <Pencil size={14} /> Edit
                        </button>
                    )}
                    {canDelete && (
                        <button
                            className="text-left px-4 py-2 text-sm text-danger-main hover:bg-danger-bg transition-colors flex items-center gap-2"
                            onClick={() => {
                                setSelectedRole(dropdownState.row);
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
                item={selectedRole}
                itemNameKey="role_name"
                title="Delete role"
            />

        </>
    );
}
