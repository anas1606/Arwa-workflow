import prisma from '@/lib/prisma';
import { getAllProducts } from '../product/product.service';

export const getAllCustomisations = async (page = 1, limit = 10, search = '', category = 'ALL') => {
    // Customisation uses product models, so we fetch products
    return await getAllProducts(page, limit, search, 'ALL', category, 'ALL', 'ALL');
};

export const getCustomisationKpis = async () => {
    try {
        const totalProducts = await prisma.product.count({ where: { is_deleted: false } });
        const customerBrands = await prisma.brand.count({ where: { is_deleted: false } });
        const panelStickers = await prisma.sticker.count({ where: { is_deleted: false } });
        const configuredProducts = await prisma.product.count({
            where: {
                is_deleted: false,
                bodyDesigns: { some: {} },
                colours: { some: {} }
            }
        });
        
        return {
            success: true,
            data: {
                totalProducts,
                customerBrands,
                panelStickers,
                configuredProducts
            }
        };
    } catch (error) {
        console.error('Error fetching customisation KPIs:', error);
        return { success: false, message: 'Failed to fetch customisation KPIs', error: error.message };
    }
};
