import prisma from '@/lib/prisma';

export const createCustomer = async (data, userId = null) => {
    try {
        const result = await prisma.customer.create({
            data: {
                name: data.name,
                email: data.email || null,
                phone: data.phone || null,
                balance: data.balance !== undefined ? parseFloat(data.balance) : undefined,
                code: data.code || null,
                region: data.region || null,
                createdBy: userId || data.createdBy || null,
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

export const getAllCustomers = async (page = 1, limit = 10, search = '', region = '', minimal = false) => {
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

        const selectFields = minimal ? {
            id: true,
            name: true,
            code: true,
            region: true
        } : {
            id: true,
            name: true,
            code: true,
            region: true,
            createdAt: true,
            updatedAt: true,
            createdBy: true,
            updatedBy: true,
            _count: {
                select: {
                    brands: { where: { is_deleted: false } }
                }
            }
        };

        const queries = [
            prisma.customer.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: 'desc' },
                select: selectFields
            }),
            prisma.customer.count({ where })
        ];

        if (!minimal) {
            queries.push(prisma.customer.groupBy({
                by: ['region'],
                where: { is_deleted: false, region: { not: null, not: '' } }
            }));
        }

        const results = await Promise.all(queries);
        const data = results[0];
        const total = results[1];
        const regionsData = minimal ? [] : results[2];

        const allRegions = regionsData.map(r => r.region).sort();
        
        let formattedData = data;
        
        if (!minimal) {
            const userIds = [...new Set(data.flatMap(c => [c.createdBy, c.updatedBy]).filter(Boolean))];
            const users = await prisma.user.findMany({
                where: { id: { in: userIds } },
                select: { id: true, username: true }
            });
            const userMap = {};
            users.forEach(u => {
                userMap[u.id] = u.username;
            });

            formattedData = data.map(customer => ({
                id: customer.id,
                name: customer.name,
                code: customer.code,
                region: customer.region,
                createdAt: customer.createdAt,
                updatedAt: customer.updatedAt,
                createdBy: customer.createdBy,
                updatedBy: customer.updatedBy,
                createdByName: customer.createdBy ? userMap[customer.createdBy] || customer.createdBy : 'Unknown',
                updatedByName: customer.updatedBy ? userMap[customer.updatedBy] || customer.updatedBy : '-',
                brands: customer._count.brands
            }));
        }

        const totalPages = Math.ceil(total / take);

        return { 
            success: true, 
            data: { 
                data: formattedData, 
                regions: allRegions,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: take,
                    totalPages
                }
            } 
        };
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

export const updateCustomer = async (id, data, userId = null) => {
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
                updatedBy: userId || data.updatedBy || null,
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
