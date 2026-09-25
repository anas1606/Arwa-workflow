import {
    createBom,
    getAllBoms
} from '@/services/bom/bom.service';
import { createBomSchema } from '@/services/bom/bom.validation';
import { successResponse, errorResponse } from '@/lib/response';

export default async function handler(req, res) {
    const { method } = req;

    try {
        switch (method) {
            case 'GET': {
                const { page = 1, limit = 10, search = '' } = req.query;
                const result = await getAllBoms(page, limit, search);
                if (result.success) return successResponse(res, 'BOMs fetched successfully', result.data);
                return errorResponse(res, 'Failed to fetch BOMs', result.message);
            }

            case 'POST': {
                const validationResult = createBomSchema.safeParse(req.body);
                if (!validationResult.success) {
                    const errors = validationResult.error?.errors || validationResult.error?.issues || [];
                    const errorMessage = errors.map(err => err.message).join(', ');
                    return errorResponse(res, 'Validation Error', errorMessage, 400);
                }

                const userId = req.headers['x-user-id'];
                const result = await createBom(validationResult.data, userId);
                if (result.success) return successResponse(res, 'BOM created successfully', result.data, null, 201);
                return errorResponse(res, 'Failed to create BOM', result.message);
            }

            default:
                res.setHeader('Allow', ['GET', 'POST']);
                return errorResponse(res, `Method ${method} Not Allowed`, null, 405);
        }
    } catch (error) {
        console.error('API Error in BOM index route:', error);
        return errorResponse(res, 'Internal Server Error', error.message, 500);
    }
}
