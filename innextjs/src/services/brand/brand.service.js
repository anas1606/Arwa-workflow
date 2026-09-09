import prisma from '@/lib/prisma';

export const createBrand = async (data) => {
    try {
        const result = await prisma.brand.create({
            data: {
                brandname: data.brandname,
                customer_id: data.customer_id,
                description: data.description || null,
                createdBy: data.createdBy || null,
            }
        });
        return { success: true, data: result };
    } catch (error) {
        console.error('Error in createBrand service:', error);
        return { success: false, message: 'An internal server error occurred while creating brand.' };
    }
};

export const getAllBrands = async (page = 1, limit = 10, search = '', customerId = '') => {
    try {
        const skip = (page - 1) * limit;
        const take = parseInt(limit);
        const where = { is_deleted: false };

        if (search) {
            where.OR = [
                { brandname: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } }
            ];
        }

        if (customerId) {
            where.customer_id = customerId;
        }

        const [data, total] = await Promise.all([
            prisma.brand.findMany({
                where,
                skip,
                take,
                orderBy: {
                    createdAt: 'desc'
                },
                include: {
                   
                    _count: {
                        select: {
                            stickers: { where: { is_deleted: false } }
                        }
                    }
                }
            }),
            prisma.brand.count({ where })
        ]);

        const formattedData = data.map(brand => {
            const { _count, createdBy, updatedBy, is_deleted, deletedAt, deletedBy, ...rest } = brand;
            return {
                ...rest,
                stickers: _count?.stickers || 0
            };
        });

        return { success: true, data: { data: formattedData, total, page: parseInt(page), limit: take } };
    } catch (error) {
        console.error('Error in getAllBrands service:', error);
        return { success: false, message: error.message };
    }
};

export const getBrandById = async (id) => {
    try {
        const result = await prisma.brand.findUnique({
            where: { id, is_deleted: false },
            include: { customer: true }
        });
        return { success: true, data: result };
    } catch (error) {
        console.error('Error in getBrandById service:', error);
        return { success: false, message: error.message };
    }
};

export const updateBrand = async (id, data) => {
    try {
        const result = await prisma.brand.update({
            where: { id },
            data: {
                brandname: data.brandname !== undefined ? data.brandname : undefined,
                customer_id: data.customer_id !== undefined ? data.customer_id : undefined,
                description: data.description !== undefined ? (data.description || null) : undefined,
                updatedBy: data.updatedBy || null,
            }
        });
        return { success: true, data: result };
    } catch (error) {
        console.error('Error in updateBrand service:', error);
        return { success: false, message: 'An internal server error occurred while updating brand.' };
    }
};

export const deleteBrand = async (id, deletedBy = null) => {
    try {
        const result = await prisma.brand.update({
            where: { id },
            data: {
                is_deleted: true,
                deletedAt: new Date(),
                deletedBy: deletedBy
            }
        });
        return { success: true, data: result };
    } catch (error) {
        console.error('Error in deleteBrand service:', error);
        return { success: false, message: error.message };
    }
};

export const getBrandsByCustomerId = async (customerId) => {
    try {
        const where = { is_deleted: false };
        if (customerId && customerId !== 'ALL') {
            where.customer_id = customerId;
        }

        const rawResult = await prisma.brand.findMany({
            where,
            include: {
                _count: {
                    select: {
                        stickers: { where: { is_deleted: false } }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        const result = rawResult.map(brand => {
            const { _count, createdBy, updatedBy, is_deleted, deletedAt, deletedBy, ...rest } = brand;
            return {
                ...rest,
                stickers: _count?.stickers || 0
            };
        });

        return { success: true, data: result };
    } catch (error) {
        console.error('Error in getBrandsByCustomerId service:', error);
        return { success: false, message: error.message };
    }
};
