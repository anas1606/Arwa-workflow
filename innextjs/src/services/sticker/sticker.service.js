import prisma from '@/lib/prisma';

export const createSticker = async (data) => {
    try {
        const result = await prisma.sticker.create({
            data: {
                name: data.name,
                brand_id: data.brand_id,
                createdBy: data.createdBy || null,
            }
        });
        return { success: true, data: result };
    } catch (error) {
        console.error('Error in createSticker service:', error);
        return { success: false, message: 'An internal server error occurred while creating sticker.' };
    }
};

export const getAllStickers = async (page = 1, limit = 10, search = '', brandId = '') => {
    try {
        const skip = (page - 1) * limit;
        const take = parseInt(limit);
        const where = { is_deleted: false };

        if (search) {
            where.name = { contains: search, mode: 'insensitive' };
        }

        if (brandId) {
            where.brand_id = brandId;
        }

        const [data, total] = await Promise.all([
            prisma.sticker.findMany({
                where,
                skip,
                take,
                orderBy: {
                    createdAt: 'desc'
                },
                include: {
                    brand: true
                }
            }),
            prisma.sticker.count({ where })
        ]);

        return { success: true, data: { data, total, page: parseInt(page), limit: take } };
    } catch (error) {
        console.error('Error in getAllStickers service:', error);
        return { success: false, message: error.message };
    }
};

export const getStickerById = async (id) => {
    try {
        const result = await prisma.sticker.findUnique({
            where: { id, is_deleted: false },
            include: { brand: true }
        });
        return { success: true, data: result };
    } catch (error) {
        console.error('Error in getStickerById service:', error);
        return { success: false, message: error.message };
    }
};

export const updateSticker = async (id, data) => {
    try {
        const result = await prisma.sticker.update({
            where: { id },
            data: {
                name: data.name !== undefined ? data.name : undefined,
                brand_id: data.brand_id !== undefined ? data.brand_id : undefined,
                updatedBy: data.updatedBy || null,
            }
        });
        return { success: true, data: result };
    } catch (error) {
        console.error('Error in updateSticker service:', error);
        return { success: false, message: 'An internal server error occurred while updating sticker.' };
    }
};

export const deleteSticker = async (id, deletedBy = null) => {
    try {
        const result = await prisma.sticker.update({
            where: { id },
            data: {
                is_deleted: true,
                deletedAt: new Date(),
                deletedBy: deletedBy
            }
        });
        return { success: true, data: result };
    } catch (error) {
        console.error('Error in deleteSticker service:', error);
        return { success: false, message: error.message };
    }
};

export const getStickersByBrandId = async (brandId) => {
    try {
        const result = await prisma.sticker.findMany({
            where: { brand_id: brandId, is_deleted: false },
            orderBy: {
                createdAt: 'desc'
            }
        });
        
        const filteredResult = result.map(sticker => {
            const { createdBy, updatedBy, is_deleted, deletedAt, deletedBy, ...rest } = sticker;
            return rest;
        });
        
        return { success: true, data: filteredResult };
    } catch (error) {
        console.error('Error in getStickersByBrandId service:', error);
        return { success: false, message: error.message };
    }
};
