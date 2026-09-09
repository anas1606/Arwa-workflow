import {
    createCategory,
    getAllCategories
} from '@/services/category/category.service';
import { createCategorySchema } from '@/services/category/category.validation';
import { successResponse, errorResponse } from '@/lib/response';

export default async function handler(req, res) {
    const { method } = req;

    try {
        switch (method) {
            case 'GET': {
                const { page = 1, limit = 10, search = '', status = 'ALL' } = req.query;
                const result = await getAllCategories(page, limit, search, status);
                if (result.success) return successResponse(res, 'Categories fetched successfully', result.data);
                return errorResponse(res, 'Failed to fetch Categories', result.message);
            }

            case 'POST': {
                const validationResult = createCategorySchema.safeParse(req.body);
                if (!validationResult.success) {
                    const errors = validationResult.error?.errors || validationResult.error?.issues || [];
                    const errorMessage = errors.map(err => err.message).join(', ');
                    return errorResponse(res, 'Validation Error', errorMessage, 400);
                }

                const result = await createCategory(validationResult.data);
                if (result.success) return successResponse(res, 'Category created successfully', result.data, null, 201);
                return errorResponse(res, 'Failed to create Category', result.message);
            }

            default:
                res.setHeader('Allow', ['GET', 'POST']);
                return errorResponse(res, `Method ${method} Not Allowed`, null, 405);
        }
    } catch (error) {
        console.error('API Error in Category index route:', error);
        return errorResponse(res, 'Internal Server Error', error.message, 500);
    }
}
