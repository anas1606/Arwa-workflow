import prisma from '@/lib/prisma';

export const createUnit = async (data) => {
    try {
        const result = await prisma.unit.create({
            data: {
                name: data.name,
                shortName: data.shortName || null,
                quantityUnit: data.quantityUnit || 1,
                createdBy: data.createdBy || null,
            }
        });
        return { success: true, data: result };
    } catch (error) {
        console.error('Error in createUnit service:', error);
        return { success: false, message: 'An internal server error occurred while creating unit.' };
    }
};

export const getAllUnits = async (page = 1, limit = 10, search = '', status = 'ALL') => {
    try {
        const skip = (page - 1) * limit;
        const take = parseInt(limit);
        const where = { is_deleted: false };

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { shortName: { contains: search, mode: 'insensitive' } },
            ];
            // If search is a number, we can search by quantityUnit using a raw query for partial matching
            if (!isNaN(parseInt(search))) {
                const rawUnits = await prisma.$queryRaw`
                    SELECT id FROM "Unit" WHERE "quantity_unit"::text LIKE ${'%' + search + '%'}
                `;
                if (rawUnits.length > 0) {
                    where.OR.push({ id: { in: rawUnits.map(u => u.id) } });
                }
            }
        }

        if (status === 'ACTIVE') {
            where.status = true;
        } else if (status === 'INACTIVE') {
            where.status = false;
        }

        const [data, total, activeCount, inactiveCount] = await Promise.all([
            prisma.unit.findMany({
                where,
                skip,
                take,
                orderBy: {
                    createdAt: 'desc'
                },
                select: {
                    id: true,
                    name: true,
                    shortName: true,
                    quantityUnit: true,
                  
                    status: true,
                    createdAt: true,
                    updatedAt: true,
                }
            }),
            
            prisma.unit.count({ where }),
            prisma.unit.count({ where: { is_deleted: false, status: true } }),
            prisma.unit.count({ where: { is_deleted: false, status: false } })
        ]);

        return { 
            success: true, 
            data: { 
                data, 
                pagination: { 
                    total, 
                    page: parseInt(page), 
                    limit: parseInt(limit), 
                    totalPages: Math.ceil(total / limit) 
                },
                stats: {
                    active: activeCount,
                    inactive: inactiveCount,
                    total: activeCount + inactiveCount
                }
            } 
        };
    } catch (error) {
        console.error('Error in getAllUnits service:', error);
        return { success: false, message: 'An internal server error occurred while fetching units.' };
    }
};

export const getUnitById = async (id) => {
    try {
        const unit = await prisma.unit.findFirst({
            where: { id, is_deleted: false },
        });

        if (!unit) return { success: false, message: 'Unit not found' };
        return { success: true, data: unit };
    } catch (error) {
        console.error('Error in getUnitById service:', error);
        return { success: false, message: 'An internal server error occurred while fetching unit.' };
    }
};

export const updateUnit = async (data) => {
    try {
        const existingUnit = await prisma.unit.findFirst({
            where: { id: data.id, is_deleted: false }
        });

        if (!existingUnit) {
            return { success: false, message: 'Unit not found' };
        }

        const result = await prisma.unit.update({
            where: { id: data.id },
            data: {
                name: data.name !== undefined ? data.name : existingUnit.name,
                shortName: data.shortName !== undefined ? data.shortName : existingUnit.shortName,
                quantityUnit: data.quantityUnit !== undefined ? data.quantityUnit : existingUnit.quantityUnit,
                status: data.status !== undefined ? data.status : existingUnit.status,
                updatedBy: data.updatedBy || null,
            }
        });
        return { success: true, data: result };
    } catch (error) {
        console.error('Error in updateUnit service:', error);
        return { success: false, message: 'An internal server error occurred while updating unit.' };
    }
};

export const deleteUnit = async (id, deletedBy) => {
    try {
        const existingUnit = await prisma.unit.findFirst({
            where: { id, is_deleted: false }
        });

        if (!existingUnit) {
            return { success: false, message: 'Unit not found' };
        }

        const result = await prisma.unit.update({
            where: { id },
            data: {
                is_deleted: true,
                deletedAt: new Date(),
                deletedBy: deletedBy || null,
            }
        });
        return { success: true, data: result };
    } catch (error) {
        console.error('Error in deleteUnit service:', error);
        return { success: false, message: 'An internal server error occurred while deleting unit.' };
    }
};
