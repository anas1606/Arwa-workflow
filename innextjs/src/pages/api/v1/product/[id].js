import {
    updateProduct,
    getProductById,
    deleteProduct
} from '@/services/product/product.service';
import { updateProductSchema } from '@/services/product/product.validation';
import { successResponse, errorResponse } from '@/lib/response';

export default async function handler(req, res) {
    const { method, query: { id } } = req;

    if (!id) {
        return errorResponse(res, 'Product ID is required', null, 400);
    }

    try {
        switch (method) {
            case 'GET': {
                const result = await getProductById(id);
                if (result.success) return successResponse(res, 'Product fetched successfully', result.data);
                return errorResponse(res, 'Failed to fetch Product', result.message);
            }

            case 'PUT': {
                const validationResult = updateProductSchema.safeParse({ id, ...req.body });
                if (!validationResult.success) {
                    const errors = validationResult.error?.errors || validationResult.error?.issues || [];
                    const errorMessage = errors.map(err => err.message).join(', ');
                    return errorResponse(res, 'Validation Error', errorMessage, 400);
                }

                const userId = req.headers['x-user-id'];
                const result = await updateProduct(id, validationResult.data, userId);
                if (result.success) return successResponse(res, 'Product updated successfully', result.data);
                return errorResponse(res, 'Failed to update Product', result.message);
            }

            case 'DELETE': {
                const deletedBy = req.headers['x-user-id'] || null;
                const result = await deleteProduct(id, deletedBy);
                if (result.success) return successResponse(res, 'Product deleted successfully', result.data);
                return errorResponse(res, 'Failed to delete Product', result.message);
            }

            default:
                res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
                return errorResponse(res, `Method ${method} Not Allowed`, null, 405);
        }
    } catch (error) {
        console.error('API Error in Product [id] route:', error);
        return errorResponse(res, 'Internal Server Error', error.message, 500);
    }
}
