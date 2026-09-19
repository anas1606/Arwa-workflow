import { getPackagingById, updatePackaging, deletePackaging } from '@/services/packaging/packaging.service';
import { updatePackagingSchema } from '@/services/packaging/packaging.validation';
import { successResponse, errorResponse } from '@/lib/response';

export default async function handler(req, res) {
    const { method } = req;
    const { id } = req.query;

    if (!id) return errorResponse(res, 'Packaging ID is required', null, 400);

    try {
        switch (method) {
            case 'GET': {
                const result = await getPackagingById(id);
                if (result.success) return successResponse(res, 'Packaging fetched successfully', result.data);
                return errorResponse(res, 'Packaging not found', result.message, 404);
            }

            case 'PUT': {
                const validationResult = updatePackagingSchema.safeParse({ id, ...req.body });
                if (!validationResult.success) {
                    const errorMessage = validationResult.error.errors.map(err => err.message).join(', ');
                    return errorResponse(res, 'Validation Error', errorMessage, 400);
                }

                const userId = req.headers['x-user-id'];
                const result = await updatePackaging(validationResult.data, userId);
                if (result.success) return successResponse(res, 'Packaging updated successfully', result.data);
                return errorResponse(res, 'Failed to update Packaging', result.message);
            }

            case 'DELETE': {
                const deletedBy = req.headers['x-user-id'] || req.body?.deletedBy || null;
                const result = await deletePackaging(id, deletedBy);
                if (result.success) return successResponse(res, 'Packaging deleted successfully', result.data);
                return errorResponse(res, 'Failed to delete Packaging', result.message);
            }

            default:
                res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
                return errorResponse(res, `Method ${method} Not Allowed`, null, 405);
        }
    } catch (error) {
        console.error('API Error in Packaging [id] route:', error);
        return errorResponse(res, 'Internal Server Error', error.message, 500);
    }
}
