import { createUnit, getAllUnits } from '@/services/unit/unit.service';
import { createUnitSchema } from '@/services/unit/unit.validation';
import { successResponse, errorResponse } from '@/lib/response';

export default async function handler(req, res) {
    const { method } = req;

    try {
        switch (method) {
            case 'GET': {
                const { page = 1, limit = 10, search = '', status = 'ALL' } = req.query;
                const result = await getAllUnits(page, limit, search, status);
                if (result.success) return successResponse(res, 'Units fetched successfully', result.data);
                return errorResponse(res, 'Failed to fetch Units', result.message);
            }

            case 'POST': {
                const validationResult = createUnitSchema.safeParse(req.body);
                if (!validationResult.success) {
                    const errorMessage = validationResult.error.errors.map(err => err.message).join(', ');
                    return errorResponse(res, 'Validation Error', errorMessage, 400);
                }

                const result = await createUnit(validationResult.data);
                if (result.success) return successResponse(res, 'Unit created successfully', result.data, null, 201);
                return errorResponse(res, 'Failed to create Unit', result.message);
            }

            default:
                res.setHeader('Allow', ['GET', 'POST']);
                return errorResponse(res, `Method ${method} Not Allowed`, null, 405);
        }
    } catch (error) {
        console.error('API Error in Unit index route:', error);
        return errorResponse(res, 'Internal Server Error', error.message, 500);
    }
}
