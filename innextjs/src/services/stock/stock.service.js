import prisma from '@/lib/prisma';

export const getStockCategories = async (page = 1, limit = 20, search = '', parentId = undefined) => {
    try {
        const skip = (page - 1) * limit;
        const take = parseInt(limit);
        const where = { is_deleted: false };

        if (search) {
            where.name = { contains: search, mode: 'insensitive' };
        } else if (parentId !== undefined) {
            if (parentId === 'null' || parentId === null) {
                where.parentId = null;
            } else {
                where.parentId = parentId;
            }
        }

        // Fetch categories without immediate products!
        const [categories, total] = await Promise.all([
            prisma.category.findMany({
                where,
                skip,
                take,
                orderBy: { name: 'asc' },
                include: {
                    _count: {
                        select: { 
                            children: { where: { is_deleted: false } },
                            products: { where: { is_deleted: false } }
                        }
                    }
                }
            }),
            prisma.category.count({ where })
        ]);

        // Fetch products ONLY for the specific parentId being expanded!
        // We do NOT fetch products if parentId is null (root level)
        let nodeProducts = [];
        if (parentId !== undefined && parentId !== null && parentId !== 'null' && !search) {
            nodeProducts = await prisma.product.findMany({
                where: { categoryId: parentId, is_deleted: false },
                select: {
                    id: true,
                    name: true,
                    code: true,
                    categoryId: true,
                    stockQuantity: true,
                    unit: { select: { shortName: true } }
                }
            });
        }

        // Calculate deep total stock efficiently
        const allCategories = await prisma.category.findMany({
            where: { is_deleted: false },
            select: {
                id: true,
                parentId: true,
                products: {
                    where: { is_deleted: false },
                    select: { stockQuantity: true }
                }
            }
        });

        const childrenMap = {};
        const catStockMap = {};
        
        allCategories.forEach(cat => {
            const immediateStock = cat.products.reduce((sum, p) => sum + (p.stockQuantity || 0), 0);
            catStockMap[cat.id] = immediateStock;
            
            if (cat.parentId) {
                if (!childrenMap[cat.parentId]) childrenMap[cat.parentId] = [];
                childrenMap[cat.parentId].push(cat.id);
            }
        });

        const getDeepStock = (id) => {
            let sum = catStockMap[id] || 0;
            if (childrenMap[id]) {
                for (const childId of childrenMap[id]) {
                    sum += getDeepStock(childId);
                }
            }
            return sum;
        };

        const mappedData = categories.map(c => {
            const hasCategoryChildren = c._count.children > 0;
            const hasProducts = c._count.products > 0;
            const hasChildren = hasCategoryChildren || hasProducts;
            const totalStock = getDeepStock(c.id);
            
            return {
                id: c.id,
                name: c.name,
                parentId: c.parentId,
                totalStock,
                hasChildren,
                hasCategoryChildren,
                children: [], // will be loaded lazily by frontend
                childrenLoaded: false,
                products: [] // will be loaded lazily by frontend
            };
        });

        const totalProductsCount = await prisma.product.count({ where: { is_deleted: false } });
        
        const stockSumResult = await prisma.product.aggregate({
            where: { is_deleted: false },
            _sum: { stockQuantity: true }
        });
        const globalTotalStock = stockSumResult._sum.stockQuantity || 0;

        const totalPages = Math.ceil(total / take);

        return { 
            success: true, 
            data: {
                data: mappedData,
                products: nodeProducts,
                kpis: {
                    totalProducts: totalProductsCount,
                    totalStock: globalTotalStock
                },
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: take,
                    totalPages
                }
            }
        };
    } catch (error) {
        console.error('Error in getStockCategories service:', error);
        return { success: false, message: 'Failed to fetch stock categories' };
    }
};

export const updateStock = async (productId, quantity, userId = null) => {
    try {
        const product = await prisma.product.findUnique({
            where: { id: productId, is_deleted: false }
        });

        if (!product) {
            return { success: false, message: 'Product not found' };
        }

        const updatedProduct = await prisma.product.update({
            where: { id: productId },
            data: {
                stockQuantity: parseFloat(quantity),
                updatedBy: userId
            }
        });

        return { success: true, data: updatedProduct, message: 'Stock updated successfully' };
    } catch (error) {
        console.error('Error in updateStock service:', error);
        return { success: false, message: 'Failed to update stock' };
    }
};
