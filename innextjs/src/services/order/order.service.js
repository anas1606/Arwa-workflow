import prisma from '@/lib/prisma';

export const createOrder = async (data, userId = null) => {
    try {
        // Use Prisma interactive transaction to ensure atomicity
        const result = await prisma.$transaction(async (tx) => {
            // 0. Compute OrderType
            let hasStandard = false;
            let hasCustomize = false;
            
            if (data.orderLines && data.orderLines.length > 0) {
                for (const line of data.orderLines) {
                    let lineType = 'STANDARD';
                    
                    if (line.accessoriesType === 'CUSTOMIZE' || line.packingType === 'CUSTOMIZE') {
                        lineType = 'CUSTOMIZE';
                    } else if (line.stickerId && line.stickerId !== 'default' && line.stickerId !== null) {
                        lineType = 'CUSTOMIZE';
                    } else if (line.bodyDesignId) {
                        const bd = await tx.productBodyDesign.findUnique({ where: { id: line.bodyDesignId } });
                        if (bd && bd.type === 'NON_STANDARD') {
                            lineType = 'CUSTOMIZE';
                        }
                    } 
                    
                    if (lineType === 'STANDARD' && line.colourId) {
                        const c = await tx.productColour.findUnique({ where: { id: line.colourId } });
                        if (c && c.type === 'NON_STANDARD') {
                            lineType = 'CUSTOMIZE';
                        }
                    }
                    
                    line.orderType = lineType;
                    
                    if (lineType === 'STANDARD') hasStandard = true;
                    if (lineType === 'CUSTOMIZE') hasCustomize = true;
                }
            }
            
            let orderType = 'STANDARD';
            if (hasStandard && hasCustomize) orderType = 'HYBRID';
            else if (hasCustomize) orderType = 'CUSTOMIZE';

            const lastOrder = await tx.order.findFirst({
                orderBy: { orderNumber: 'desc' }
            });
            
            let nextSeq = 1;
            if (lastOrder && lastOrder.orderNumber) {
                const match = lastOrder.orderNumber.match(/ORD-(\d+)/);
                if (match) {
                    nextSeq = parseInt(match[1], 10) + 1;
                } else {
                    nextSeq = (await tx.order.count()) + 1;
                }
            }
            const orderNumber = `ORD-${nextSeq.toString().padStart(5, '0')}`;

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
                    isDefaultSticker: line.stickerId === 'default',
                    accessoriesType: line.accessoriesType !== undefined ? line.accessoriesType : undefined,
                    accessoriesNote: line.accessoriesNote || null,
                    packingType: line.packingType !== undefined ? line.packingType : undefined,
                    packingNote: line.packingNote || null,
                    packagingId: (line.packagingId && line.packagingId !== 'default') ? line.packagingId : null,
                    isDefaultPackaging: line.packagingId === 'default',
                    orderType: line.orderType || 'STANDARD',
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
        
        if (filters.orderType) {
            where.orderType = Array.isArray(filters.orderType) ? { in: filters.orderType } : filters.orderType;
        }
        if (filters.priority) {
            where.priority = Array.isArray(filters.priority) ? { in: filters.priority } : filters.priority;
        }
        if (filters.status) {
            where.status = Array.isArray(filters.status) ? { in: filters.status } : filters.status;
        }
        if (filters.customerId) {
            where.customerId = Array.isArray(filters.customerId) ? { in: filters.customerId } : filters.customerId;
        }
        if (filters.productId) {
            where.orderLines = { some: { productId: Array.isArray(filters.productId) ? { in: filters.productId } : filters.productId } };
        }
        if (filters.orderNumber) {
            where.orderNumber = Array.isArray(filters.orderNumber) ? { in: filters.orderNumber } : filters.orderNumber;
        }

        if (filters.orderDate) {
            const { from, to } = filters.orderDate;
            if (from || to) {
                where.createdAt = {};
                if (from) where.createdAt.gte = new Date(from);
                if (to) {
                    const toDate = new Date(to);
                    toDate.setHours(23, 59, 59, 999);
                    where.createdAt.lte = toDate;
                }
            }
        }

        if (filters.dueDate) {
            const { from, to } = filters.dueDate;
            if (from || to) {
                where.dueDate = {};
                if (from) where.dueDate.gte = new Date(from);
                if (to) {
                    const toDate = new Date(to);
                    toDate.setHours(23, 59, 59, 999);
                    where.dueDate.lte = toDate;
                }
            }
        }

        if (filters.quantity) {
            const { min, max } = filters.quantity;
            if (min || max) {
                const havingQuantitySum = {};
                if (min) havingQuantitySum.gte = parseInt(min, 10);
                if (max) havingQuantitySum.lte = parseInt(max, 10);

                const grouped = await prisma.orderLine.groupBy({
                    by: ['orderId'],
                    _sum: { quantity: true },
                    having: {
                        quantity: {
                            _sum: havingQuantitySum
                        }
                    }
                });
                
                const validOrderIds = grouped.map(g => g.orderId);
                
                if (where.id && where.id.in) {
                    where.id.in = where.id.in.filter(id => validOrderIds.includes(id));
                } else {
                    where.id = { in: validOrderIds };
                }
            }
        }

        const [data, total, totalOrders, totalCustomized, totalProducts] = await Promise.all([
            prisma.order.findMany({
                where,
                skip,
                take,
                orderBy: {
                    createdAt: 'desc'
                },
                select: {
                    id: true,
                    orderNumber: true,
                    customerId: true,
                    dueDate: true,
                    priority: true,
                    remark: true,
                    status: true,
                    orderType: true,
                    createdAt: true,
                    customer: {
                        select: { name: true, code: true }
                    },
                    orderLines: {
                        ...(filters.productId ? { 
                            where: { 
                                productId: Array.isArray(filters.productId) ? { in: filters.productId } : filters.productId 
                            } 
                        } : {}),
                        select: {
                            id: true,
                            quantity: true,
                            orderType: true,
                            product: { select: { id: true, name: true, code: true } }
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
            select: {
                id: true,
                orderNumber: true,
                dueDate: true,
                priority: true,
                remark: true,
                status: true,
                orderType: true,
                customer: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        code: true,
                        balance: true,
                        region: true,
                    }
                },
                orderLines: {
                    select: {
                        id: true,
                        quantity: true,
                        accessoriesType: true,
                        accessoriesNote: true,
                        packingType: true,
                        packingNote: true,
                        packagingId: true,
                        bodyDesignId: true,
                        colourId: true,
                        brandId: true,
                        stickerId: true,
                        isDefaultPackaging: true,
                        isDefaultSticker: true,
                        product: {
                            select: {
                                id: true,
                                name: true,
                                code: true,
                                stockQuantity: true,
                            }
                        },
                        bodyDesign: { select: { id: true, name: true } },
                        colour: { select: { id: true, name: true } },
                        brand: { select: { id: true, brandname: true } },
                        sticker: { select: { id: true, name: true } },
                        packaging: { select: { id: true, name: true } },
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
            let hasStandard = false;
            let hasCustomize = false;
            
            if (data.orderLines && data.orderLines.length > 0) {
                for (const line of data.orderLines) {
                    let lineType = 'STANDARD';
                    
                    if (line.accessoriesType === 'CUSTOMIZE' || line.packingType === 'CUSTOMIZE') {
                        lineType = 'CUSTOMIZE';
                    } else if (line.stickerId && line.stickerId !== 'default' && line.stickerId !== null) {
                        lineType = 'CUSTOMIZE';
                    } else if (line.bodyDesignId) {
                        const bd = await tx.productBodyDesign.findUnique({ where: { id: line.bodyDesignId } });
                        if (bd && bd.type === 'NON_STANDARD') {
                            lineType = 'CUSTOMIZE';
                        }
                    } 
                    
                    if (lineType === 'STANDARD' && line.colourId) {
                        const c = await tx.productColour.findUnique({ where: { id: line.colourId } });
                        if (c && c.type === 'NON_STANDARD') {
                            lineType = 'CUSTOMIZE';
                        }
                    }
                    
                    line.orderType = lineType;
                    
                    if (lineType === 'STANDARD') hasStandard = true;
                    if (lineType === 'CUSTOMIZE') hasCustomize = true;
                }
            }
            
            let orderType = 'STANDARD';
            if (hasStandard && hasCustomize) orderType = 'HYBRID';
            else if (hasCustomize) orderType = 'CUSTOMIZE';

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
                    isDefaultSticker: line.stickerId === 'default',
                    accessoriesType: line.accessoriesType !== undefined ? line.accessoriesType : undefined,
                    accessoriesNote: line.accessoriesNote || null,
                    packingType: line.packingType !== undefined ? line.packingType : undefined,
                    packingNote: line.packingNote || null,
                    packagingId: (line.packagingId && line.packagingId !== 'default') ? line.packagingId : null,
                    isDefaultPackaging: line.packagingId === 'default',
                    orderType: line.orderType || 'STANDARD',
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

export const getOrdersByProduct = async (page = 1, limit = 10, search = '', filters = {}) => {
    try {
        const skip = (page - 1) * limit;
        const take = parseInt(limit);

        const orderWhere = { is_deleted: false };

        if (search) {
            orderWhere.OR = [
                { orderNumber: { contains: search, mode: 'insensitive' } },
                { customer: { name: { contains: search, mode: 'insensitive' } } }
            ];
        }

        if (filters.orderType) {
            orderWhere.orderType = Array.isArray(filters.orderType) ? { in: filters.orderType } : filters.orderType;
        }
        if (filters.priority) {
            orderWhere.priority = Array.isArray(filters.priority) ? { in: filters.priority } : filters.priority;
        }
        if (filters.status) {
            orderWhere.status = Array.isArray(filters.status) ? { in: filters.status } : filters.status;
        }
        if (filters.customerId) {
            orderWhere.customerId = Array.isArray(filters.customerId) ? { in: filters.customerId } : filters.customerId;
        }
        if (filters.orderNumber) {
            orderWhere.orderNumber = Array.isArray(filters.orderNumber) ? { in: filters.orderNumber } : filters.orderNumber;
        }

        if (filters.orderDate) {
            const { from, to } = filters.orderDate;
            if (from || to) {
                orderWhere.createdAt = {};
                if (from) orderWhere.createdAt.gte = new Date(from);
                if (to) {
                    const toDate = new Date(to);
                    toDate.setHours(23, 59, 59, 999);
                    orderWhere.createdAt.lte = toDate;
                }
            }
        }

        if (filters.dueDate) {
            const { from, to } = filters.dueDate;
            if (from || to) {
                orderWhere.dueDate = {};
                if (from) orderWhere.dueDate.gte = new Date(from);
                if (to) {
                    const toDate = new Date(to);
                    toDate.setHours(23, 59, 59, 999);
                    orderWhere.dueDate.lte = toDate;
                }
            }
        }

        if (filters.quantity) {
            const { min, max } = filters.quantity;
            if (min || max) {
                const havingQuantitySum = {};
                if (min) havingQuantitySum.gte = parseInt(min, 10);
                if (max) havingQuantitySum.lte = parseInt(max, 10);

                const grouped = await prisma.orderLine.groupBy({
                    by: ['orderId'],
                    _sum: { quantity: true },
                    having: {
                        quantity: {
                            _sum: havingQuantitySum
                        }
                    }
                });
                
                const validOrderIds = grouped.map(g => g.orderId);
                
                if (orderWhere.id && orderWhere.id.in) {
                    orderWhere.id.in = orderWhere.id.in.filter(id => validOrderIds.includes(id));
                } else {
                    orderWhere.id = { in: validOrderIds };
                }
            }
        }

        const productWhere = {
            orderLines: {
                some: {
                    order: orderWhere
                }
            }
        };

        if (filters.productId) {
            productWhere.id = Array.isArray(filters.productId) ? { in: filters.productId } : filters.productId;
        }

        const [products, total] = await Promise.all([
            prisma.product.findMany({
                where: productWhere,
                skip,
                take,
                orderBy: {
                    name: 'asc'
                },
                select: {
                    id: true,
                    name: true,
                    orderLines: {
                        where: {
                            order: orderWhere
                        },
                        select: {
                            quantity: true,
                            orderType: true,
                            order: {
                                select: {
                                    id: true,
                                    orderType: true
                                }
                            }
                        }
                    }
                }
            }),
            prisma.product.count({ where: productWhere })
        ]);

        const processedProducts = products.map(prod => {
            let qty = 0;
            let standard = 0;
            let customized = 0;
            const ordersSet = new Set();
            
            prod.orderLines.forEach(line => {
                qty += line.quantity;
                if (line.order && !ordersSet.has(line.order.id)) {
                    ordersSet.add(line.order.id);
                    const oType = line.orderType || line.order.orderType;
                    if (oType?.toUpperCase() === 'CUSTOMIZE') customized++;
                    else standard++;
                }
            });
            
            return {
                id: prod.id,
                product: prod.name,
                qty,
                ordersCount: ordersSet.size,
                standard,
                customized
            };
        });

        const totalPages = Math.ceil(total / take);

        return {
            success: true,
            data: {
                data: processedProducts,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: take,
                    totalPages
                }
            }
        };
    } catch (error) {
        console.error('Error in getOrdersByProduct service:', error);
        return { success: false, message: error.message };
    }
};

export const getOrderFilters = async (type = null, search = '') => {
    try {
        let customers = [];
        let products = [];
        let orderNumbers = [];
        let priorities = [];
        let statuses = [];
        let orderTypes = [];

        // Always fetch enums (they are small) or if requested
        if (!type || type === 'priority' || type === 'status' || type === 'orderType') {
            const orders = await prisma.order.findMany({
                select: { priority: true, status: true, orderType: true },
                distinct: ['priority', 'status', 'orderType']
            });
            priorities = [...new Set(orders.map(o => o.priority).filter(Boolean))];
            statuses = [...new Set(orders.map(o => o.status).filter(Boolean))];
            orderTypes = [...new Set(orders.map(o => o.orderType).filter(Boolean))];
        }

        if (!type || type === 'customer') {
            customers = await prisma.customer.findMany({
                where: { 
                    orders: { some: {} },
                    ...(search ? { name: { contains: search, mode: 'insensitive' } } : {})
                },
                select: { id: true, name: true, code: true },
                take: 10
            });
        }

        if (!type || type === 'product') {
            products = await prisma.product.findMany({
                where: { 
                    orderLines: { some: {} },
                    ...(search ? { name: { contains: search, mode: 'insensitive' } } : {})
                },
                select: { id: true, name: true, code: true },
                take: 10
            });
        }

        if (!type || type === 'orderNumber') {
            const allOrders = await prisma.order.findMany({
                where: search ? { orderNumber: { contains: search, mode: 'insensitive' } } : {},
                select: { orderNumber: true },
                orderBy: { createdAt: 'desc' },
                take: 10
            });
            orderNumbers = allOrders.map(o => o.orderNumber).filter(Boolean);
        }

        return {
            success: true,
            data: {
                customers,
                products,
                priorities,
                statuses,
                orderTypes,
                orderNumbers
            }
        };
    } catch (error) {
        console.error('Error fetching order filters:', error);
        return { success: false, message: error.message };
    }
};
