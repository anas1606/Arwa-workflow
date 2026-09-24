import prisma from '@/lib/prisma';

export const getSettingsList = async (page = 1, limit = 10, search = '') => {
    try {
        const skip = (page - 1) * limit;
        const where = { is_deleted: false };
        
        if (search) {
            where.OR = [
                { key: { contains: search, mode: 'insensitive' } },
                { value: { contains: search, mode: 'insensitive' } },
            ];
        }

        const queryArgs = {
            where, skip, take: Number(limit), orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                key: true,
                value: true,
                createdAt: true,
                createdBy: true,
                updatedAt: true,
                updatedBy: true
            }
        };

        const [settings, total] = await Promise.all([
            prisma.setting.findMany(queryArgs),
            prisma.setting.count({ where })
        ]);

        const userIds = [...new Set(settings.flatMap(s => [s.createdBy, s.updatedBy]).filter(Boolean))];
        const users = await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, username: true }
        });
        const userMap = {};
        users.forEach(u => {
            userMap[u.id] = u.username;
        });

        const formattedData = settings.map(item => ({
            ...item,
            createdByName: item.createdBy ? userMap[item.createdBy] || item.createdBy : 'Unknown',
            updatedByName: item.updatedBy ? userMap[item.updatedBy] || item.updatedBy : '-'
        }));

        return { 
            success: true, 
            data: {
                data: formattedData,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                }
            } 
        };
    } catch (error) {
        console.error('Error in getSettingsList:', error);
        return { success: false, message: 'Failed to fetch settings' };
    }
};

export const getSettingById = async (id) => {
    try {
        const setting = await prisma.setting.findUnique({
            where: { id, is_deleted: false },
            select: {
                id: true,
                key: true,
                value: true,
                createdAt: true,
                createdBy: true,
                updatedAt: true,
                updatedBy: true
            }
        });
        if (!setting) {
            return { success: false, message: 'Setting not found' };
        }

        const userIds = [...new Set([setting.createdBy, setting.updatedBy].filter(Boolean))];
        const users = await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, username: true }
        });
        const userMap = {};
        users.forEach(u => {
            userMap[u.id] = u.username;
        });

        const formattedSetting = {
            ...setting,
            createdByName: setting.createdBy ? userMap[setting.createdBy] || setting.createdBy : 'Unknown',
            updatedByName: setting.updatedBy ? userMap[setting.updatedBy] || setting.updatedBy : '-'
        };

        return { success: true, data: formattedSetting };
    } catch (error) {
        console.error('Error in getSettingById:', error);
        return { success: false, message: 'Failed to fetch setting' };
    }
};
export const createSetting = async (key, value, userId = null) => {
    try {
        const existing = await prisma.setting.findUnique({ where: { key } });
        if (existing) {
            return { success: false, message: 'Setting with this key already exists' };
        }
        const setting = await prisma.setting.create({
            data: { key, value, createdBy: userId }
        });
        return { success: true, data: setting, message: 'Setting created successfully' };
    } catch (error) {
        console.error('Error in createSetting:', error);
        return { success: false, message: 'Failed to create setting' };
    }
};

export const updateSetting = async (id, key, value, userId = null) => {
    try {
        const existing = await prisma.setting.findFirst({ where: { key, NOT: { id } } });
        if (existing) {
            return { success: false, message: 'Setting with this key already exists' };
        }
        const setting = await prisma.setting.update({
            where: { id },
            data: { key, value, updatedBy: userId }
        });
        return { success: true, data: setting, message: 'Setting updated successfully' };
    } catch (error) {
        console.error('Error in updateSetting:', error);
        return { success: false, message: 'Failed to update setting' };
    }
};

export const deleteSetting = async (id, userId = null) => {
    try {
        await prisma.setting.update({ 
            where: { id },
            data: { is_deleted: true, deletedAt: new Date(), deletedBy: userId }
        });
        return { success: true, message: 'Setting deleted successfully' };
    } catch (error) {
        console.error('Error in deleteSetting:', error);
        return { success: false, message: 'Failed to delete setting' };
    }
};

export const getSettings = async () => {
    try {
        const settings = await prisma.setting.findMany({ where: { is_deleted: false } });
        const settingsMap = settings.reduce((acc, curr) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {});
        return { success: true, data: settingsMap };
    } catch (error) {
        console.error('Error in getSettings service:', error);
        return { success: false, message: 'An error occurred while fetching settings.' };
    }
};

