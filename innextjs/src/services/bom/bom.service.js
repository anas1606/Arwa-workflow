import prisma from '@/lib/prisma';

export const createBom = async (data, userId = null) => {
    try {
        const result = await prisma.$transaction(async (tx) => {
            const existingName = await tx.bom.findFirst({
                where: {
                    name: { equals: data.name, mode: 'insensitive' },
                    is_deleted: false
                }
            });
            
            if (existingName) {
                throw new Error('A BOM with this name already exists');
            }

            const mainProduct = await tx.product.findUnique({
                where: { id: data.productId }
            });
            if (!mainProduct || mainProduct.is_deleted) {
                throw new Error('The specified main product does not exist or has been deleted');
            }

            if (data.items) {
                const productIds = data.items.map(i => i.productId);
                if (new Set(productIds).size !== productIds.length) {
                    throw new Error('A BOM cannot contain duplicate component products');
                }
            }

            return await tx.bom.create({
                data: {
                    name: data.name,
                    productId: data.productId,
                    note: data.note || null,
                    createdBy: userId || data.createdBy || null,
                    items: {
                        create: data.items.map(item => ({
                            productId: item.productId,
                            quantity: item.quantity
                        }))
                    }
                },
                include: {
                    product: { select: { id: true, name: true, code: true } },
                    items: { include: { product: { select: { id: true, name: true, code: true } } } }
                }
            });
        });

        return { success: true, data: result };
    } catch (error) {
        console.error('Error in createBom service:', error);
        return { success: false, message: error.message || 'An internal server error occurred while creating BOM.', error: error.message };
    }
};

export const getAllBoms = async (page = 1, limit = 10, search = '') => {
    try {
        const skip = (page - 1) * limit;
        const take = parseInt(limit);
        const where = { is_deleted: false };

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { product: { name: { contains: search, mode: 'insensitive' } } }
            ];
        }

        const [data, total] = await Promise.all([
            prisma.bom.findMany({
                where,
                skip,
                take,
                select: {
                    id: true,
                    name: true,
                    createdAt: true,
                    createdBy: true,
                    updatedAt: true,
                    updatedBy: true,
                    product: {
                        select: { name: true }
                    },
                    items: {
                        select: { id: true }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            }),
            prisma.bom.count({ where })
        ]);

        // Fetch user names
        const userIds = new Set();
        data.forEach(p => {
            if (p.createdBy) userIds.add(p.createdBy);
            if (p.updatedBy) userIds.add(p.updatedBy);
        });

        const users = await prisma.user.findMany({
            where: { id: { in: Array.from(userIds) } },
            select: { id: true, username: true }
        });
        
        const userMap = {};
        users.forEach(u => userMap[u.id] = u.username);

        const enrichedData = data.map(p => ({
            ...p,
            createdByName: userMap[p.createdBy] || null,
            updatedByName: userMap[p.updatedBy] || null
        }));

        const totalPages = Math.ceil(total / take);

        return { 
            success: true, 
            data: {
                data: enrichedData,
                pagination: {
                    totalItems: total,
                    pageSize: take,
                    pageNo: parseInt(page),
                    totalPages
                }
            } 
        };
    } catch (error) {
        console.error('Error in getAllBoms service:', error);
        return { success: false, message: 'An internal server error occurred while fetching BOMs.' };
    }
};

export const getBomById = async (id) => {
    try {
        const bom = await prisma.bom.findUnique({
            where: { id, is_deleted: false },
            select: {
                id: true,
                name: true,
                note: true,
                product: {
                    select: { id: true, name: true, code: true }
                },
                items: {
                    select: {
                        quantity: true,
                        product: {
                            select: { id: true, name: true, code: true }
                        }
                    }
                }
            }
        });

        if (!bom) {
            return { success: false, message: 'BOM not found' };
        }

        return { success: true, data: bom };
    } catch (error) {
        console.error('Error in getBomById service:', error);
        return { success: false, message: 'An internal server error occurred while fetching the BOM.' };
    }
};

export const updateBom = async (id, data, userId = null) => {
    try {
        const result = await prisma.$transaction(async (tx) => {
            const existing = await tx.bom.findUnique({
                where: { id, is_deleted: false }
            });

            if (!existing) {
                throw new Error('BOM not found');
            }

            if (data.name && data.name !== existing.name) {
                const existingName = await tx.bom.findFirst({
                    where: {
                        name: { equals: data.name, mode: 'insensitive' },
                        is_deleted: false,
                        id: { not: id }
                    }
                });
                if (existingName) {
                    throw new Error('A BOM with this name already exists');
                }
            }

            const updateData = {};
            if (data.name !== undefined) updateData.name = data.name;
            if (data.productId !== undefined) updateData.productId = data.productId;
            if (data.note !== undefined) updateData.note = data.note;
            if (userId || data.updatedBy) updateData.updatedBy = userId || data.updatedBy;

            if (data.items !== undefined) {
                const productIds = data.items.map(i => i.productId);
                if (new Set(productIds).size !== productIds.length) {
                    throw new Error('A BOM cannot contain duplicate component products');
                }
                
                updateData.items = {
                    deleteMany: {},
                    create: data.items.map(item => ({
                        productId: item.productId,
                        quantity: item.quantity
                    }))
                };
            }

            return await tx.bom.update({
                where: { id },
                data: updateData,
                include: {
                    product: { select: { id: true, name: true, code: true } },
                    items: { include: { product: { select: { id: true, name: true, code: true } } } }
                }
            });
        });

        return { success: true, data: result };
    } catch (error) {
        console.error('Error in updateBom service:', error);
        return { success: false, message: 'An internal server error occurred while updating BOM.' };
    }
};

export const deleteBom = async (id, deletedBy = null) => {
    try {
        const bom = await prisma.bom.findUnique({
            where: { id }
        });
        if (!bom || bom.is_deleted) {
            return { success: false, message: 'BOM not found or has already been deleted' };
        }

        const deletedBom = await prisma.bom.update({
            where: { id },
            data: {
                is_deleted: true,
                deletedAt: new Date(),
                deletedBy: deletedBy
            }
        });

        return { success: true, data: deletedBom };
    } catch (error) {
        console.error('Error deleting BOM:', error);
        return { success: false, message: 'An internal error occurred while deleting the BOM' };
    }
};
