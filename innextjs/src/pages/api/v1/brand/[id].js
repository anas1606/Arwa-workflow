import {
    getBrandById,
    updateBrand,
    deleteBrand
} from '@/services/brand/brand.service';
import { updateBrandSchema } from '@/services/brand/brand.validation';
import { successResponse, errorResponse } from '@/lib/response';

export default async function handler(req, res) {
    const { method } = req;
    const { id } = req.query;

    if (!id) {
        return errorResponse(res, 'ID is required', null, 400);
    }

    try {
        switch (method) {
            case 'GET': {
                const result = await getBrandById(id);
                if (result.success) return successResponse(res, 'Brand fetched successfully', result.data);
                return errorResponse(res, 'Failed to fetch Brand', result.message);
            }

            case 'PUT': {
                const validationResult = updateBrandSchema.safeParse({ id, ...req.body });
                if (!validationResult.success) {
                    const errorMessage = validationResult.error.errors.map(err => err.message).join(', ');
                    return errorResponse(res, 'Validation Error', errorMessage, 400);
                }

                const result = await updateBrand(id, validationResult.data);
                if (result.success) return successResponse(res, 'Brand updated successfully', result.data);
                return errorResponse(res, 'Failed to update Brand', result.message);
            }

            case 'DELETE': {
                const deletedBy = req.body.deletedBy || null;
                const result = await deleteBrand(id, deletedBy);
                if (result.success) return successResponse(res, 'Brand deleted successfully', result.data);
                return errorResponse(res, 'Failed to delete Brand', result.message);
            }

            default:
                res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
                return errorResponse(res, `Method ${method} Not Allowed`, null, 405);
        }
    } catch (error) {
        console.error(`API Error in Brand [id] route (${method}):`, error);
        return errorResponse(res, 'Internal Server Error', error.message, 500);
    }
}
