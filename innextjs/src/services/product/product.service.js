import prisma from '@/lib/prisma';

export const createProduct = async (data, userId = null) => {
    try {
        // Ensure name is unique or code is unique? Typically code is unique.
        if (data.code) {
            const existingCode = await prisma.product.findFirst({
                where: {
                    code: { equals: data.code, mode: 'insensitive' },
                    is_deleted: false
                }
            });
            if (existingCode) {
                return { success: false, message: 'A product with this code already exists' };
            }
        }

        const existingName = await prisma.product.findFirst({
            where: {
                name: { equals: data.name, mode: 'insensitive' },
                is_deleted: false
            }
        });
        
        if (existingName) {
            return { success: false, message: 'A product with this name already exists' };
        }

        // Validate Category and Unit if provided
        if (data.categoryId) {
            const category = await prisma.category.findUnique({
                where: { id: data.categoryId }
            });
            if (!category || category.is_deleted) {
                return { success: false, message: 'The specified category does not exist or has been deleted' };
            }
        }

        if (data.unitId) {
            const unit = await prisma.unit.findUnique({
                where: { id: data.unitId }
            });
            if (!unit || unit.is_deleted) {
                return { success: false, message: 'The specified unit does not exist or has been deleted' };
            }
        }

        const result = await prisma.product.create({
            data: {
                name: data.name,
                code: data.code || null,
                stockQuantity: data.stockQuantity || 0,
                lowStockThreshold: data.lowStockThreshold !== undefined ? data.lowStockThreshold : 10,
                categoryId: data.categoryId || null,
                unitId: data.unitId || null,
                isActive: data.isActive !== undefined ? data.isActive : true,
                createdBy: userId || data.createdBy || null,
            }
        });
        return { success: true, data: result };
    } catch (error) {
        console.error('Error in createProduct service:', error);
        return { success: false, message: 'An internal server error occurred while creating product.', error: error.message };
    }
};

export const getAllProducts = async (page = 1, limit = 10, search = '', statusFilter = 'ALL', categoryId = 'ALL', stockFilter = 'ALL', unitId = 'ALL') => {
    try {
        const skip = (page - 1) * limit;
        const take = parseInt(limit);
        const where = { is_deleted: false };

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { code: { contains: search, mode: 'insensitive' } }
            ];
        }

        if (statusFilter === 'ACTIVE') {
            where.isActive = true;
        } else if (statusFilter === 'INACTIVE') {
            where.isActive = false;
        }

        if (categoryId && categoryId !== 'ALL') {
            const allCats = await prisma.category.findMany({
                where: { is_deleted: false },
                select: { id: true, parentId: true }
            });

            const getDescendants = (parentId, categories) => {
                let descendants = new Set();
                const children = categories.filter(c => c.parentId === parentId);
                children.forEach(c => {
                    descendants.add(c.id);
                    getDescendants(c.id, categories).forEach(d => descendants.add(d));
                });
                return descendants;
            };

            const descendantIds = Array.from(getDescendants(categoryId, allCats));
            
            where.categoryId = {
                in: [categoryId, ...descendantIds]
            };
        }

        if (unitId && unitId !== 'ALL') {
            where.unitId = unitId;
        }

        if (stockFilter === 'LOW') {
            where.stockQuantity = { lte: prisma.product.fields.lowStockThreshold };
        }

        const selectFields = {
            id: true,
            name: true,
            code: true,
            stockQuantity: true,
            lowStockThreshold: true,
            isActive: true,
            categoryId: true,
            unitId: true,
            createdAt: true,
            updatedAt: true,
            category: {
                select: {
                    id: true,
                    name: true
                }
            },
            unit: {
                select: {
                    id: true,
                    name: true,
                    shortName: true
                }
            }
        };

        const [data, total] = await Promise.all([
            prisma.product.findMany({
                where,
                skip,
                take,
                select: selectFields,
                orderBy: {
                    createdAt: 'desc'
                }
            }),
            prisma.product.count({ where })
        ]);

        const totalPages = Math.ceil(total / take);

        return { 
            success: true, 
            data: {
                data,
                pagination: {
                    totalItems: total,
                    pageSize: take,
                    pageNo: parseInt(page),
                    totalPages
                }
            } 
        };
    } catch (error) {
        console.error('Error in getAllProducts service:', error);
        return { success: false, message: 'An internal server error occurred while fetching products.' };
    }
};

