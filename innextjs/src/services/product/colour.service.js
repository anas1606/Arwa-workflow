import prisma from "@/lib/prisma";

export const getColours = async (page = 1, limit = 10, search = '', productId = 'ALL', minimal = false) => {
    try {
        const skip = (page - 1) * limit;
        const take = parseInt(limit, 10);

        let where = {};

        if (search) {
            where.name = {
                contains: search,
                mode: 'insensitive'
            };
        }

        if (productId && productId !== 'ALL') {
            where.productId = productId;
        }

        const selectFields = minimal ? {
            id: true,
            name: true,
            type: true
        } : {
            id: true,
            name: true,
            type: true,
            productId: true
        };

        const [colours, total] = await Promise.all([
            prisma.productColour.findMany({
                where,
                select: selectFields,
                skip,
                take,
                orderBy: { name: 'asc' }
            }),
            prisma.productColour.count({ where })
        ]);

        return {
            success: true,
            data: colours,
            meta: {
                total,
                page: parseInt(page, 10),
                limit: take,
                totalPages: Math.ceil(total / take)
            }
        };

    } catch (error) {
        console.error("Error in getColours:", error);
        return { success: false, error: "Failed to fetch colours" };
    }
};
