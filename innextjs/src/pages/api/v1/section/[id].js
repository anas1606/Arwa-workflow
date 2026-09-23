import { getSectionById, updateSection, deleteSection } from '@/services/section/section.service';
import { updateSectionSchema } from '@/services/section/section.validation';
import { successResponse, errorResponse } from '@/lib/response';

export default async function handler(req, res) {
    const { method } = req;
    const { id } = req.query;

    if (!id) {
        return errorResponse(res, 'Section ID is required', null, 400);
    }

    try {
        switch (method) {
            case 'GET': {
                const result = await getSectionById(id);
                if (result.success) return successResponse(res, 'Section fetched successfully', result.data);
                if (result.message === 'Section not found') return errorResponse(res, 'Section not found', null, 404);
                return errorResponse(res, 'Failed to fetch Section', result.message);
            }

            case 'PUT': {
                const validationResult = updateSectionSchema.safeParse(req.body);
                if (!validationResult.success) {
                    const errors = validationResult.error?.errors || validationResult.error?.issues || [];
                    const errorMessage = errors.map(err => err.message).join(', ');
                    return errorResponse(res, 'Validation Error', errorMessage, 400);
                }

                const userId = req.headers['x-user-id'];
                const result = await updateSection(id, validationResult.data, userId);
                if (result.success) return successResponse(res, 'Section updated successfully', result.data);
                if (result.message === 'Section not found' || result.message === 'Target Box does not exist') return errorResponse(res, result.message, null, 404);
                return errorResponse(res, 'Failed to update Section', result.message);
            }

            case 'DELETE': {
                const userId = req.headers['x-user-id'];
                const result = await deleteSection(id, userId);
                if (result.success) return successResponse(res, 'Section deleted successfully', result.data);
                if (result.message === 'Section not found or has already been deleted') return errorResponse(res, result.message, null, 404);
                return errorResponse(res, 'Failed to delete Section', result.message);
            }

            default:
                res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
                return errorResponse(res, `Method ${method} Not Allowed`, null, 405);
        }
    } catch (error) {
        console.error('API Error in Section [id] route:', error);
        return errorResponse(res, 'Internal Server Error', error.message, 500);
    }
}
