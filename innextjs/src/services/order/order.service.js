import prisma from '@/lib/prisma';

export const createOrder = async (data, userId = null) => {
    try {
        // Use Prisma interactive transaction to ensure atomicity
        const result = await prisma.$transaction(async (tx) => {
            // 0. Compute OrderType
            let orderType = 'STANDARD';
            if (data.orderLines && data.orderLines.length > 0) {
                for (const line of data.orderLines) {
                    if (line.accessoriesType === 'CUSTOMIZE' || line.packingType === 'CUSTOMIZE') {
                        orderType = 'CUSTOMIZE';
                        break;
                    }
                    if (line.stickerId && line.stickerId !== 'default' && line.stickerId !== null) {
                        orderType = 'CUSTOMIZE';
                        break;
                    }
                    if (line.bodyDesignId) {
                        const bd = await tx.productBodyDesign.findUnique({ where: { id: line.bodyDesignId } });
                        if (bd && bd.type === 'NON_STANDARD') {
                            orderType = 'CUSTOMIZE';
                            break;
                        }
                    }
                    if (line.colourId) {
                        const c = await tx.productColour.findUnique({ where: { id: line.colourId } });
                        if (c && c.type === 'NON_STANDARD') {
                            orderType = 'CUSTOMIZE';
                            break;
                        }
                    }
                }
            }

            const orderCount = await tx.order.count();
            const orderNumber = `ORD-${(orderCount + 1).toString().padStart(5, '0')}`;

            // 1. Create the Order
            const order = await tx.order.create({
                data: {
                    orderNumber,
                    customerId: data.customerId,
                    dueDate: new Date(data.dueDate),
                    priority: data.priority !== undefined ? data.priority : undefined,
                    remark: data.remark || null,
                    status: data.status !== undefined && data.status !== 'DRAFT' ? data.status : 'CONFIRMED',
                    orderType: orderType,
                    createdBy: userId || null,
                }
            });

            // 2. Map and create the OrderLines
            if (data.orderLines && data.orderLines.length > 0) {
                const orderLinesData = data.orderLines.map(line => ({
                    orderId: order.id,
                    productId: line.productId,
                    quantity: line.quantity,
                    bodyDesignId: line.bodyDesignId || null,
                    colourId: line.colourId || null,
                    brandId: line.brandId || null,
                    stickerId: (line.stickerId && line.stickerId !== 'default') ? line.stickerId : null,
                    accessoriesType: line.accessoriesType !== undefined ? line.accessoriesType : undefined,
                    accessoriesNote: line.accessoriesNote || null,
                    packingType: line.packingType !== undefined ? line.packingType : undefined,
                    packingNote: line.packingNote || null,
                    packagingId: line.packagingId || null,
                    createdBy: userId || null,
                }));

                await tx.orderLine.createMany({
                    data: orderLinesData
                });
            }

            // 3. Fetch the fully created order to return
            return await tx.order.findUnique({
                where: { id: order.id },
                include: {
                    orderLines: true,
                }
            });
        });

        return { success: true, data: result };
    } catch (error) {
        console.error('Error in createOrder service:', error);
        return { success: false, message: 'Error: ' + error.message };
    }
};

export const getAllOrders = async (page = 1, limit = 10, search = '', filters = {}) => {
    try {
        const skip = (page - 1) * limit;
        const take = parseInt(limit);
        const where = { is_deleted: false };

        if (search) {
            where.OR = [
                { orderNumber: { contains: search, mode: 'insensitive' } },
                { customer: { name: { contains: search, mode: 'insensitive' } } }
            ];
        }
        
        if (filters.orderType) where.orderType = filters.orderType;
        if (filters.priority) where.priority = filters.priority;
        if (filters.status) where.status = filters.status;
        if (filters.customerId) where.customerId = filters.customerId;
        if (filters.productId) {
            where.orderLines = { some: { productId: filters.productId } };
        }

        const [data, total, totalOrders, totalCustomized, totalProducts] = await Promise.all([
            prisma.order.findMany({
                where,
                skip,
                take,
                orderBy: {
                    createdAt: 'desc'
                },
                include: {
                    customer: {
                        select: { name: true, code: true }
                    },
                    orderLines: {
                        include: {
                            product: { select: { name: true, code: true } }
                        }
                    }
                }
            }),
            prisma.order.count({ where }),
            prisma.order.count({ where: { is_deleted: false } }),
            prisma.order.count({ where: { is_deleted: false, orderType: 'CUSTOMIZE' } }),
            prisma.orderLine.aggregate({
                where: { order: { is_deleted: false } },
                _sum: { quantity: true }
            })
        ]);

        const totalPages = Math.ceil(total / take);

        const kpis = [
            { label: 'Total Orders', value: totalOrders.toString() },
            { label: 'Customized Orders', value: totalCustomized.toString() },
            { label: 'Total Qty Ordered', value: (totalProducts._sum.quantity || 0).toString() }
        ];

        return {
            success: true,
            data: {
                data,
                kpis,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: take,
                    totalPages
                }
            }
        };
    } catch (error) {
        console.error('Error in getAllOrders service:', error);
        return { success: false, message: error.message };
    }
};

