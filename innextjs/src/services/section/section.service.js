import prisma from '@/lib/prisma';

export const createSection = async (data, userId = null) => {
    try {
        // Verify box exists
        const box = await prisma.box.findUnique({
            where: { id: data.boxId, is_deleted: false }
        });
        if (!box) {
            return { success: false, message: 'Box does not exist' };
        }

        const result = await prisma.section.create({
            data: {
                name: data.name,
                boxId: data.boxId,
                createdBy: userId,
            },
        });
        return { success: true, data: result };
    } catch (error) {
        console.error('Error in createSection service:', error);
        return { success: false, message: 'An internal server error occurred while creating section.' };
    }
};

export const getAllSections = async (page = 1, limit = 10, search = '', boxId = null) => {
    try {
        const skip = (page - 1) * limit;
        const take = parseInt(limit);
        const where = { is_deleted: false };

        if (search) {
            where.name = { contains: search, mode: 'insensitive' };
        }
        
        if (boxId) {
            where.boxId = boxId;
        }

        const [data, total] = await Promise.all([
            prisma.section.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    name: true,
                    boxId: true,
                    createdAt: true,
                    updatedAt: true,
                    createdBy: true,
                    updatedBy: true,
                    _count: {
                        select: { trays: { where: { is_deleted: false } } }
                    }
                }
            }),
            prisma.section.count({ where })
        ]);

        const userIds = [...new Set(data.flatMap(s => [s.createdBy, s.updatedBy]).filter(Boolean))];
        const users = await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true, username: true }
        });
        const userMap = {};
        users.forEach(u => {
            userMap[u.id] = u.name || u.username;
        });

        const totalPages = Math.ceil(total / take);

        const mappedData = data.map(section => ({
            id: section.id,
            name: section.name,
            boxId: section.boxId,
            traysCount: section._count.trays,
            createdAt: section.createdAt,
            updatedAt: section.updatedAt,
            createdByName: section.createdBy ? userMap[section.createdBy] || section.createdBy : 'Unknown',
            updatedByName: section.updatedBy ? userMap[section.updatedBy] || section.updatedBy : '-',
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
        console.error('Error in getAllSections service:', error);
        return { success: false, message: 'An internal server error occurred while fetching sections.' };
    }
};

export const getSectionById = async (id) => {
    try {
        const section = await prisma.section.findUnique({
            where: { id, is_deleted: false },
            include: {
                trays: {
                    where: { is_deleted: false }
                },
                box: {
                    select: { id: true, name: true }
                }
            }
        });

        if (!section) {
            return { success: false, message: 'Section not found' };
        }

        return { success: true, data: section };
    } catch (error) {
        console.error('Error in getSectionById service:', error);
        return { success: false, message: 'An internal server error occurred while fetching the section.' };
    }
};

export const updateSection = async (id, data, userId = null) => {
    try {
        const existing = await prisma.section.findUnique({
            where: { id, is_deleted: false }
        });

        if (!existing) {
            return { success: false, message: 'Section not found' };
        }

        if (data.boxId && data.boxId !== existing.boxId) {
            const box = await prisma.box.findUnique({
                where: { id: data.boxId, is_deleted: false }
            });
            if (!box) {
                return { success: false, message: 'Target Box does not exist' };
            }
        }

        const updateData = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.boxId !== undefined) updateData.boxId = data.boxId;
        if (userId) updateData.updatedBy = userId;

        const result = await prisma.section.update({
            where: { id },
            data: updateData
        });

        return { success: true, data: result };
    } catch (error) {
        console.error('Error in updateSection service:', error);
        return { success: false, message: 'An internal server error occurred while updating section.' };
    }
};

export const deleteSection = async (id, deletedBy = null) => {
    try {
        const section = await prisma.section.findUnique({
            where: { id }
        });
        
        if (!section || section.is_deleted) {
            return { success: false, message: 'Section not found or has already been deleted' };
        }

        const deletedSection = await prisma.section.update({
            where: { id },
            data: {
                is_deleted: true,
                deletedAt: new Date(),
                deletedBy: deletedBy
            }
        });

        return { success: true, data: deletedSection };
    } catch (error) {
        console.error('Error deleting section:', error);
        return { success: false, message: 'An internal error occurred while deleting the section' };
    }
};
