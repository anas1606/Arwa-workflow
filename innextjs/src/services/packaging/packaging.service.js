import prisma from '@/lib/prisma';

export const createPackaging = async (data, userId = null) => {
    try {
        const result = await prisma.packaging.create({
            data: {
                name: data.name,
                customerId: data.customerId,
                createdBy: userId || data.createdBy || null,
            },
            select: {
                id: true,
                name: true,
                customerId: true,
                createdAt: true,
                createdBy: true,
                updatedAt: true,
                updatedBy: true,
                customer: { select: { id: true, name: true } }
            }
        });
        return { success: true, data: result };
    } catch (error) {
        console.error('Error in createPackaging service:', error);
        return { success: false, message: 'An internal server error occurred while creating packaging.' };
    }
};

export const getAllPackagings = async (page = 1, limit = 10, search = '', customerId = 'ALL', minimal = false) => {
    try {
        const skip = (page - 1) * limit;
        const take = parseInt(limit);
        const where = { is_deleted: false };

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (customerId && customerId !== 'ALL') {
            where.customerId = customerId;
        }

        const queryArgs = {
            where, skip, take, orderBy: { createdAt: 'desc' }
        };

        if (minimal) {
            queryArgs.select = { id: true, name: true, customerId: true };
        } else {
            queryArgs.select = {
                id: true,
                name: true,
                customerId: true,
                createdAt: true,
                createdBy: true,
                updatedAt: true,
                updatedBy: true,
                customer: {
                    select: {
                        id: true,
                        name: true,
                    }
                }
            };
        }

        const [data, total] = await Promise.all([
            prisma.packaging.findMany(queryArgs),
            prisma.packaging.count({ where })
        ]);

        let formattedData = data;
        
        if (!minimal) {
            const userIds = [...new Set(data.flatMap(p => [p.createdBy, p.updatedBy]).filter(Boolean))];
            const users = await prisma.user.findMany({
                where: { id: { in: userIds } },
                select: { id: true, username: true }
            });
            const userMap = {};
            users.forEach(u => {
                userMap[u.id] = u.username;
            });

            formattedData = data.map(item => ({
                ...item,
                createdByName: item.createdBy ? userMap[item.createdBy] || item.createdBy : 'Unknown',
                updatedByName: item.updatedBy ? userMap[item.updatedBy] || item.updatedBy : '-',
            }));
        }

        return { 
            success: true, 
            data: { 
                data: formattedData, 
                pagination: { 
                    total, 
                    page: parseInt(page), 
                    limit: parseInt(limit), 
                    totalPages: Math.ceil(total / limit) 
                }
            } 
        };
    } catch (error) {
        console.error('Error in getAllPackagings service:', error);
        return { success: false, message: 'An internal server error occurred while fetching packagings.' };
    }
};

export const getPackagingById = async (id) => {
    try {
        const packaging = await prisma.packaging.findFirst({
            where: { id, is_deleted: false },
            select: {
                id: true,
                name: true,
                customerId: true,
                createdAt: true,
                createdBy: true,
                updatedAt: true,
                updatedBy: true,
                customer: {
                    select: {
                        id: true,
                        name: true,
                    }
                }
            }
        });

        if (!packaging) return { success: false, message: 'Packaging not found' };
        return { success: true, data: packaging };
    } catch (error) {
        console.error('Error in getPackagingById service:', error);
        return { success: false, message: 'An internal server error occurred while fetching packaging.' };
    }
};

export const updatePackaging = async (data, userId = null) => {
    try {
        const existingPackaging = await prisma.packaging.findFirst({
            where: { id: data.id, is_deleted: false }
        });

        if (!existingPackaging) {
            return { success: false, message: 'Packaging not found' };
        }

        const result = await prisma.packaging.update({
            where: { id: data.id },
            data: {
                name: data.name !== undefined ? data.name : existingPackaging.name,
                customerId: data.customerId !== undefined ? data.customerId : existingPackaging.customerId,
                updatedBy: userId || data.updatedBy || null,
            },
            select: {
                id: true,
                name: true,
                customerId: true,
                createdAt: true,
                createdBy: true,
                updatedAt: true,
                updatedBy: true,
                customer: { select: { id: true, name: true } }
            }
        });
        return { success: true, data: result };
    } catch (error) {
        console.error('Error in updatePackaging service:', error);
        return { success: false, message: 'An internal server error occurred while updating packaging.' };
    }
};

export const deletePackaging = async (id, deletedBy) => {
    try {
        const existingPackaging = await prisma.packaging.findFirst({
            where: { id, is_deleted: false }
        });

        if (!existingPackaging) {
            return { success: false, message: 'Packaging not found' };
        }

        const result = await prisma.packaging.update({
            where: { id },
            data: {
                is_deleted: true,
                deletedAt: new Date(),
                deletedBy: deletedBy || null,
            },
            select: {
                id: true,
                name: true
            }
        });
        return { success: true, data: result };
    } catch (error) {
        console.error('Error in deletePackaging service:', error);
        return { success: false, message: 'An internal server error occurred while deleting packaging.' };
    }
};
