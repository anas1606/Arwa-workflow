import prisma from '@/lib/prisma';

export const createCustomer = async (data) => {
    try {
        const result = await prisma.customer.create({
            data: {
                name: data.name,
                email: data.email || null,
                phone: data.phone || null,
                balance: data.balance ? parseFloat(data.balance) : 0,
                code: data.code || null,
                region: data.region || null,
                createdBy: data.createdBy || null,
            }
        });
        return { success: true, data: result };
    } catch (error) {
        console.error('Error in createCustomer service:', error);
        if (error.code === 'P2002') {
            const field = error.meta?.target?.[0] || 'Record';
            return { success: false, message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists.` };
        }
        return { success: false, message: 'An internal server error occurred while creating customer.' };
    }
};

export const getAllCustomers = async (page = 1, limit = 10, search = '', region = '') => {
    try {
        const skip = (page - 1) * limit;
        const take = parseInt(limit);
        const where = { is_deleted: false };

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { code: { contains: search, mode: 'insensitive' } },
                { region: { contains: search, mode: 'insensitive' } }
            ];
        }

        if (region && region !== 'ALL') {
            where.region = region;
        }

        const [data, total, regionsData] = await Promise.all([
            prisma.customer.findMany({
                where,
                skip,
                take,
                orderBy: {
                    createdAt: 'desc'
                }
            }),
            prisma.customer.count({ where }),
            prisma.customer.groupBy({
                by: ['region'],
                where: { is_deleted: false, region: { not: null, not: '' } }
            })
        ]);

        const allRegions = regionsData.map(r => r.region).sort();

        return { success: true, data: { data, total, page: parseInt(page), limit: take, regions: allRegions } };
    } catch (error) {
        console.error('Error in getAllCustomers service:', error);
        return { success: false, message: error.message };
    }
};

export const getCustomerById = async (id) => {
    try {
        const result = await prisma.customer.findUnique({
            where: { id, is_deleted: false }
        });
        return { success: true, data: result };
    } catch (error) {
        console.error('Error in getCustomerById service:', error);
        return { success: false, message: error.message };
    }
};

export const updateCustomer = async (id, data) => {
    try {
        const result = await prisma.customer.update({
            where: { id },
            data: {
                name: data.name !== undefined ? data.name : undefined,
                email: data.email !== undefined ? (data.email || null) : undefined,
                phone: data.phone !== undefined ? (data.phone || null) : undefined,
                balance: data.balance !== undefined ? parseFloat(data.balance) : undefined,
                code: data.code !== undefined ? (data.code || null) : undefined,
                region: data.region !== undefined ? (data.region || null) : undefined,
                updatedBy: data.updatedBy || null,
            }
        });
        return { success: true, data: result };
    } catch (error) {
        console.error('Error in updateCustomer service:', error);
        if (error.code === 'P2002') {
            const field = error.meta?.target?.[0] || 'Record';
            return { success: false, message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists.` };
        }
        return { success: false, message: 'An internal server error occurred while updating customer.' };
    }
};

export const deleteCustomer = async (id, deletedBy = null) => {
    try {
        const result = await prisma.customer.update({
            where: { id },
            data: {
                is_deleted: true,
                deletedAt: new Date(),
                deletedBy: deletedBy
            }
        });
        return { success: true, data: result };
    } catch (error) {
        console.error('Error in deleteCustomer service:', error);
        return { success: false, message: error.message };
    }
};
