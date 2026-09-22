import useUser from './useUser';

export const usePermission = (moduleKey) => {
    const { user } = useUser();

    if (!user) {
        return { canRead: false, canCreate: false, canUpdate: false, canDelete: false };
    }

    if (
        user.isSuperAdmin || 
        (user.role && user.role.toLowerCase().replace(/[^a-z0-9]/g, '') === 'superadmin') ||
        user.role === 'super_admin' || 
        user.role === 'SUPER_ADMIN'
    ) {
        return { canRead: true, canCreate: true, canUpdate: true, canDelete: true };
    }

    if (user.security_role && Array.isArray(user.security_role.permissions)) {
        const perm = user.security_role.permissions.find(
            (p) => p.module_key === moduleKey
        );

        if (perm) {
            return {
                canRead: !!perm.can_read,
                canCreate: !!perm.can_create,
                canUpdate: !!perm.can_update,
                canDelete: !!perm.can_delete,
            };
        }
    }

    return { canRead: false, canCreate: false, canUpdate: false, canDelete: false };
};
