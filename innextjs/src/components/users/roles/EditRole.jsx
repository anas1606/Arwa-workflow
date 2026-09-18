import React, { useState, useEffect, useId, useMemo } from 'react';
import { X, Search, Eye, Plus, Pencil, Trash2, CheckSquare } from 'lucide-react';
import Button from '@/common/buttons/Button';
import Input from '@/common/input/Input';
import { updateSecurityRoleApi, getModulesApi, getSecurityRoleByIdApi } from '@/lib/fetcher';
import { toast } from 'sonner';
import clsx from 'clsx';

import { useRouter } from 'next/router';

export default function EditRole() {
  const router = useRouter();
  const { id } = router.query;
  const [roleName, setRoleName] = useState('');
  const [roleNumber, setRoleNumber] = useState('');
  const [modules, setModules] = useState([]);
  const [permissions, setPermissions] = useState({});
  const [permSearch, setPermSearch] = useState('');

  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingRole, setIsFetchingRole] = useState(true);

  const titleId = useId();
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  // Fetch modules
  useEffect(() => {
      getModulesApi().then(res => {
        if (res.data && res.data.success) {
          setModules(res.data.data);
        }
      }).catch(console.error);
  }, []);

  // Fetch fresh role and its permissions
  useEffect(() => {
    if (id && modules.length > 0) {
      setIsFetchingRole(true);
      getSecurityRoleByIdApi(id).then(res => {
        if (res.data && res.data.success) {
          const fetchedRole = res.data.data;
          setRoleName(fetchedRole.role_name || '');
          setRoleNumber(fetchedRole.role_number ? String(fetchedRole.role_number) : '');

          const initialPerms = {};
          modules.forEach(mod => {
            initialPerms[mod.module_key] = { can_read: false, can_create: false, can_update: false, can_delete: false };
          });

          if (fetchedRole.permissions && Array.isArray(fetchedRole.permissions)) {
            fetchedRole.permissions.forEach(p => {
              initialPerms[p.module_key] = {
                can_read: p.can_read,
                can_create: p.can_create,
                can_update: p.can_update,
                can_delete: p.can_delete
              };
            });
          }
          setPermissions(initialPerms);
        }
      }).catch(console.error).finally(() => setIsFetchingRole(false));
    }
  }, [id, modules]);

  const reset = () => {
    setRoleName('');
    setRoleNumber('');
    setError(null);
    setPermSearch('');
  };

  const handleClose = () => {
    router.push('/users?tab=roles');
  };



  const handlePermissionChange = (moduleKey, action, checked) => {
    setPermissions(prev => {
      const newPerms = { ...prev };
      newPerms[moduleKey] = { ...newPerms[moduleKey], [action]: checked };
      
      if (checked && action !== 'can_read') {
        newPerms[moduleKey].can_read = true;
      }
      
      if (!checked && action === 'can_read') {
        newPerms[moduleKey].can_create = false;
        newPerms[moduleKey].can_update = false;
        newPerms[moduleKey].can_delete = false;
      }
      
      return newPerms;
    });
  };

  const handleSelectAll = (moduleKey, checked) => {
    setPermissions(prev => ({
      ...prev,
      [moduleKey]: { can_read: checked, can_create: checked, can_update: checked, can_delete: checked }
    }));
  };

  const handleGrantAll = () => {
    const newPerms = {};
    modules.forEach(mod => {
      newPerms[mod.module_key] = { can_read: true, can_create: true, can_update: true, can_delete: true };
    });
    setPermissions(newPerms);
  };

  const handleClearAll = () => {
    const newPerms = {};
    modules.forEach(mod => {
      newPerms[mod.module_key] = { can_read: false, can_create: false, can_update: false, can_delete: false };
    });
    setPermissions(newPerms);
  };

  const filteredModules = useMemo(() => {
    if (!permSearch.trim()) return modules;
    const q = permSearch.toLowerCase();
    return modules.filter(mod =>
      mod.name.toLowerCase().includes(q) || mod.module_key.toLowerCase().includes(q)
    );
  }, [modules, permSearch]);

  const getActiveCount = (moduleKey) => {
    const p = permissions[moduleKey];
    if (!p) return 0;
    return [p.can_read, p.can_create, p.can_update, p.can_delete].filter(Boolean).length;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!roleName.trim() || roleNumber === '') {
      setError('Role name and number are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const permissionsArray = Object.keys(permissions).map(module_key => ({
        module_key,
        ...permissions[module_key]
      }));

      const res = await updateSecurityRoleApi(id, {
        role_name: roleName.trim(),
        role_number: parseInt(roleNumber),
        permissions: permissionsArray
      });

      if (res.error || (res.data && !res.data.success)) {
        const errorMsg = res.error?.message || res.data?.message || 'Failed to update role';
        setError(errorMsg);
        toast.error(errorMsg);
      } else {
        toast.success('Role updated successfully');
        reset();
        router.push('/users?tab=roles');
      }
    } catch (err) {
      setError('An unexpected error occurred.');
      toast.error('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in" aria-labelledby={titleId}>
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between bg-white px-6 py-4 border-b border-grey-border z-10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-grey-border">
            <CheckSquare className="h-5 w-5 text-primary" strokeWidth={2.5} />
          </div>
          <div>
            <h2 id={titleId} className="text-xl font-bold text-grey-text-strong">
              Edit Security Role
            </h2>
            <p className="text-xs text-grey-muted mt-0.5">Modify custom security role and access rights</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={handleClose} text="Cancel" />
          <Button variant="primary" type="submit" form="roles-edit-form" text={isSubmitting ? "Saving..." : "Save Changes"} disabled={isSubmitting || isFetchingRole} />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto py-4">
        <div className="max-w-7xl mx-auto flex flex-col gap-6">
          <form id="roles-edit-form" className="flex flex-col gap-4" onSubmit={submit}>
            {/* Role Settings */}
            <div className="bg-white rounded-md border border-grey-border shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-grey-border flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-grey-muted" />
                <h3 className="text-[15px] font-bold text-grey-text-strong">Role Settings</h3>
              </div>
              <div className="p-6">
                {isFetchingRole ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="flex flex-col gap-2 animate-pulse">
                      <div className="h-[14px] w-32 bg-grey-border/60 rounded"></div>
                      <div className="h-[38px] w-full bg-grey-border/40 rounded-md"></div>
                    </div>
                    <div className="flex flex-col gap-2 animate-pulse">
                      <div className="h-[14px] w-16 bg-grey-border/60 rounded"></div>
                      <div className="h-[38px] w-full bg-grey-border/40 rounded-md"></div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="flex flex-col gap-2">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-grey-text">SECURITY ROLE NO *</label>
                      <input
                        type="number"
                        required
                        value={roleNumber}
                        onChange={(e) => setRoleNumber(e.target.value)}
                        placeholder="e.g. 50"
                        min="0"
                        className="w-full rounded-md border border-grey-border px-3 py-2 text-sm text-grey-text-strong shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-grey-text">NAME *</label>
                      <input
                        type="text"
                        required
                        value={roleName}
                        onChange={(e) => setRoleName(e.target.value)}
                        placeholder="e.g. Insight Admin"
                        className="w-full rounded-md border border-grey-border px-3 py-2 text-sm text-grey-text-strong shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Permissions */}
            <div className="bg-white rounded-md border border-grey-border shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 border-b border-grey-border flex items-center justify-between gap-4">
                  <div className="relative max-w-sm w-full">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-grey-muted" />
                      <input
                          type="text"
                          placeholder="Search permissions/modules..."
                          value={permSearch}
                          onChange={(e) => setPermSearch(e.target.value)}
                          className="w-full rounded-md border border-grey-border pl-9 pr-3 py-2 text-sm text-grey-text-strong shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                  </div>
                  <div className="flex items-center gap-3">
                      <button
                          type="button"
                          onClick={handleGrantAll}
                          className="px-4 py-2 text-xs font-bold rounded-md border border-grey-border text-grey-text-strong hover:bg-grey-bg transition-colors"
                      >
                          Grant All
                      </button>
                      <button
                          type="button"
                          onClick={handleClearAll}
                          className="px-4 py-2 text-xs font-bold rounded-md border border-grey-border text-grey-text-strong hover:bg-grey-bg transition-colors"
                      >
                          Clear All
                      </button>
                  </div>
              </div>

              <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                      <thead>
                          <tr className="border-b border-grey-border">
                              <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-grey-text">MODULE / FEATURE</th>
                              <th className="px-4 py-4 text-[11px] font-bold text-center uppercase tracking-wider text-grey-text">READ</th>
                              <th className="px-4 py-4 text-[11px] font-bold text-center uppercase tracking-wider text-grey-text">CREATE</th>
                              <th className="px-4 py-4 text-[11px] font-bold text-center uppercase tracking-wider text-grey-text">UPDATE</th>
                              <th className="px-4 py-4 text-[11px] font-bold text-center uppercase tracking-wider text-grey-text">DELETE</th>
                              <th className="px-4 py-4 text-[11px] font-bold text-center uppercase tracking-wider text-grey-text">SELECT ALL</th>
                              <th className="px-6 py-4 text-[11px] font-bold text-center uppercase tracking-wider text-grey-text w-32">STATUS</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-grey-border/50">
                          {isFetchingRole ? (
                              Array.from({ length: 5 }).map((_, idx) => (
                                  <tr key={`skel-${idx}`} className="animate-pulse">
                                      <td className="px-6 py-4"><div className="h-4 bg-grey-border rounded w-3/4 opacity-50"></div></td>
                                      <td className="px-4 py-4 text-center"><div className="h-6 w-16 bg-grey-border rounded mx-auto opacity-50"></div></td>
                                      <td className="px-4 py-4 text-center"><div className="h-6 w-16 bg-grey-border rounded mx-auto opacity-50"></div></td>
                                      <td className="px-4 py-4 text-center"><div className="h-6 w-16 bg-grey-border rounded mx-auto opacity-50"></div></td>
                                      <td className="px-4 py-4 text-center"><div className="h-6 w-16 bg-grey-border rounded mx-auto opacity-50"></div></td>
                                      <td className="px-4 py-4 text-center"><div className="h-6 w-16 bg-grey-border rounded mx-auto opacity-50"></div></td>
                                      <td className="px-6 py-4 text-center"><div className="h-6 w-20 bg-grey-border rounded mx-auto opacity-50"></div></td>
                                  </tr>
                              ))
                          ) : (
                              filteredModules.map(mod => {
                                  const p = permissions[mod.module_key] || {};
                                  const allChecked = p.can_read && p.can_create && p.can_update && p.can_delete;
                                  const activeCount = getActiveCount(mod.module_key);
                                  
                                  const renderCheckbox = (action, label, IconComponent) => {
                                      const isChecked = p[action];
                                      return (
                                          <label className={clsx(
                                              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border cursor-pointer select-none transition-colors mx-auto w-fit',
                                              isChecked ? 'border-primary bg-primary/5 text-primary' : 'border-grey-border bg-white text-grey-text hover:bg-grey-bg'
                                          )}>
                                              <input
                                                  type="checkbox"
                                                  className="sr-only"
                                                  checked={isChecked}
                                                  onChange={(e) => handlePermissionChange(mod.module_key, action, e.target.checked)}
                                              />
                                              <span className={clsx("h-4 w-4 rounded-sm border flex items-center justify-center transition-colors", isChecked ? 'bg-primary border-primary' : 'border-grey-icon bg-white')}>
                                                  {isChecked && <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                              </span>
                                              <span className="text-[11px] font-bold">{label}</span>
                                              {IconComponent && <IconComponent className="h-3 w-3 opacity-70" />}
                                          </label>
                                      );
                                  };

                                  return (
                                      <tr key={mod.module_key} className="hover:bg-grey-bg/30 transition-colors group">
                                          <td className="px-6 py-4">
                                              <div className="flex items-center gap-3">
                                                  <div className="h-8 w-8 rounded-md bg-grey-bg flex items-center justify-center shrink-0 border border-grey-border/50">
                                                      <CheckSquare className="h-4 w-4 text-grey-icon" />
                                                  </div>
                                                  <div className="flex flex-col">
                                                      <span className="text-[14px] font-bold text-grey-text-strong">{mod.name}</span>
                                                      <span className="text-[11px] text-grey-muted">{activeCount > 0 ? 'Custom access' : 'No access'}</span>
                                                  </div>
                                              </div>
                                          </td>
                                          <td className="px-2 py-4 text-center align-middle">
                                              {renderCheckbox('can_read', 'Read', Eye)}
                                          </td>
                                          <td className="px-2 py-4 text-center align-middle">
                                              {renderCheckbox('can_create', 'Create', Plus)}
                                          </td>
                                          <td className="px-2 py-4 text-center align-middle">
                                              {renderCheckbox('can_update', 'Update', Pencil)}
                                          </td>
                                          <td className="px-2 py-4 text-center align-middle">
                                              {renderCheckbox('can_delete', 'Delete', Trash2)}
                                          </td>
                                          <td className="px-2 py-4 text-center align-middle">
                                              <label className="inline-flex items-center gap-1.5 cursor-pointer mx-auto w-fit">
                                                  <input
                                                      type="checkbox"
                                                      className="h-3.5 w-3.5 rounded border-grey-border text-primary focus:ring-primary cursor-pointer"
                                                      checked={allChecked}
                                                      onChange={(e) => handleSelectAll(mod.module_key, e.target.checked)}
                                                  />
                                                  <span className="text-[12px] font-semibold text-grey-text-strong">All</span>
                                              </label>
                                          </td>
                                          <td className="px-6 py-4 text-center align-middle">
                                              <span className={clsx(
                                                  'inline-flex items-center justify-center px-2.5 py-1 text-[11px] font-bold rounded-md border',
                                                  activeCount > 0 ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-grey-bg border-grey-border text-grey-text'
                                              )}>
                                                  {activeCount} / 4 Active
                                              </span>
                                          </td>
                                      </tr>
                                  );
                              })
                          )}
                      </tbody>
                  </table>
              </div>
            </div>

            {error && (
              <p className="text-sm font-medium text-danger-dark" role="alert">
                {error}
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
