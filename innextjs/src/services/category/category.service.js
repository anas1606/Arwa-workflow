import prisma from '@/lib/prisma';

export const createCategory = async (data) => {
    try {
        const existing = await prisma.category.findFirst({
            where: {
                name: { equals: data.name, mode: 'insensitive' },
                is_deleted: false
            }
        });
        
        if (existing) {
            return { success: false, message: 'A category with this name already exists' };
        }

        if (data.parentId) {
            const parent = await prisma.category.findUnique({
                where: { id: data.parentId }
            });
            if (!parent || parent.is_deleted) {
                return { success: false, message: 'The specified parent category does not exist or has been deleted' };
            }
        }

        const result = await prisma.category.create({
            data: {
                name: data.name,
                parentId: data.parentId || null,
                isActive: data.isActive !== undefined ? data.isActive : true,
                createdBy: data.createdBy || null,
            }
        });
        return { success: true, data: result };
    } catch (error) {
        console.error('Error in createCategory service:', error);
        return { success: false, message: 'An internal server error occurred while creating category.' };
    }
};

export const getAllCategories = async (page = 1, limit = 10, search = '', statusFilter = 'ALL') => {
    try {
        const skip = (page - 1) * limit;
        const take = parseInt(limit);
        const where = { is_deleted: false };

        if (search) {
            where.name = { contains: search, mode: 'insensitive' };
        }

        if (statusFilter === 'ACTIVE') {
            where.isActive = true;
        } else if (statusFilter === 'INACTIVE') {
            where.isActive = false;
        }

        const selectFields = {
            id: true,
            name: true,
            isActive: true,
            parentId: true,
            createdAt: true,
            updatedAt: true,
            parent: {
                select: {
                    id: true,
                    name: true,
                    isActive: true,
                    parentId: true
                }
            }
        };

        const [data, total] = await Promise.all([
            prisma.category.findMany({
                where,
                skip,
                take,
                select: selectFields,
                orderBy: {
                    createdAt: 'desc'
                }
            }),
            prisma.category.count({ where })
        ]);

        const totalPages = Math.ceil(total / take);

        return { 
            success: true, 
            data: {
                data,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: take,
                    totalPages
                }
            }
        };
    } catch (error) {
        console.error('Error in getAllCategories service:', error);
        return { success: false, message: error.message };
    }
};

export const updateCategory = async (id, data) => {
    try {
        if (data.name !== undefined) {
            const existing = await prisma.category.findFirst({
                where: {
                    name: { equals: data.name, mode: 'insensitive' },
                    is_deleted: false,
                    id: { not: id }
                }
            });
            
            if (existing) {
                return { success: false, message: 'A category with this name already exists' };
            }
        }

        if (data.parentId) {
            const parent = await prisma.category.findUnique({
                where: { id: data.parentId }
            });
            if (!parent || parent.is_deleted) {
                return { success: false, message: 'The specified parent category does not exist or has been deleted' };
            }
        }

        const result = await prisma.category.update({
            where: { id },
            data: {
                name: data.name !== undefined ? data.name : undefined,
                parentId: data.parentId !== undefined ? data.parentId : undefined,
                isActive: data.isActive !== undefined ? data.isActive : undefined,
                updatedBy: data.updatedBy || null,
            }
        });
        return { success: true, data: result };
    } catch (error) {
        console.error('Error in updateCategory service:', error);
        return { success: false, message: 'An internal server error occurred while updating category.' };
    }
};

export const deleteCategory = async (id, deletedBy = null) => {
    try {
        const category = await prisma.category.findUnique({
            where: { id }
        });
        if (!category || category.is_deleted) {
            return { success: false, message: 'Category not found or has already been deleted' };
        }

        // Soft delete the target category
        await prisma.category.update({
            where: { id },
            data: {
                is_deleted: true,
                deletedAt: new Date(),
                deletedBy: deletedBy
            }
        });

        // Reparent all direct children to the deleted category's parent
        await prisma.category.updateMany({
            where: { parentId: id, is_deleted: false },
            data: {
                parentId: category.parentId
            }
        });

        return { success: true, message: 'Category deleted and subcategories reparented successfully' };
    } catch (error) {
        console.error('Error in deleteCategory service:', error);
        return { success: false, message: error.message };
    }
};

export const getCategoryById = async (id) => {
    try {
        const result = await prisma.category.findUnique({
            where: { id, is_deleted: false },
            select: {
                id: true,
                name: true,
                isActive: true,
                parentId: true,
                createdAt: true,
                updatedAt: true,
                parent: {
                    select: {
                        id: true,
                        name: true,
                        isActive: true,
                        parentId: true
                    }
                }
            }
        });
        return { success: true, data: result };
    } catch (error) {
        console.error('Error in getCategoryById service:', error);
        return { success: false, message: error.message };
    }
};

export const getCategoryKpis = async () => {
    try {
        const [total, root, active, inactive] = await Promise.all([
            prisma.category.count({ where: { is_deleted: false } }),
            prisma.category.count({ where: { parentId: null, is_deleted: false } }),
            prisma.category.count({ where: { isActive: true, is_deleted: false } }),
            prisma.category.count({ where: { isActive: false, is_deleted: false } }),
        ]);

        return { 
            success: true, 
            data: { total, root, active, inactive } 
        };
    } catch (error) {
        console.error('Error in getCategoryKpis service:', error);
        return { success: false, message: error.message };
    }
};


