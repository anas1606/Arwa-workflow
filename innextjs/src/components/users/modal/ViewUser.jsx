import React, { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, User, Mail, Phone, ShieldCheck, CalendarClock, Key } from 'lucide-react';
import Button from '@/common/buttons/Button';
import { decryptString } from '@/lib/encryption';
import { getUserByIdApi } from '@/lib/fetcher';

function getModalRoot() {
  if (typeof document === 'undefined') return null;
  let root = document.getElementById('modal-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'modal-root';
    document.body.appendChild(root);
  }
  return root;
}

export default function ViewUser({ open, onClose, user }) {
  const titleId = useId();
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [freshUser, setFreshUser] = useState(null);

  useEffect(() => {
    if (open && user?.id) {
      getUserByIdApi(user.id).then(res => {
        if (res.data && res.data.success) {
          setFreshUser(res.data.data);
        }
      }).catch(console.error);
    } else {
      setFreshUser(null);
    }
  }, [open, user]);

  useEffect(() => {
    let timer;
    if (open) {
      setShouldRender(true);
      setIsAnimatingOut(false);
    } else if (shouldRender) {
      setIsAnimatingOut(true);
      timer = setTimeout(() => {
        setShouldRender(false);
      }, 200);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [open, shouldRender]);

  useEffect(() => {
    if (!shouldRender) return;
    
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${scrollbarWidth}px`;
    
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [shouldRender, onClose]);

  if (!shouldRender || !user) return null;
  const root = getModalRoot();
  if (!root) return null;
  const displayUser = freshUser || user;

  return createPortal(
    <div className="app-modal-layer" role="presentation">
      <button
        type="button"
        className={`app-modal-backdrop ${isAnimatingOut ? 'animate-modal-backdrop-out' : 'animate-modal-backdrop'}`}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`app-modal-panel bg-white shadow-2xl rounded-xl sm:rounded-2xl border border-grey-border ${isAnimatingOut ? 'animate-modal-panel-out' : 'animate-modal-panel'} max-w-md w-full`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-grey-border px-4 py-3">
          <h2 id={titleId} className="text-base font-bold text-grey-text-strong">
            User Details
          </h2>
          <button
            type="button"
            className="btn-ghost h-9 w-9 min-h-0 rounded-md p-0 flex items-center justify-center transition-colors hover:bg-grey-bg text-grey-muted hover:text-grey-text-strong"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* Profile Header */}
          <div className="bg-white px-6 py-6 border-b border-grey-border flex flex-col items-center justify-center">
            <div className="relative mb-3 mt-2">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary-dark">
                  {displayUser.username.slice(0, 2).toUpperCase()}
              </div>
              <div 
                className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white ${displayUser.isActive ? 'bg-success-main' : 'bg-danger-main'}`} 
                title={displayUser.isActive ? 'Active' : 'Inactive'} 
              />
            </div>
            <h3 className="text-lg font-bold text-grey-text-strong">{displayUser.username}</h3>
            <span className="mt-1.5 inline-flex items-center rounded-md bg-grey-bg px-2.5 py-0.5 text-xs font-semibold text-grey-text-strong ring-1 ring-inset ring-grey-border">
                {!displayUser.security_role_id ? 'Super Admin' : displayUser.security_role?.role_name || 'No Role Assigned'}
            </span>
          </div>

          {/* Details Section */}
          <div className="p-6 flex flex-col gap-5 bg-white">
            {/* Contact Card */}
            <div className="rounded-md border border-grey-border overflow-hidden">
                <div className="px-4 py-2 border-b border-grey-border bg-grey-bg">
                    <h4 className="text-xs font-bold text-grey-text-strong uppercase">Contact Information</h4>
                </div>
                <div className="divide-y divide-grey-border">
                    <div className="flex items-center gap-4 px-4 py-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-grey-bg text-grey-icon">
                            <Mail className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-xs font-medium uppercase text-grey-muted">Email Address</span>
                            <span className="text-sm font-semibold text-grey-text-strong truncate">{displayUser.email || 'Not provided'}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 px-4 py-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-grey-bg text-grey-icon">
                            <Phone className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-xs font-medium uppercase text-grey-muted">Phone Number</span>
                            <span className="text-sm font-semibold text-grey-text-strong truncate">{displayUser.phone || 'Not provided'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Account Card */}
            <div className="rounded-md border border-grey-border overflow-hidden">
                <div className="px-4 py-2 border-b border-grey-border bg-grey-bg">
                    <h4 className="text-xs font-bold text-grey-text-strong uppercase">Account Details</h4>
                </div>
                <div className="divide-y divide-grey-border">
                    <div className="flex items-center gap-4 px-4 py-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-grey-bg text-grey-icon">
                            <ShieldCheck className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-xs font-medium uppercase text-grey-muted">Security Role</span>
                            <span className="text-sm font-semibold text-grey-text-strong truncate">{!displayUser.security_role_id ? 'Super Admin' : displayUser.security_role?.role_name || 'None'}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 px-4 py-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-grey-bg text-grey-icon">
                            <CalendarClock className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-xs font-medium uppercase text-grey-muted">Account Created</span>
                            <span className="text-sm font-semibold text-grey-text-strong truncate">
                                {new Date(user.createdAt).toLocaleDateString()} at {new Date(user.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-grey-border px-4 py-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" className="flex-1" onClick={onClose} text="Close" />
        </div>
      </div>
    </div>,
    root
  );
}
