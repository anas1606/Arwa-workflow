import React, { useState, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import Button from '@/common/buttons/Button';
import Input from '@/common/input/Input';
import { updateUserApi, getSecurityRolesApi, getUserByIdApi } from '@/lib/fetcher';
import { toast } from 'sonner';
import { encryptString, decryptString } from '@/lib/encryption';

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

export default function EditUser({ open, onClose, onUpdate, user }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [securityRoleId, setSecurityRoleId] = useState('');
  
  const [roles, setRoles] = useState([]);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingUser, setIsFetchingUser] = useState(false);

  const titleId = useId();
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  // Fetch roles for the dropdown when modal opens
  useEffect(() => {
    if (open) {
      getSecurityRolesApi(1, 100).then(res => {
        if (res.data && res.data.success) {
          const fetchedRoles = res.data.data.roles || [];
          setRoles(fetchedRoles);
        }
      }).catch(console.error);
    }
  }, [open]);

  // Fetch fresh user details
  useEffect(() => {
    if (open && user?.id) {
      setIsFetchingUser(true);
      getUserByIdApi(user.id).then(res => {
        if (res.data && res.data.success) {
          const freshUser = res.data.data;
          setUsername(freshUser.username || '');
          setEmail(freshUser.email || '');
          setPhone(freshUser.phone || '');
          setSecurityRoleId(freshUser.security_role_id || '');
          setPassword(decryptString(freshUser.password) || '');
        }
      }).catch(console.error).finally(() => {
        setIsFetchingUser(false);
      });
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

  const reset = () => {
    setUsername('');
    setEmail('');
    setPhone('');
    setPassword('');
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

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
        handleClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [shouldRender]);

  const submit = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Username is required.');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    try {
      const payload = {
        username: username.trim(),
        ...(password && { password: encryptString(password) }),
        ...(email.trim() && { email: email.trim() }),
        ...(phone.trim() && { phone: phone.trim() }),
        security_role_id: securityRoleId || null
      };

      const res = await updateUserApi(user.id, payload);
      
      if (res.error || (res.data && !res.data.success)) {
        const errorMsg = res.error?.message || res.data?.message || 'Failed to update user';
        setError(errorMsg);
        toast.error(errorMsg);
      } else {
        onUpdate(res.data.data);
        toast.success('User updated successfully');
        reset();
      }
    } catch (err) {
      setError('An unexpected error occurred.');
      toast.error('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!shouldRender || !user) return null;
  const root = getModalRoot();
  if (!root) return null;

  return createPortal(
    <div className="app-modal-layer" role="presentation">
      <button
        type="button"
        className={`app-modal-backdrop ${isAnimatingOut ? 'animate-modal-backdrop-out' : 'animate-modal-backdrop'}`}
        onClick={handleClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`app-modal-panel bg-white shadow-2xl rounded-md border border-grey-border ${isAnimatingOut ? 'animate-modal-panel-out' : 'animate-modal-panel'} max-w-md w-full`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-grey-border px-4 py-3">
          <h2 id={titleId} className="text-base font-bold text-grey-text-strong">
            Edit User
          </h2>
          <button
            type="button"
            className="btn-ghost h-9 w-9 min-h-0 rounded-md p-0 flex items-center justify-center transition-colors hover:bg-grey-bg text-grey-muted hover:text-grey-text-strong"
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <form id="users-edit-form" className="flex flex-col gap-4" onSubmit={submit}>
            <Input
              type="text"
              label="Username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <Input
              type="password"
              label="New Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank to keep unchanged"
            />
            <Input
              type="email"
              label="Email (optional)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              type="tel"
              label="Phone (optional)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Input
              type="select"
              label="Security Role"
              value={securityRoleId}
              onChange={(e) => setSecurityRoleId(e.target.value)}
              options={[
                { label: 'Super Admin', value: '' },
                ...roles.map(r => ({ label: r.role_name, value: r.id }))
              ]}
              hidePlaceholder={true}
            />
            {error ? (
              <p className="text-sm font-medium text-danger-dark" role="alert">
                {error}
              </p>
            ) : null}
          </form>
        </div>
        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-grey-border px-4 py-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" className="flex-1" onClick={handleClose} text="Cancel" />
          <Button variant="primary" type="submit" form="users-edit-form" className="flex-1" text={isSubmitting ? "Saving..." : "Save changes"} disabled={isSubmitting} />
        </div>
      </div>
    </div>,
    root
  );
}