export const getOrderById = async (id) => {
    try {
        const result = await prisma.order.findUnique({
            where: { id, is_deleted: false },
            include: {
                customer: true,
                orderLines: {
                    include: {
                        product: true,
                        bodyDesign: true,
                        colour: true,
                        brand: true,
                        sticker: true,
                    }
                }
            }
        });
        return { success: true, data: result };
    } catch (error) {
        console.error('Error in getOrderById service:', error);
        return { success: false, message: error.message };
    }
};

export const updateOrder = async (id, data, userId = null) => {
    try {
        const result = await prisma.$transaction(async (tx) => {
            // 0. Compute OrderType
            let orderType = 'STANDARD';
            if (data.orderLines && data.orderLines.length > 0) {
                for (const line of data.orderLines) {
                    if (line.accessoriesType === 'CUSTOMIZE' || line.packingType === 'CUSTOMIZE') {
                        orderType = 'CUSTOMIZE';
                        break;
                    }
                    if (line.stickerId && line.stickerId !== 'default' && line.stickerId !== null) {
                        orderType = 'CUSTOMIZE';
                        break;
                    }
                    if (line.bodyDesignId) {
                        const bd = await tx.productBodyDesign.findUnique({ where: { id: line.bodyDesignId } });
                        if (bd && bd.type === 'NON_STANDARD') {
                            orderType = 'CUSTOMIZE';
                            break;
                        }
                    }
                    if (line.colourId) {
                        const c = await tx.productColour.findUnique({ where: { id: line.colourId } });
                        if (c && c.type === 'NON_STANDARD') {
                            orderType = 'CUSTOMIZE';
                            break;
                        }
                    }
                }
            }

            // 1. Update the Order
            const updatedOrder = await tx.order.update({
                where: { id },
                data: {
                    customerId: data.customerId !== undefined ? data.customerId : undefined,
                    dueDate: data.dueDate !== undefined ? new Date(data.dueDate) : undefined,
                    priority: data.priority !== undefined ? data.priority : undefined,
                    remark: data.remark !== undefined ? (data.remark || null) : undefined,
                    status: data.status !== undefined ? data.status : undefined,
                    orderType: orderType,
                    updatedBy: userId || null,
                }
            });

            // 2. Handle OrderLines Update
            if (data.orderLines && data.orderLines.length > 0) {
                // Delete existing lines
                await tx.orderLine.deleteMany({
                    where: { orderId: id }
                });

                // Insert new lines
                const orderLinesData = data.orderLines.map(line => ({
                    orderId: id,
                    productId: line.productId,
                    quantity: line.quantity,
                    bodyDesignId: line.bodyDesignId || null,
                    colourId: line.colourId || null,
                    brandId: line.brandId || null,
                    stickerId: (line.stickerId && line.stickerId !== 'default') ? line.stickerId : null,
                    accessoriesType: line.accessoriesType !== undefined ? line.accessoriesType : undefined,
                    accessoriesNote: line.accessoriesNote || null,
                    packingType: line.packingType !== undefined ? line.packingType : undefined,
                    packingNote: line.packingNote || null,
                    packagingId: line.packagingId || null,
                    createdBy: userId || null, // Assuming the order lines are recreated
                }));

                await tx.orderLine.createMany({
                    data: orderLinesData
                });
            }

            return await tx.order.findUnique({
                where: { id },
                include: { orderLines: true }
            });
        });

        return { success: true, data: result };
    } catch (error) {
        console.error('Error in updateOrder service:', error);
        return { success: false, message: 'An internal server error occurred while updating the order.' };
    }
};

export const deleteOrder = async (id, deletedBy = null) => {
    try {
        const result = await prisma.order.update({
            where: { id },
            data: {
                is_deleted: true,
                deletedAt: new Date(),
                deletedBy: deletedBy
            }
        });
        return { success: true, data: result };
    } catch (error) {
        console.error('Error in deleteOrder service:', error);
        return { success: false, message: error.message };
    }
};
