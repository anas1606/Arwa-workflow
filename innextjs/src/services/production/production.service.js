import prisma from '@/lib/prisma';

export const getBomRequirements = async (productId, targetQuantity, page = 1, limit = 10) => {
    try {
        const qty = parseFloat(targetQuantity);
        if (isNaN(qty) || qty <= 0) {
            return { success: false, message: 'Invalid target quantity' };
        }

        const skip = (page - 1) * limit;

        const bom = await prisma.bom.findFirst({
            where: { 
                productId, 
                is_deleted: false 
            },
            include: {
                _count: {
                    select: { items: true }
                },
                items: {
                    skip: skip,
                    take: limit,
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                code: true,
                                stockQuantity: true,
                                _count: {
                                    select: {
                                        bomsAsMainProduct: {
                                            where: { is_deleted: false }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!bom) {
            return { success: false, message: 'No BOM found for this product' };
        }

        const requirements = bom.items.map(item => {
            const requiredQty = item.quantity * qty;
            const hasSubBom = item.product._count.bomsAsMainProduct > 0;

            return {
                bomItemId: item.id,
                productId: item.product.id,
                productName: item.product.name,
                productCode: item.product.code,
                baseQuantity: item.quantity,
                requiredQuantity: requiredQty,
                stockQuantity: item.product.stockQuantity,
                hasSubBom: hasSubBom,
                isShortage: requiredQty > item.product.stockQuantity
            };
        });

        return { 
            success: true, 
            data: {
                bomId: bom.id,
                bomName: bom.name,
                productId: productId,
                targetQuantity: qty,
                requirements: requirements,
                pagination: {
                    total: bom._count.items,
                    page: page,
                    limit: limit,
                    hasMore: skip + requirements.length < bom._count.items
                }
            }
        };

    } catch (error) {
        console.error('Error in getBomRequirements service:', error);
        return { success: false, message: 'An internal server error occurred while fetching BOM requirements.' };
    }
};