export const getProductById = async (id) => {
    try {
        const product = await prisma.product.findUnique({
            where: { id, is_deleted: false },
            include: {
                category: {
                    select: { id: true, name: true }
                },
                unit: {
                    select: { id: true, name: true, shortName: true }
                }
            }
        });

        if (!product) {
            return { success: false, message: 'Product not found' };
        }

        return { success: true, data: product };
    } catch (error) {
        console.error('Error in getProductById service:', error);
        return { success: false, message: 'An internal server error occurred while fetching the product.' };
    }
};

export const updateProduct = async (id, data, userId = null) => {
    try {
        const existing = await prisma.product.findUnique({
            where: { id, is_deleted: false }
        });

        if (!existing) {
            return { success: false, message: 'Product not found' };
        }

        if (data.code && data.code !== existing.code) {
            const existingCode = await prisma.product.findFirst({
                where: {
                    code: { equals: data.code, mode: 'insensitive' },
                    is_deleted: false,
                    id: { not: id }
                }
            });
            if (existingCode) {
                return { success: false, message: 'A product with this code already exists' };
            }
        }

        if (data.name && data.name !== existing.name) {
            const existingName = await prisma.product.findFirst({
                where: {
                    name: { equals: data.name, mode: 'insensitive' },
                    is_deleted: false,
                    id: { not: id }
                }
            });
            if (existingName) {
                return { success: false, message: 'A product with this name already exists' };
            }
        }

        const updateData = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.code !== undefined) updateData.code = data.code;
        if (data.stockQuantity !== undefined) updateData.stockQuantity = data.stockQuantity;
        if (data.lowStockThreshold !== undefined) updateData.lowStockThreshold = data.lowStockThreshold;
        if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
        if (data.unitId !== undefined) updateData.unitId = data.unitId;
        if (data.isActive !== undefined) updateData.isActive = data.isActive;
        if (userId || data.updatedBy) updateData.updatedBy = userId || data.updatedBy;

        const result = await prisma.product.update({
            where: { id },
            data: updateData
        });

        return { success: true, data: result };
    } catch (error) {
        console.error('Error in updateProduct service:', error);
        return { success: false, message: 'An internal server error occurred while updating product.' };
    }
};

export const deleteProduct = async (id, deletedBy = null) => {
    try {
        const product = await prisma.product.findUnique({
            where: { id }
        });
        if (!product || product.is_deleted) {
            return { success: false, message: 'Product not found or has already been deleted' };
        }

        const deletedProduct = await prisma.product.update({
            where: { id },
            data: {
                is_deleted: true,
                deletedAt: new Date(),
                deletedBy: deletedBy
            }
        });

        return { success: true, data: deletedProduct };
    } catch (error) {
        console.error('Error deleting product:', error);
        return { success: false, message: 'An internal error occurred while deleting the product' };
    }
};

export const getProductKpis = async () => {
    try {
        const [total, active, inactive, lowStock] = await Promise.all([
            prisma.product.count({ where: { is_deleted: false } }),
            prisma.product.count({ where: { is_deleted: false, isActive: true } }),
            prisma.product.count({ where: { is_deleted: false, isActive: false } }),
            prisma.product.count({ where: { is_deleted: false, stockQuantity: { lte: prisma.product.fields.lowStockThreshold } } })
        ]);

        return {
            success: true,
            data: { total, active, inactive, lowStock }
        };
    } catch (error) {
        console.error('Error in getProductKpis service:', error);
        return { success: false, message: 'An internal server error occurred while fetching KPIs.' };
    }
};


