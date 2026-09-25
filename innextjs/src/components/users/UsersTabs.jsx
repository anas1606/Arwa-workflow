import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePermission } from '@/hooks/usePermission';
import clsx from 'clsx';
import { Plus, Users, ShieldCheck, Search, ArrowLeft, ArrowRight, RefreshCw } from 'lucide-react';
import Button from '@/common/buttons/Button';
import Input from '@/common/input/Input';
import UsersList from './tabs/UsersList';
import SecurityRolesList from './tabs/SecurityRolesList';
import AddUser from './modal/AddUser';
import { useRouter } from 'next/router';
import { KeyboardShortcutBar, useKeyboardShortcuts } from '@/common/KeyboardShortcut';

export default function UsersTabs() {
    const { canRead: canReadUsers, canCreate: canCreateUsers } = usePermission('users');
    const { canRead: canReadRoles, canCreate: canCreateRoles } = usePermission('security_roles');
    const router = useRouter();
    const [activeTab, setActiveTab] = useState(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (params.get('tab') === 'roles') return 'roles';
        }
        return 'users';
    });

    useEffect(() => {
        if (router.query.tab === 'roles' && canReadRoles) {
            setActiveTab('roles');
        } else if (router.query.tab === 'users' && canReadUsers) {
            setActiveTab('users');
        } else if (!router.query.tab) {
            // Default to roles if they can't read users but can read roles
            if (!canReadUsers && canReadRoles) {
                setActiveTab('roles');
            }
        }
    }, [router.query.tab, canReadRoles, canReadUsers]);

    const [addUserOpen, setAddUserOpen] = useState(false);

    // Search state (shared, passed down)
    const [inputValue, setInputValue] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const searchInputRef = useRef(null);

    // Refresh trigger to tell child lists to re-fetch
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const triggerRefresh = useCallback(() => setRefreshTrigger(prev => prev + 1), []);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => setSearchQuery(inputValue), 400);
        return () => clearTimeout(timer);
    }, [inputValue]);

    // Clear search when switching tabs
    useEffect(() => {
        setInputValue('');
        setSearchQuery('');
    }, [activeTab]);

    const canAdd = activeTab === 'users' ? canCreateUsers : canCreateRoles;

    // Keyboard shortcuts
    useKeyboardShortcuts({
        onAdd: canAdd ? () => {
            if (activeTab === 'users') setAddUserOpen(true);
            else router.push('/users/roles/create');
        } : undefined,
        onRefresh: triggerRefresh,
        searchId: "users-search-input",
        customShortcuts: [
            {
                key: '1',
                altKey: true,
                action: () => { if (canReadUsers) setActiveTab('users'); }
            },
            {
                key: '2',
                altKey: true,
                action: () => { if (canReadRoles) setActiveTab('roles'); }
            }
        ],
        isModalOpen: addUserOpen,
    });

    const tabConfig = {
        users: {
            icon: Users,
            title: 'Users',
            subtitle: 'Manage your application users and team members.',
            addText: 'Add User',
            searchPlaceholder: 'Search users (Ctrl+K or /)...',
        },
        roles: {
            icon: ShieldCheck,
            title: 'Security Roles',
            subtitle: 'Define access permissions and module restrictions for user groups.',
            addText: 'Add Role',
            searchPlaceholder: 'Search roles (Ctrl+K or /)...',
        },
    };

    const config = tabConfig[activeTab];
    const TabIcon = config.icon;
    return (
        <div className="w-full flex flex-col gap-5">
            {/* Page Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                    <h1 className="text-[clamp(1.125rem,4vw,1.5rem)] font-bold tracking-tight text-grey-text-strong">
                        Users & Security
                    </h1>
                    <p className="mt-1 text-sm leading-snug text-grey-muted">
                        Manage your application users, team members, and security roles.
                    </p>
                </div>
                {canAdd && (
                    <Button
                        variant="primary"
                        className="w-full sm:w-auto shrink-0"
                        onClick={() => {
                            if (activeTab === 'users') setAddUserOpen(true);
                            else router.push('/users/roles/create');
                        }}
                        icon={Plus}
                        text={config.addText}
                    />
                )}
            </div>

            {/* Toolbar / Tabs */}
            <div className="card-panel flex w-full flex-col gap-3 border-none !p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <nav className="relative flex items-center p-1 bg-slate-200/60 rounded-xl shrink-0" aria-label="Tabs">
                        {/* Animated Background Pill */}
                        <div
                            className={clsx(
                                "absolute top-1 bottom-1 w-[130px] rounded-lg bg-primary shadow-md transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
                                activeTab === 'users' 
                                    ? "left-1" 
                                    : (canReadUsers ? "left-[135px]" : "left-1")
                            )}
                        />
                        {canReadUsers && (
                            <button
                                onClick={() => setActiveTab('users')}
                                className={clsx(
                                    'relative z-10 w-[130px] flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition-colors duration-300',
                                    activeTab === 'users' ? 'text-white' : 'text-slate-600 hover:text-slate-900'
                                )}
                            >
                                Users
                            </button>
                        )}
                        {canReadRoles && (
                            <button
                                onClick={() => setActiveTab('roles')}
                                className={clsx(
                                    'relative z-10 w-[130px] flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition-colors duration-300',
                                    activeTab === 'roles' ? 'text-white' : 'text-slate-600 hover:text-slate-900'
                                )}
                            >
                                Security Roles
                            </button>
                        )}
                    </nav>
                    
                    <div className="flex-1 min-w-0 sm:ml-2">
                        <Input
                            id="users-search-input"
                            type="text"
                            startIcon={Search}
                            placeholder={config.searchPlaceholder}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            ref={searchInputRef}
                        />
                    </div>
                </div>
                <KeyboardShortcutBar
                    onAdd={canAdd ? () => {
                        if (activeTab === 'users') setAddUserOpen(true);
                        else router.push('/users/roles/create');
                    } : undefined}
                    onRefresh={triggerRefresh}
                    searchId="users-search-input"
                    addLabel={config.addText}
                    customActions={[
                        {
                            label: 'Users Tab',
                            keyCombo: ['Alt', '1'],
                            onClick: () => { if (canReadUsers) setActiveTab('users'); }
                        },
                        {
                            label: 'Roles Tab',
                            keyCombo: ['Alt', '2'],
                            onClick: () => { if (canReadRoles) setActiveTab('roles'); }
                        }
                    ]}
                />
            </div>

            {/* Tab Content */}
            {activeTab === 'users' && canReadUsers && (
                <UsersList searchQuery={searchQuery} refreshTrigger={refreshTrigger} />
            )}

            {activeTab === 'roles' && canReadRoles && (
                <SecurityRolesList searchQuery={searchQuery} refreshTrigger={refreshTrigger} />
            )}

            <AddUser
                open={addUserOpen}
                onClose={() => setAddUserOpen(false)}
                onAdd={() => {
                    setAddUserOpen(false);
                    triggerRefresh();
                }}
            />
        </div>
    );
}
