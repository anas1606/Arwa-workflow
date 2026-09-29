import { getAreaById, updateArea, deleteArea } from '@/services/area/area.service';
import { updateAreaSchema } from '@/services/area/area.validation';
import { successResponse, errorResponse } from '@/lib/response';

export default async function handler(req, res) {
    const { method } = req;
    const { id } = req.query;

    if (!id) {
        return errorResponse(res, 'Area ID is required', null, 400);
    }

    try {
        switch (method) {
            case 'GET': {
                const result = await getAreaById(id);
                if (result.success) return successResponse(res, 'Area fetched successfully', result.data);
                if (result.message === 'Area not found') return errorResponse(res, 'Area not found', null, 404);
                return errorResponse(res, 'Failed to fetch Area', result.message);
            }

            case 'PUT': {
                const validationResult = updateAreaSchema.safeParse(req.body);
                if (!validationResult.success) {
                    const errors = validationResult.error?.errors || validationResult.error?.issues || [];
                    const errorMessage = errors.map(err => err.message).join(', ');
                    return errorResponse(res, 'Validation Error', errorMessage, 400);
                }

                const userId = req.headers['x-user-id'];
                const result = await updateArea(id, validationResult.data, userId);
                if (result.success) return successResponse(res, 'Area updated successfully', result.data);
                if (result.message === 'Area not found') return errorResponse(res, 'Area not found', null, 404);
                return errorResponse(res, 'Failed to update Area', result.message);
            }

            case 'DELETE': {
                const userId = req.headers['x-user-id'];
                const result = await deleteArea(id, userId);
                if (result.success) return successResponse(res, 'Area deleted successfully', result.data);
                if (result.message === 'Area not found or has already been deleted') return errorResponse(res, result.message, null, 404);
                return errorResponse(res, 'Failed to delete Area', result.message);
            }

            default:
                res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
                return errorResponse(res, `Method ${method} Not Allowed`, null, 405);
        }
    } catch (error) {
        console.error('API Error in Area [id] route:', error);
        return errorResponse(res, 'Internal Server Error', error.message, 500);
    }
}
