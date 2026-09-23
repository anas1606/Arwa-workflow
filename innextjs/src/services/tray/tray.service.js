import prisma from '@/lib/prisma';

export const createTray = async (data, userId = null) => {
    try {
        // Verify section exists
        const section = await prisma.section.findUnique({
            where: { id: data.sectionId, is_deleted: false }
        });
        if (!section) {
            return { success: false, message: 'Section does not exist' };
        }

        const result = await prisma.tray.create({
            data: {
                name: data.name,
                sectionId: data.sectionId,
                createdBy: userId,
            },
        });
        return { success: true, data: result };
    } catch (error) {
        console.error('Error in createTray service:', error);
        return { success: false, message: 'An internal server error occurred while creating tray.' };
    }
};

export const getAllTrays = async (page = 1, limit = 10, search = '', sectionId = null) => {
    try {
        const skip = (page - 1) * limit;
        const take = parseInt(limit);
        const where = { is_deleted: false };

        if (search) {
            where.name = { contains: search, mode: 'insensitive' };
        }
        
        if (sectionId) {
            where.sectionId = sectionId;
        }

        const [data, total] = await Promise.all([
            prisma.tray.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    name: true,
                    sectionId: true,
                    createdAt: true,
                    updatedAt: true,
                    createdBy: true,
                    updatedBy: true,
                }
            }),
            prisma.tray.count({ where })
        ]);

        const userIds = [...new Set(data.flatMap(t => [t.createdBy, t.updatedBy]).filter(Boolean))];
        const users = await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, username: true }
        });
        const userMap = {};
        users.forEach(u => {
            userMap[u.id] = u.username;
        });

        const totalPages = Math.ceil(total / take);

        const mappedData = data.map(tray => ({
            id: tray.id,
            name: tray.name,
            sectionId: tray.sectionId,
            createdAt: tray.createdAt,
            updatedAt: tray.updatedAt,
            createdByName: tray.createdBy ? userMap[tray.createdBy] || tray.createdBy : 'Unknown',
            updatedByName: tray.updatedBy ? userMap[tray.updatedBy] || tray.updatedBy : '-',
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
        console.error('Error in getAllTrays service:', error);
        return { success: false, message: 'An internal server error occurred while fetching trays.' };
    }
};

export const getTrayById = async (id) => {
    try {
        const tray = await prisma.tray.findUnique({
            where: { id, is_deleted: false },
            include: {
                section: {
                    select: { id: true, name: true, boxId: true }
                }
            }
        });

        if (!tray) {
            return { success: false, message: 'Tray not found' };
        }

        return { success: true, data: tray };
    } catch (error) {
        console.error('Error in getTrayById service:', error);
        return { success: false, message: 'An internal server error occurred while fetching the tray.' };
    }
};

export const updateTray = async (id, data, userId = null) => {
    try {
        const existing = await prisma.tray.findUnique({
            where: { id, is_deleted: false }
        });

        if (!existing) {
            return { success: false, message: 'Tray not found' };
        }

        if (data.sectionId && data.sectionId !== existing.sectionId) {
            const section = await prisma.section.findUnique({
                where: { id: data.sectionId, is_deleted: false }
            });
            if (!section) {
                return { success: false, message: 'Target Section does not exist' };
            }
        }

        const updateData = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.sectionId !== undefined) updateData.sectionId = data.sectionId;
        if (userId) updateData.updatedBy = userId;

        const result = await prisma.tray.update({
            where: { id },
            data: updateData
        });

        return { success: true, data: result };
    } catch (error) {
        console.error('Error in updateTray service:', error);
        return { success: false, message: 'An internal server error occurred while updating tray.' };
    }
};

export const deleteTray = async (id, deletedBy = null) => {
    try {
        const tray = await prisma.tray.findUnique({
            where: { id }
        });
        
        if (!tray || tray.is_deleted) {
            return { success: false, message: 'Tray not found or has already been deleted' };
        }

        const deletedTray = await prisma.tray.update({
            where: { id },
            data: {
                is_deleted: true,
                deletedAt: new Date(),
                deletedBy: deletedBy
            }
        });

        return { success: true, data: deletedTray };
    } catch (error) {
        console.error('Error deleting tray:', error);
        return { success: false, message: 'An internal error occurred while deleting the tray' };
    }
};
