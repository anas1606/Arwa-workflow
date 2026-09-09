import { getUnitById, updateUnit, deleteUnit } from '@/services/unit/unit.service';
import { updateUnitSchema } from '@/services/unit/unit.validation';
import { successResponse, errorResponse } from '@/lib/response';

export default async function handler(req, res) {
    const { method } = req;
    const { id } = req.query;

    if (!id) return errorResponse(res, 'Unit ID is required', null, 400);

    try {
        switch (method) {
            case 'GET': {
                const result = await getUnitById(id);
                if (result.success) return successResponse(res, 'Unit fetched successfully', result.data);
                return errorResponse(res, 'Unit not found', result.message, 404);
            }

            case 'PUT': {
                const validationResult = updateUnitSchema.safeParse({ id, ...req.body });
                if (!validationResult.success) {
                    const errorMessage = validationResult.error.errors.map(err => err.message).join(', ');
                    return errorResponse(res, 'Validation Error', errorMessage, 400);
                }

                const result = await updateUnit(validationResult.data);
                if (result.success) return successResponse(res, 'Unit updated successfully', result.data);
                return errorResponse(res, 'Failed to update Unit', result.message);
            }

            case 'DELETE': {
                const { deletedBy } = req.body;
                const result = await deleteUnit(id, deletedBy);
                if (result.success) return successResponse(res, 'Unit deleted successfully', result.data);
                return errorResponse(res, 'Failed to delete Unit', result.message);
            }

            default:
                res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
                return errorResponse(res, `Method ${method} Not Allowed`, null, 405);
        }
    } catch (error) {
        console.error('API Error in Unit [id] route:', error);
        return errorResponse(res, 'Internal Server Error', error.message, 500);
    }
}
