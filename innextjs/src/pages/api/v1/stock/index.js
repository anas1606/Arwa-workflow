import { getStockCategories, updateStock } from '@/services/stock/stock.service';
import { successResponse, errorResponse } from '@/lib/response';

export default async function handler(req, res) {
    const { method } = req;

    try {
        switch (method) {
            case 'GET': {
                const { page = 1, limit = 20, search = '', parentId } = req.query;
                const result = await getStockCategories(page, limit, search, parentId);
                if (result.success) {
                    return successResponse(res, 'Fetched successfully', result.data);
                }
                return errorResponse(res, 'Failed to fetch Stock data', result.message);
            }
            case 'PUT': {
                const { productId, quantity } = req.body;
                
                if (!productId || quantity === undefined || quantity === null) {
                    return errorResponse(res, 'Validation Error', 'Product ID and quantity are required', 400);
                }
                
                const userId = req.headers['x-user-id'] || null;
                const result = await updateStock(productId, quantity, userId);
                
                if (result.success) {
                    return successResponse(res, 'Stock updated successfully', result.data);
                }
                return errorResponse(res, 'Failed to update Stock', result.message);
            }
            default:
                res.setHeader('Allow', ['GET', 'PUT']);
                return errorResponse(res, `Method ${method} Not Allowed`, null, 405);
        }
    } catch (error) {
        console.error('API Error in Stock index route:', error);
        return errorResponse(res, 'Internal Server Error', error.message, 500);
    }
}
