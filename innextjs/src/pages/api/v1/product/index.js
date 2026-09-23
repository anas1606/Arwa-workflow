import {
    createProduct,
    getAllProducts
} from '@/services/product/product.service';
import { createProductSchema } from '@/services/product/product.validation';
import { successResponse, errorResponse } from '@/lib/response';

export default async function handler(req, res) {
    const { method } = req;

    try {
        switch (method) {
            case 'GET': {
                const { page = 1, limit = 10, search = '', status = 'ALL', categoryId = 'ALL', stock = 'ALL', unitId = 'ALL', minimal = 'false' } = req.query;
                const result = await getAllProducts(page, limit, search, status, categoryId, stock, unitId, minimal === 'true');
                if (result.success) return successResponse(res, 'Products fetched successfully', result.data);
                return errorResponse(res, 'Failed to fetch Products', result.message);
            }

            case 'POST': {
                const validationResult = createProductSchema.safeParse(req.body);
                if (!validationResult.success) {
                    const errors = validationResult.error?.errors || validationResult.error?.issues || [];
                    const errorMessage = errors.map(err => err.message).join(', ');
                    return errorResponse(res, 'Validation Error', errorMessage, 400);
                }

                // Inject createdBy from user context if available (assuming basic setup for now)
                const data = { ...validationResult.data };

                const userId = req.headers['x-user-id'];
                const result = await createProduct(validationResult.data, userId);
                if (result.success) return successResponse(res, 'Product created successfully', result.data, null, 201);
                return errorResponse(res, 'Failed to create Product', result.message);
            }

            default:
                res.setHeader('Allow', ['GET', 'POST']);
                return errorResponse(res, `Method ${method} Not Allowed`, null, 405);
        }
    } catch (error) {
        console.error('API Error in Product index route:', error);
        return errorResponse(res, 'Internal Server Error', error.message, 500);
    }
}
