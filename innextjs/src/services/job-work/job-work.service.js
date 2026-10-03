import prisma from '@/lib/prisma';

const checkUnfulfillableShortages = async (tx, productId, quantity) => {
    const bom = await tx.bom.findFirst({
        where: { productId, is_deleted: false },
        include: {
            items: {
                include: {
                    product: {
                        select: {
                            id: true,
                            name: true,
                            stockQuantity: true,
                            _count: {
                                select: { bomsAsMainProduct: { where: { is_deleted: false } } }
                            }
                        }
                    }
                }
            }
        }
    });

    if (bom) {
        for (const item of bom.items) {
            const requiredQty = item.quantity * quantity;
            const stockQty = item.product.stockQuantity || 0;
            const shortageQty = requiredQty - stockQty;
            const hasSubBom = item.product._count.bomsAsMainProduct > 0;

            if (shortageQty > 0) {
                if (hasSubBom) {
                    await checkUnfulfillableShortages(tx, item.productId, shortageQty);
                } else {
                    throw new Error(`Insufficient stock for product '${item.product.name}'. Please fulfill the stock first to create this job work.`);
                }
            }
        }
    }
};

const recursivelyCreateJobWork = async (tx, productId, quantity, parentJobWorkId, userId, seqCtx) => {
    const bom = await tx.bom.findFirst({
        where: { productId, is_deleted: false },
        include: {
            items: {
                include: {
                    product: {
                        select: {
                            id: true,
                            stockQuantity: true,
                            _count: {
                                select: { bomsAsMainProduct: { where: { is_deleted: false } } }
                            }
                        }
                    }
                }
            }
        }
    });

    const currentJobWork = await tx.jobWork.create({
        data: {
            jobWorkNumber: seqCtx.generateNumber(),
            productId,
            quantity,
            status: 'CREATED',
            parentJobWorkId: parentJobWorkId || null,
            bomId: bom ? bom.id : null,
            createdBy: userId || null,
            items: {
                create: bom ? bom.items.map(item => {
                    const requiredQty = item.quantity * quantity;
                    const allocatedQty = Math.min(requiredQty, item.product.stockQuantity || 0);
                    return {
                        productId: item.productId,
                        requiredQty,
                        allocatedQty
                    };
                }) : []
            }
        },
        include: {
            product: { select: { id: true, name: true, code: true } },
            items: {
                select: {
                    id: true,
                    requiredQty: true,
                    allocatedQty: true,
                    product: { select: { id: true, name: true, code: true } }
                }
            }
        }
    });

    if (bom) {
        for (const item of bom.items) {
            const requiredQty = item.quantity * quantity;
            const stockQty = item.product.stockQuantity || 0;
            const shortageQty = requiredQty - stockQty;
            const hasSubBom = item.product._count.bomsAsMainProduct > 0;

            if (shortageQty > 0 && hasSubBom) {
                await recursivelyCreateJobWork(tx, item.productId, shortageQty, currentJobWork.id, userId, seqCtx);
            }
        }
    }

    return currentJobWork;
};

export const createJobWork = async (data, userId = null) => {
    try {
        const result = await prisma.$transaction(async (tx) => {
            const mainProduct = await tx.product.findUnique({
                where: { id: data.productId }
            });
            if (!mainProduct || mainProduct.is_deleted) {
                throw new Error('The specified product does not exist or has been deleted');
            }

            // Determine next sequence number
            const lastJobWork = await tx.jobWork.findFirst({
                orderBy: { createdAt: 'desc' },
                where: { jobWorkNumber: { startsWith: 'JBW' } }
            });
            let nextSequence = 1;
            if (lastJobWork && lastJobWork.jobWorkNumber) {
                const parsed = parseInt(lastJobWork.jobWorkNumber.replace('JBW', ''), 10);
                if (!isNaN(parsed)) {
                    nextSequence = parsed + 1;
                }
            }

            const seqCtx = {
                nextSequence,
                generateNumber: function () {
                    const num = this.nextSequence;
                    this.nextSequence++;
                    return `JBW${num.toString().padStart(4, '0')}`;
                }
            };

            if (data.autoCascade) {
                // First validate if it's even possible to fulfill all shortages
                await checkUnfulfillableShortages(tx, data.productId, data.quantity);

                return await recursivelyCreateJobWork(tx, data.productId, data.quantity, data.parentJobWorkId, userId, seqCtx);
            }

            return await tx.jobWork.create({
                data: {
                    jobWorkNumber: seqCtx.generateNumber(),
                    productId: data.productId,
                    quantity: data.quantity,
                    status: data.status || 'CREATED',
                    parentJobWorkId: data.parentJobWorkId || null,
                    bomId: data.bomId || null,
                    createdBy: userId || null,
                    items: {
                        create: data.items ? data.items.map(item => ({
                            productId: item.productId,
                            requiredQty: item.requiredQty,
                            allocatedQty: item.allocatedQty
                        })) : []
                    }
                },
                include: {
                    product: { select: { id: true, name: true, code: true } },
                    items: {
                        select: {
                            id: true,
                            requiredQty: true,
                            allocatedQty: true,
                            product: { select: { id: true, name: true, code: true } }
                        }
                    }
                }
            });
        });

        return { success: true, data: result };
    } catch (error) {
        console.error('Error in createJobWork service:', error);
        return { success: false, message: error.message || 'Internal server error while creating Job Work' };
    }
};

