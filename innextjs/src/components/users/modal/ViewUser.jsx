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
        className={`app-modal-panel bg-white shadow-2xl rounded-md border border-grey-border ${isAnimatingOut ? 'animate-modal-panel-out' : 'animate-modal-panel'} max-w-md w-full`}
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
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <div className="flex flex-col items-center justify-center border-b border-grey-border pb-6 mb-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary-dark">
                {displayUser.username.slice(0, 2).toUpperCase()}
            </div>
            <h3 className="mt-3 text-lg font-bold text-grey-text-strong">{displayUser.username}</h3>
            <span className={`mt-1 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${displayUser.isActive ? 'bg-success-bg text-success-main' : 'bg-danger-bg text-danger-main'}`}>
                {displayUser.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>

          <dl className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-grey-muted shrink-0" />
                <div className="flex flex-col">
                    <dt className="text-xs font-medium uppercase text-grey-muted">Email</dt>
                    <dd className="text-sm font-medium text-grey-text-strong">{displayUser.email || 'Not provided'}</dd>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-grey-muted shrink-0" />
                <div className="flex flex-col">
                    <dt className="text-xs font-medium uppercase text-grey-muted">Phone Number</dt>
                    <dd className="text-sm font-medium text-grey-text-strong">{displayUser.phone || 'Not provided'}</dd>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <Key className="h-5 w-5 text-grey-muted shrink-0" />
                <div className="flex flex-col">
                    <dt className="text-xs font-medium uppercase text-grey-muted">Password</dt>
                    <dd className="text-sm font-medium text-grey-text-strong">{decryptString(displayUser.password) || 'Not provided'}</dd>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-grey-muted shrink-0" />
                <div className="flex flex-col">
                    <dt className="text-xs font-medium uppercase text-grey-muted">Security Role</dt>
                    <dd className="text-sm font-medium text-grey-text-strong">{displayUser.security_role?.role_name || 'None'}</dd>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <CalendarClock className="h-5 w-5 text-grey-muted shrink-0" />
                <div className="flex flex-col">
                    <dt className="text-xs font-medium uppercase text-grey-muted">Account Created</dt>
                    <dd className="text-sm font-medium text-grey-text-strong">{new Date(user.createdAt).toLocaleDateString()} at {new Date(user.createdAt).toLocaleTimeString()}</dd>
                </div>
            </div>
          </dl>
        </div>
        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-grey-border px-4 py-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" className="flex-1" onClick={onClose} text="Close" />
        </div>
      </div>
    </div>,
    root
  );
}
