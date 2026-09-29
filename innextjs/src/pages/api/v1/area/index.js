import { createArea, getAllAreas } from '@/services/area/area.service';
import { createAreaSchema } from '@/services/area/area.validation';
import { successResponse, errorResponse } from '@/lib/response';

export default async function handler(req, res) {
    const { method } = req;

    try {
        switch (method) {
            case 'GET': {
                const { page = 1, limit = 10, search = '' } = req.query;
                const result = await getAllAreas(page, limit, search);
                if (result.success) return successResponse(res, 'Areas fetched successfully', result.data);
                return errorResponse(res, 'Failed to fetch Areas', result.message);
            }

            case 'POST': {
                const validationResult = createAreaSchema.safeParse(req.body);
                if (!validationResult.success) {
                    const errors = validationResult.error?.errors || validationResult.error?.issues || [];
                    const errorMessage = errors.map(err => err.message).join(', ');
                    return errorResponse(res, 'Validation Error', errorMessage, 400);
                }

                const userId = req.headers['x-user-id']; // Example logic, adapt based on auth system
                const result = await createArea(validationResult.data, userId);
                if (result.success) return successResponse(res, 'Area created successfully', result.data, null, 201);
                return errorResponse(res, 'Failed to create Area', result.message);
            }

            default:
                res.setHeader('Allow', ['GET', 'POST']);
                return errorResponse(res, `Method ${method} Not Allowed`, null, 405);
        }
    } catch (error) {
        console.error('API Error in Area index route:', error);
        return errorResponse(res, 'Internal Server Error', error.message, 500);
    }
}
