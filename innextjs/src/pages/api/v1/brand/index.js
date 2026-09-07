import {
    createBrand,
    getAllBrands
} from '@/services/brand/brand.service';
import { createBrandSchema } from '@/services/brand/brand.validation';
import { successResponse, errorResponse } from '@/lib/response';

export default async function handler(req, res) {
    const { method } = req;

    try {
        switch (method) {
            case 'GET': {
                const { page = 1, limit = 10, search = '', customerId = '' } = req.query;
                const result = await getAllBrands(page, limit, search, customerId);
                if (result.success) return successResponse(res, 'Brands fetched successfully', result.data);
                return errorResponse(res, 'Failed to fetch Brands', result.message);
            }

            case 'POST': {
                const validationResult = createBrandSchema.safeParse(req.body);
                if (!validationResult.success) {
                    const errorMessage = validationResult.error.errors.map(err => err.message).join(', ');
                    return errorResponse(res, 'Validation Error', errorMessage, 400);
                }

                const result = await createBrand(validationResult.data);
                if (result.success) return successResponse(res, 'Brand created successfully', result.data, null, 201);
                return errorResponse(res, 'Failed to create Brand', result.message);
            }

            default:
                res.setHeader('Allow', ['GET', 'POST']);
                return errorResponse(res, `Method ${method} Not Allowed`, null, 405);
        }
    } catch (error) {
        console.error('API Error in Brand index route:', error);
        return errorResponse(res, 'Internal Server Error', error.message, 500);
    }
}
