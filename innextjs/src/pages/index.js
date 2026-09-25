import { useEffect } from 'react';
import { useRouter } from 'next/router';
import useUser from '@/hooks/useUser';

export default function Home() {
  const router = useRouter();
  const { user, hasPermission, isLoading } = useUser();

  useEffect(() => {
    if (isLoading) return;
    if (!user) return; // useUser will handle redirect to /login

    if (user.role === 'super_admin' || hasPermission('dashboard', 'can_read')) {
      router.replace('/dashboard');
      return;
    }

    const moduleToRoute = {
      'customers': '/customers',
      'orders': '/orders',
      'customisation': '/inventory/customisation',
      'production': '/production',
      'bom': '/bom',
      'categories': '/inventory/category',
      'products': '/inventory/product',
      'units': '/inventory/unit',
      'packaging': '/inventory/packaging',
      'godown': '/inventory/godown',
      'stock': '/inventory/stock',
      'users': '/users',
      'security_roles': '/users',
      'settings': '/settings'
    };

    const permissions = user.security_role?.permissions || [];
    const firstReadable = permissions.find(p => p.can_read && moduleToRoute[p.module_key]);

    if (firstReadable) {
      router.replace(moduleToRoute[firstReadable.module_key]);
    } else {
      router.replace('/dashboard'); // fallback
    }
  }, [router, user, hasPermission, isLoading]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="animate-pulse">Loading...</div>
    </div>
  );
}
