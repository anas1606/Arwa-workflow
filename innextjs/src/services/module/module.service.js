import prisma from '@/lib/prisma';

export const getAllModules = async () => {
    try {
        const modules = await prisma.module.findMany({
            select: {
                id: true,
                module_key: true,
                name: true,
                createdAt: true
            },
            orderBy: { name: 'asc' }
        });
        
        return { success: true, data: modules };
    } catch (error) {
        console.error('Service error getting all modules:', error);
        return { success: false, message: 'Internal server error' };
    }
};
