import prisma from '@/lib/prisma';

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
                select: {
                    id: true,
                    username: true,
                    email: true,
                    phone: true,
                    isActive: true,
                    security_role_id: true,
                    createdAt: true,
                    security_role: {
                        select: { id: true, role_name: true, role_number: true }
                    }
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.user.count({ where })
        ]);

        return {
            success: true,
            data: {
                users,
                total,
                page,
                totalPages: Math.ceil(total / limit)
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
                id: true,
                username: true,
                email: true,
                phone: true,
                password: true,
                isActive: true,
                security_role_id: true,
                createdAt: true,
                security_role: {
                    select: { id: true, role_name: true, role_number: true }
                }
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

export const createUser = async (data) => {
    try {
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
                ...data
            }
        });

        return { success: true, data: newUser };
    } catch (error) {
        console.error('Service error creating user:', error);
        return { success: false, message: 'Internal server error' };
    }
};

export const updateUser = async (id, data) => {
    try {
        const updateData = { ...data };
        // If password is included, it is already encrypted by frontend

        const updatedUser = await prisma.user.update({
            where: { id },
            data: updateData
        });

        return { success: true, data: updatedUser };
    } catch (error) {
        console.error('Service error updating user:', error);
        return { success: false, message: 'Internal server error' };
    }
};

export const deleteUser = async (id) => {
    try {
        await prisma.user.update({
            where: { id },
            data: { is_deleted: true, deletedAt: new Date() }
        });
        return { success: true, data: null };
    } catch (error) {
        console.error('Service error deleting user:', error);
        return { success: false, message: 'Internal server error' };
    }
};
