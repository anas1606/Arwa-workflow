import {
    updateCategory,
    deleteCategory,
    getCategoryById
} from '@/services/category/category.service';
import { updateCategorySchema } from '@/services/category/category.validation';
import { successResponse, errorResponse } from '@/lib/response';

export default async function handler(req, res) {
    const { method } = req;
    const { id } = req.query;

    if (!id) {
        return errorResponse(res, 'Category ID is required', null, 400);
    }

    try {
        switch (method) {
            case 'GET': {
                const result = await getCategoryById(id);
                if (result.success) {
                    if (!result.data) {
                        return errorResponse(res, 'Category not found', null, 404);
                    }
                    return successResponse(res, 'Category fetched successfully', result.data);
                }
                return errorResponse(res, 'Failed to fetch Category', result.message);
            }

            case 'PUT': {
                const payload = { id, ...req.body };
                const validationResult = updateCategorySchema.safeParse(payload);
                if (!validationResult.success) {
                    const errors = validationResult.error?.errors || validationResult.error?.issues || [];
                    const errorMessage = errors.map(err => err.message).join(', ');
                    return errorResponse(res, 'Validation Error', errorMessage, 400);
                }

                const result = await updateCategory(id, validationResult.data);
                if (result.success) return successResponse(res, 'Category updated successfully', result.data);
                return errorResponse(res, 'Failed to update Category', result.message);
            }

            case 'DELETE': {
                const result = await deleteCategory(id);
                if (result.success) return successResponse(res, 'Category deleted successfully', null);
                return errorResponse(res, 'Failed to delete Category', result.message);
            }

            default:
                res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
                return errorResponse(res, `Method ${method} Not Allowed`, null, 405);
        }
    } catch (error) {
        console.error(`API Error in Category [id] route for method ${method}:`, error);
        return errorResponse(res, 'Internal Server Error', error.message, 500);
    }
}
