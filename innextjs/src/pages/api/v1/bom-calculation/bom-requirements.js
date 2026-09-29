import { getBomRequirements } from '@/services/production/production.service';
import { successResponse, errorResponse } from '@/lib/response';

export default async function handler(req, res) {
    const { method } = req;

    try {
        switch (method) {
            case 'GET': {
                const { productId, quantity, page = 1, limit = 10 } = req.query;

                if (!productId) {
                    return errorResponse(res, 'Validation Error', 'productId is required', 400);
                }

                if (!quantity) {
                    return errorResponse(res, 'Validation Error', 'quantity is required', 400);
                }

                const result = await getBomRequirements(productId, quantity, parseInt(page), parseInt(limit));

                if (result.success) {
                    return successResponse(res, 'BOM requirements fetched successfully', result.data);
                }
                
                // Use 404 for 'not found' specific errors
                if (result.message.includes('No BOM found')) {
                    return errorResponse(res, 'Not Found', result.message, 404);
                }

                return errorResponse(res, 'Failed to fetch BOM requirements', result.message);
            }

            default:
                res.setHeader('Allow', ['GET']);
                return errorResponse(res, `Method ${method} Not Allowed`, null, 405);
        }
    } catch (error) {
        console.error('API Error in Production BOM Requirements route:', error);
        return errorResponse(res, 'Internal Server Error', error.message, 500);
    }
}
