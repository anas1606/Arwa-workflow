import prisma from '@/lib/prisma';

export const createBox = async (data, userId = null) => {
    try {
        const result = await prisma.box.create({
            data: {
                name: data.name,
                createdBy: userId,
            },
        });
        return { success: true, data: result };
    } catch (error) {
        console.error('Error in createBox service:', error);
        return { success: false, message: 'An internal server error occurred while creating box.' };
    }
};

export const getAllBoxes = async (page = 1, limit = 10, search = '') => {
    try {
        const skip = (page - 1) * limit;
        const take = parseInt(limit);
        const where = { is_deleted: false };

        if (search) {
            where.name = { contains: search, mode: 'insensitive' };
        }

        const [data, total] = await Promise.all([
            prisma.box.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    name: true,
                    createdAt: true,
                    updatedAt: true,
                    createdBy: true,
                    updatedBy: true,
                    sections: {
                        where: { is_deleted: false },
                        select: {
                            id: true,
                            _count: {
                                select: {
                                    trays: { where: { is_deleted: false } }
                                }
                            }
                        }
                    }
                }
            }),
            prisma.box.count({ where })
        ]);

        const userIds = [...new Set(data.flatMap(b => [b.createdBy, b.updatedBy]).filter(Boolean))];
        const users = await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true, username: true }
        });
        const userMap = {};
        users.forEach(u => {
            userMap[u.id] = u.name || u.username;
        });

        const totalPages = Math.ceil(total / take);

        const mappedData = data.map(box => ({
            id: box.id,
            name: box.name,
            sectionsCount: box.sections.length,
            traysCount: box.sections.reduce((acc, s) => acc + s._count.trays, 0),
            createdAt: box.createdAt,
            updatedAt: box.updatedAt,
            createdByName: box.createdBy ? userMap[box.createdBy] || box.createdBy : 'Unknown',
            updatedByName: box.updatedBy ? userMap[box.updatedBy] || box.updatedBy : '-',
        }));

        return { 
            success: true, 
            data: {
                data: mappedData,
                pagination: {
                    totalItems: total,
                    pageSize: take,
                    pageNo: parseInt(page),
                    totalPages
                }
            } 
        };
    } catch (error) {
        console.error('Error in getAllBoxes service:', error);
        return { success: false, message: 'An internal server error occurred while fetching boxes.' };
    }
};

export const getBoxKpis = async () => {
    try {
        const [totalBoxes, boxesWithoutSections] = await Promise.all([
            prisma.box.count({ where: { is_deleted: false } }),
            prisma.box.count({ 
                where: { 
                    is_deleted: false,
                    sections: { none: { is_deleted: false } }
                } 
            }),
        ]);

        const sections = await prisma.section.findMany({
            where: { is_deleted: false },
            select: {
                id: true,
                _count: {
                    select: { trays: { where: { is_deleted: false } } }
                }
            }
        });

        const totalSections = sections.length;
        const totalTrays = sections.reduce((sum, s) => sum + s._count.trays, 0);

        return {
            success: true,
            data: {
                totalBoxes,
                totalSections,
                totalTrays,
                boxesWithoutSections
            }
        };
    } catch (error) {
        console.error('Error in getBoxKpis service:', error);
        return { success: false, message: 'An internal error occurred while fetching box KPIs' };
    }
};

export const getBoxById = async (id) => {
    try {
        const box = await prisma.box.findUnique({
            where: { id, is_deleted: false },
            include: {
                sections: {
                    where: { is_deleted: false },
                    include: {
                        trays: {
                            where: { is_deleted: false }
                        }
                    }
                }
            }
        });

        if (!box) {
            return { success: false, message: 'Box not found' };
        }

        return { success: true, data: box };
    } catch (error) {
        console.error('Error in getBoxById service:', error);
        return { success: false, message: 'An internal server error occurred while fetching the box.' };
    }
};

export const updateBox = async (id, data, userId = null) => {
    try {
        const existing = await prisma.box.findUnique({
            where: { id, is_deleted: false }
        });

        if (!existing) {
            return { success: false, message: 'Box not found' };
        }

        const updateData = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (userId) updateData.updatedBy = userId;

        const result = await prisma.box.update({
            where: { id },
            data: updateData
        });

        return { success: true, data: result };
    } catch (error) {
        console.error('Error in updateBox service:', error);
        return { success: false, message: 'An internal server error occurred while updating box.' };
    }
};

export const deleteBox = async (id, deletedBy = null) => {
    try {
        const box = await prisma.box.findUnique({
            where: { id }
        });
        
        if (!box || box.is_deleted) {
            return { success: false, message: 'Box not found or has already been deleted' };
        }

        const deletedBox = await prisma.box.update({
            where: { id },
            data: {
                is_deleted: true,
                deletedAt: new Date(),
                deletedBy: deletedBy
            }
        });

        return { success: true, data: deletedBox };
    } catch (error) {
        console.error('Error deleting box:', error);
        return { success: false, message: 'An internal error occurred while deleting the box' };
    }
};
