import { getStockCategories } from '@/services/stock/stock.service';
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
            default:
                res.setHeader('Allow', ['GET']);
                return errorResponse(res, `Method ${method} Not Allowed`, null, 405);
        }
    } catch (error) {
        console.error('API Error in Stock index route:', error);
        return errorResponse(res, 'Internal Server Error', error.message, 500);
    }
}
