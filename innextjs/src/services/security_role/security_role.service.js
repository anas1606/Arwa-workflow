import prisma from '@/lib/prisma';

export const getAllSecurityRoles = async (page = 1, limit = 10, search = '') => {
    try {
        const skip = (page - 1) * limit;
        const where = {
            is_deleted: false,
            ...(search && {
                role_name: { contains: search, mode: 'insensitive' }
            })
        };

        const [roles, total] = await Promise.all([
            prisma.securityRole.findMany({
                where,
                skip,
                take: limit,
                orderBy: { role_number: 'asc' },
                include: {
                    permissions: true,
                    _count: { select: { users: { where: { is_deleted: false } } } }
                }
            }),
            prisma.securityRole.count({ where })
        ]);

        return {
            success: true,
            data: {
                roles,
                total,
                page,
                totalPages: Math.ceil(total / limit)
            }
        };
    } catch (error) {
        console.error('Service error getting all roles:', error);
        return { success: false, message: 'Internal server error' };
    }
};

export const getSecurityRoleById = async (id) => {
    try {
        const role = await prisma.securityRole.findUnique({
            where: { id, is_deleted: false },
            include: {
                permissions: true
            }
        });

        if (!role) return { success: false, message: 'Security Role not found' };

        return { success: true, data: role };
    } catch (error) {
        console.error('Service error getting role by id:', error);
        return { success: false, message: 'Internal server error' };
    }
};

export const createSecurityRole = async (data) => {
    try {
        const existingName = await prisma.securityRole.findUnique({
            where: { role_name: data.role_name }
        });

        if (existingName && !existingName.is_deleted) {
            return { success: false, message: 'Role name already exists' };
        }

        if (data.role_number != null) {
            const existingNumber = await prisma.securityRole.findFirst({
                where: { role_number: data.role_number, is_deleted: false }
            });
            if (existingNumber) {
                return { success: false, message: 'Role number already exists for an active role' };
            }
        }

        const { permissions, ...roleData } = data;

        const newRole = await prisma.securityRole.create({
            data: {
                ...roleData,
                permissions: {
                    create: permissions || []
                }
            },
            include: { permissions: true }
        });

        return { success: true, data: newRole };
    } catch (error) {
        console.error('Service error creating role:', error);
        return { success: false, message: 'Internal server error' };
    }
};

export const updateSecurityRole = async (id, data) => {
    try {
        const { permissions, ...roleData } = data;

        if (roleData.role_number != null) {
            const existingNumber = await prisma.securityRole.findFirst({
                where: {
                    role_number: roleData.role_number,
                    is_deleted: false,
                    id: { not: id }
                }
            });
            if (existingNumber) {
                return { success: false, message: 'Role number already exists for an active role' };
            }
        }

        // Using a transaction to replace all permissions for this role
        const updatedRole = await prisma.$transaction(async (tx) => {
            if (permissions) {
                // Delete existing permissions for this role
                await tx.rolePermission.deleteMany({
                    where: { security_role_id: id }
                });
            }

            // Update role and recreate permissions
            return tx.securityRole.update({
                where: { id },
                data: {
                    ...roleData,
                    ...(permissions && {
                        permissions: {
                            create: permissions
                        }
                    })
                },
                include: { permissions: true }
            });
        });

        return { success: true, data: updatedRole };
    } catch (error) {
        console.error('Service error updating role:', error);
        return { success: false, message: 'Internal server error' };
    }
};

export const deleteSecurityRole = async (id) => {
    try {
        const usersWithRole = await prisma.user.count({
            where: { security_role_id: id, is_deleted: false }
        });

        if (usersWithRole > 0) {
            return { success: false, message: 'Cannot delete role assigned to active users' };
        }

        await prisma.securityRole.update({
            where: { id },
            data: { is_deleted: true, deletedAt: new Date() }
        });

        return { success: true, data: null };
    } catch (error) {
        console.error('Service error deleting role:', error);
        return { success: false, message: 'Internal server error' };
    }
};
