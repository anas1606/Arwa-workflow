import prisma from '@/lib/prisma';

const userSelect = {
    id: true,
    username: true,
    email: true,
    phone: true,
    isActive: true,
    security_role_id: true,
    createdAt: true,
    updatedAt: true,
    createdBy: true,
    updatedBy: true,
    security_role: {
        select: { id: true, role_name: true, role_number: true }
    }
};

export const getAllUsers = async (page = 1, limit = 10, search = '') => {
    try {
        const skip = (page - 1) * limit;
        const where = {
            is_deleted: false,
            ...(search && {
                OR: [
                    { username: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } }
                ]
            })
        };

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                skip,
                take: limit,
                select: userSelect,
                orderBy: { createdAt: 'desc' }
            }),
            prisma.user.count({ where })
        ]);

        const userIds = [...new Set(users.flatMap(u => [u.createdBy, u.updatedBy]).filter(Boolean))];
        const userRecords = await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, username: true }
        });
        const userMap = {};
        userRecords.forEach(u => {
            userMap[u.id] = u.username;
        });

        const mappedUsers = users.map(user => ({
            ...user,
            createdByName: user.createdBy ? userMap[user.createdBy] || user.createdBy : 'Unknown',
            updatedByName: user.updatedBy ? userMap[user.updatedBy] || user.updatedBy : '-',
        }));

        return {
            success: true,
            data: {
                users: mappedUsers,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                }
            }
        };
    } catch (error) {
        console.error('Service error getting all users:', error);
        return { success: false, message: 'Internal server error' };
    }
};

export const getUserById = async (id) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id, is_deleted: false },
            select: {
                ...userSelect,
                password: true
            }
        });

        if (!user) return { success: false, message: 'User not found' };

        // Keep password for editing (frontend decryption requirement)
        return { success: true, data: user };
    } catch (error) {
        console.error('Service error getting user by id:', error);
        return { success: false, message: 'Internal server error' };
    }
};

export const createUser = async (data, userId = null) => {
    try {
        if (!data.security_role_id) {
            return { success: false, message: 'Security role is required. Super admin cannot be created manually.' };
        }

        const existing = await prisma.user.findFirst({
            where: {
                OR: [
                    { username: data.username },
                    { email: data.email }
                ],
                is_deleted: false
            }
        });
        if (existing) return { success: false, message: 'Username or email already exists' };

        // Password comes already encrypted from frontend
        const newUser = await prisma.user.create({
            data: {
                ...data,
                createdBy: userId || data.createdBy || null,
            },
            select: userSelect
        });

        return { success: true, data: newUser };
    } catch (error) {
        console.error('Service error creating user:', error);
        return { success: false, message: 'Internal server error' };
    }
};

export const updateUser = async (id, data, userId = null) => {
    try {
        if (data.hasOwnProperty('security_role_id') && !data.security_role_id) {
            return { success: false, message: 'Security role is required. Super admin cannot be assigned manually.' };
        }

        const updateData = { ...data, updatedBy: userId || data.updatedBy || null };
        // If password is included, it is already encrypted by frontend

        const updatedUser = await prisma.user.update({
            where: { id },
            data: updateData,
            select: userSelect
        });

        return { success: true, data: updatedUser };
    } catch (error) {
        console.error('Service error updating user:', error);
        return { success: false, message: 'Internal server error' };
    }
};

export const deleteUser = async (id, deletedBy = null) => {
    try {
        await prisma.user.update({
            where: { id },
            data: { is_deleted: true, deletedAt: new Date(), deletedBy: deletedBy }
        });
        return { success: true, data: null };
    } catch (error) {
        console.error('Service error deleting user:', error);
        return { success: false, message: 'Internal server error' };
    }
};
