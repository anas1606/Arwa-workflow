import { getTrayById, updateTray, deleteTray } from '@/services/tray/tray.service';
import { updateTraySchema } from '@/services/tray/tray.validation';
import { successResponse, errorResponse } from '@/lib/response';

export default async function handler(req, res) {
    const { method } = req;
    const { id } = req.query;

    if (!id) {
        return errorResponse(res, 'Tray ID is required', null, 400);
    }

    try {
        switch (method) {
            case 'GET': {
                const result = await getTrayById(id);
                if (result.success) return successResponse(res, 'Tray fetched successfully', result.data);
                if (result.message === 'Tray not found') return errorResponse(res, 'Tray not found', null, 404);
                return errorResponse(res, 'Failed to fetch Tray', result.message);
            }

            case 'PUT': {
                const validationResult = updateTraySchema.safeParse(req.body);
                if (!validationResult.success) {
                    const errors = validationResult.error?.errors || validationResult.error?.issues || [];
                    const errorMessage = errors.map(err => err.message).join(', ');
                    return errorResponse(res, 'Validation Error', errorMessage, 400);
                }

                const userId = req.headers['x-user-id'];
                const result = await updateTray(id, validationResult.data, userId);
                if (result.success) return successResponse(res, 'Tray updated successfully', result.data);
                if (result.message === 'Tray not found' || result.message === 'Target Section does not exist') return errorResponse(res, result.message, null, 404);
                return errorResponse(res, 'Failed to update Tray', result.message);
            }

            case 'DELETE': {
                const userId = req.headers['x-user-id'];
                const result = await deleteTray(id, userId);
                if (result.success) return successResponse(res, 'Tray deleted successfully', result.data);
                if (result.message === 'Tray not found or has already been deleted') return errorResponse(res, result.message, null, 404);
                return errorResponse(res, 'Failed to delete Tray', result.message);
            }

            default:
                res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
                return errorResponse(res, `Method ${method} Not Allowed`, null, 405);
        }
    } catch (error) {
        console.error('API Error in Tray [id] route:', error);
        return errorResponse(res, 'Internal Server Error', error.message, 500);
    }
}
