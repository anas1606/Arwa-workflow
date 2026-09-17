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

export default function UsersTabs() {
    const { canRead: canReadUsers, canCreate: canCreateUsers } = usePermission('users');
    const { canRead: canReadRoles, canCreate: canCreateRoles } = usePermission('security_roles');
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('users');

    useEffect(() => {
        if (router.query.tab === 'roles' && canReadRoles) {
            setActiveTab('roles');
        } else if (router.query.tab === 'users' && canReadUsers) {
            setActiveTab('users');
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

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Alt+1 → Users tab
            if (e.altKey && (e.key === '1' || e.code === 'Digit1')) {
                e.preventDefault();
                if (canReadUsers) setActiveTab('users');
                return;
            }
            // Alt+2 → Security Roles tab
            if (e.altKey && (e.key === '2' || e.code === 'Digit2')) {
                e.preventDefault();
                if (canReadRoles) setActiveTab('roles');
                return;
            }
            // Alt+A → Add user/role
            if (e.altKey && (e.key.toLowerCase() === 'a' || e.code === 'KeyA')) {
                e.preventDefault();
                if (activeTab === 'users' && canCreateUsers) setAddUserOpen(true);
                else if (activeTab === 'roles' && canCreateRoles) router.push('/users/roles/add');
                return;
            }
            // Ctrl+K or / → Focus search
            if ((e.ctrlKey && e.key.toLowerCase() === 'k') || (e.key === '/' && !e.ctrlKey && !e.altKey && document.activeElement?.tagName !== 'INPUT')) {
                e.preventDefault();
                searchInputRef.current?.focus();
                return;
            }
            // Alt+R → Refresh
            if (e.altKey && (e.key.toLowerCase() === 'r' || e.code === 'KeyR')) {
                e.preventDefault();
                triggerRefresh();
                return;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeTab, canReadUsers, canReadRoles, canCreateUsers, canCreateRoles, triggerRefresh]);

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
    const canAdd = activeTab === 'users' ? canCreateUsers : canCreateRoles;

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
                            else router.push('/users/roles/add');
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
                                activeTab === 'users' ? "left-1" : "left-[135px]"
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
                            type="text"
                            startIcon={Search}
                            placeholder={config.searchPlaceholder}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            ref={searchInputRef}
                        />
                    </div>
                </div>
                <div className="flex items-center flex-wrap gap-4 px-1 mt-1 text-xs text-grey-muted font-medium">
                    <span className="flex items-center gap-1.5">
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 border border-grey-border bg-grey-bg rounded text-grey-text font-sans shadow-sm">Ctrl</kbd>
                            <span className="text-grey-icon">+</span>
                            <kbd className="px-1.5 py-0.5 border border-grey-border bg-grey-bg rounded text-grey-text font-sans shadow-sm">K</kbd>
                        </span>
                        Search
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 border border-grey-border bg-grey-bg rounded text-grey-text font-sans shadow-sm">Alt</kbd>
                            <span className="text-grey-icon">+</span>
                            <kbd className="px-1.5 py-0.5 border border-grey-border bg-grey-bg rounded text-grey-text font-sans shadow-sm">1</kbd>
                            <span className="text-grey-icon">/</span>
                            <kbd className="px-1.5 py-0.5 border border-grey-border bg-grey-bg rounded text-grey-text font-sans shadow-sm">2</kbd>
                        </span>
                        Switch tabs
                    </span>
                    {canAdd && (
                        <span className="flex items-center gap-1.5">
                            <span className="flex items-center gap-1">
                                <kbd className="px-1.5 py-0.5 border border-grey-border bg-grey-bg rounded text-grey-text font-sans shadow-sm">Alt</kbd>
                                <span className="text-grey-icon">+</span>
                                <kbd className="px-1.5 py-0.5 border border-grey-border bg-grey-bg rounded text-grey-text font-sans shadow-sm">A</kbd>
                            </span>
                            Add {activeTab === 'users' ? 'User' : 'Role'}
                        </span>
                    )}
                    <span className="flex items-center gap-1.5">
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 border border-grey-border bg-grey-bg rounded text-grey-text font-sans shadow-sm">Alt</kbd>
                            <span className="text-grey-icon">+</span>
                            <kbd className="px-1.5 py-0.5 border border-grey-border bg-grey-bg rounded text-grey-text font-sans shadow-sm">R</kbd>
                        </span>
                        Refresh list
                    </span>
                </div>
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
