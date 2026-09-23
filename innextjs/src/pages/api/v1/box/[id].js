import { getBoxById, updateBox, deleteBox } from '@/services/box/box.service';
import { updateBoxSchema } from '@/services/box/box.validation';
import { successResponse, errorResponse } from '@/lib/response';

export default async function handler(req, res) {
    const { method } = req;
    const { id } = req.query;

    if (!id) {
        return errorResponse(res, 'Box ID is required', null, 400);
    }

    try {
        switch (method) {
            case 'GET': {
                const result = await getBoxById(id);
                if (result.success) return successResponse(res, 'Box fetched successfully', result.data);
                if (result.message === 'Box not found') return errorResponse(res, 'Box not found', null, 404);
                return errorResponse(res, 'Failed to fetch Box', result.message);
            }

            case 'PUT': {
                const validationResult = updateBoxSchema.safeParse(req.body);
                if (!validationResult.success) {
                    const errors = validationResult.error?.errors || validationResult.error?.issues || [];
                    const errorMessage = errors.map(err => err.message).join(', ');
                    return errorResponse(res, 'Validation Error', errorMessage, 400);
                }

                const userId = req.headers['x-user-id'];
                const result = await updateBox(id, validationResult.data, userId);
                if (result.success) return successResponse(res, 'Box updated successfully', result.data);
                if (result.message === 'Box not found') return errorResponse(res, 'Box not found', null, 404);
                return errorResponse(res, 'Failed to update Box', result.message);
            }

            case 'DELETE': {
                const userId = req.headers['x-user-id'];
                const result = await deleteBox(id, userId);
                if (result.success) return successResponse(res, 'Box deleted successfully', result.data);
                if (result.message === 'Box not found or has already been deleted') return errorResponse(res, result.message, null, 404);
                return errorResponse(res, 'Failed to delete Box', result.message);
            }

            default:
                res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
                return errorResponse(res, `Method ${method} Not Allowed`, null, 405);
        }
    } catch (error) {
        console.error('API Error in Box [id] route:', error);
        return errorResponse(res, 'Internal Server Error', error.message, 500);
    }
}
