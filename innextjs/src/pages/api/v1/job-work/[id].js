import {
    getJobWorkById,
    updateJobWork,
    deleteJobWork
} from '@/services/job-work/job-work.service';
import { updateJobWorkSchema } from '@/services/job-work/job-work.validation';
import { successResponse, errorResponse } from '@/lib/response';

export default async function handler(req, res) {
    const { method } = req;
    const { id } = req.query;

    if (!id) {
        return errorResponse(res, 'Job Work ID is required', null, 400);
    }

    try {
        switch (method) {
            case 'GET': {
                const result = await getJobWorkById(id);
                if (result.success) return successResponse(res, 'Job Work fetched successfully', result.data);
                return errorResponse(res, 'Failed to fetch Job Work', result.message, 404);
            }

            case 'PUT': {
                const validationResult = updateJobWorkSchema.safeParse(req.body);
                if (!validationResult.success) {
                    const errors = validationResult.error?.errors || validationResult.error?.issues || [];
                    const errorMessage = errors.map(err => err.message).join(', ');
                    return errorResponse(res, 'Validation Error', errorMessage, 400);
                }

                const userId = req.headers['x-user-id'];
                const result = await updateJobWork(id, validationResult.data, userId);
                if (result.success) return successResponse(res, 'Job Work updated successfully', result.data);
                return errorResponse(res, 'Failed to update Job Work', result.message);
            }

            case 'DELETE': {
                const userId = req.headers['x-user-id'];
                const result = await deleteJobWork(id, userId);
                if (result.success) return successResponse(res, 'Job Work deleted successfully', result.data);
                return errorResponse(res, 'Failed to delete Job Work', result.message);
            }

            default:
                res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
                return errorResponse(res, `Method ${method} Not Allowed`, null, 405);
        }
    } catch (error) {
        console.error('API Error in Job Work ID route:', error);
        return errorResponse(res, 'Internal Server Error', error.message, 500);
    }
}