export const getAllJobWorks = async (page = 1, limit = 10, search = '') => {
    try {
        const skip = (page - 1) * limit;
        const take = parseInt(limit);
        const where = { is_deleted: false };

        if (search) {
            where.OR = [
                { jobWorkNumber: { contains: search, mode: 'insensitive' } },
                { product: { name: { contains: search, mode: 'insensitive' } } }
            ];
        }

        const [data, total] = await Promise.all([
            prisma.jobWork.findMany({
                where,
                skip,
                take,
                select: {
                    id: true,
                    jobWorkNumber: true,
                    status: true,
                    quantity: true,
                    createdAt: true,
                    updatedAt: true,
                    createdBy: true,
                    updatedBy: true,
                    product: {
                        select: { name: true, code: true }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            }),
            prisma.jobWork.count({ where })
        ]);

        const totalPages = Math.ceil(total / take);

        const userIds = new Set();
        data.forEach(o => {
            if (o.createdBy) userIds.add(o.createdBy);
            if (o.updatedBy) userIds.add(o.updatedBy);
        });

        if (userIds.size > 0) {
            const users = await prisma.user.findMany({
                where: { id: { in: Array.from(userIds) } },
                select: { id: true, username: true }
            });
            const userMap = {};
            users.forEach(u => { userMap[u.id] = u.username; });
            
            data.forEach(o => {
                o.createdByName = userMap[o.createdBy] || null;
                o.updatedByName = userMap[o.updatedBy] || null;
            });
        }

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
        console.error('Error in getAllJobWorks service:', error);
        return { success: false, message: 'Internal server error while fetching Job Works' };
    }
};

export const getJobWorkById = async (id) => {
    try {
        const jobWork = await prisma.jobWork.findUnique({
            where: { id, is_deleted: false },
            select: {
                id: true,
                jobWorkNumber: true,
                quantity: true,
                status: true,
                parentJobWorkId: true,
                bomId: true,
                createdAt: true,
                product: {
                    select: { id: true, name: true, code: true }
                },
                items: {
                    select: {
                        id: true,
                        requiredQty: true,
                        allocatedQty: true,
                        product: {
                            select: { id: true, name: true, code: true }
                        }
                    }
                }
            }
        });

        if (!jobWork) {
            return { success: false, message: 'Job Work not found' };
        }

        let identifierProductId = null;
        if (jobWork.bomId) {
            const bomItem = await prisma.bomItem.findFirst({
                where: { bomId: jobWork.bomId, isIdentifier: true },
                select: { productId: true }
            });
            if (bomItem) {
                identifierProductId = bomItem.productId;
            }
        }

        const mappedItems = jobWork.items.map(item => ({
            ...item,
            isIdentifier: item.product.id === identifierProductId
        }));

        return { success: true, data: { ...jobWork, items: mappedItems } };
    } catch (error) {
        console.error('Error in getJobWorkById service:', error);
        return { success: false, message: 'Internal server error while fetching the Job Work' };
    }
};

export const updateJobWork = async (id, data, userId = null) => {
    try {
        const result = await prisma.$transaction(async (tx) => {
            const existing = await tx.jobWork.findUnique({
                where: { id, is_deleted: false }
            });

            if (!existing) {
                throw new Error('Job Work not found');
            }

            const updateData = {};
            if (data.productId !== undefined) updateData.productId = data.productId;
            if (data.quantity !== undefined) updateData.quantity = data.quantity;
            if (data.status !== undefined) updateData.status = data.status;
            if (data.parentJobWorkId !== undefined) updateData.parentJobWorkId = data.parentJobWorkId;
            if (data.bomId !== undefined) updateData.bomId = data.bomId;
            if (userId) updateData.updatedBy = userId;

            if (data.items !== undefined) {
                updateData.items = {
                    deleteMany: {},
                    create: data.items.map(item => ({
                        productId: item.productId,
                        requiredQty: item.requiredQty,
                        allocatedQty: item.allocatedQty
                    }))
                };
            }

            return await tx.jobWork.update({
                where: { id },
                data: updateData,
                select: { id: true, jobWorkNumber: true }
            });
        });

        return { success: true, data: result };
    } catch (error) {
        console.error('Error in updateJobWork service:', error);
        return { success: false, message: 'Internal server error while updating Job Work' };
    }
};

export const deleteJobWork = async (id, userId = null) => {
    try {
        const jobWork = await prisma.jobWork.findUnique({
            where: { id }
        });
        if (!jobWork || jobWork.is_deleted) {
            return { success: false, message: 'Job Work not found or already deleted' };
        }

        await prisma.jobWork.update({
            where: { id },
            data: {
                is_deleted: true,
                deletedAt: new Date(),
                deletedBy: userId
            }
        });

        return { success: true, data: { id } };
    } catch (error) {
        console.error('Error deleting Job Work:', error);
        return { success: false, message: 'Internal error while deleting the Job Work' };
    }
};
