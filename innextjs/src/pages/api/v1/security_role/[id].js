import { getSecurityRoleById, updateSecurityRole, deleteSecurityRole } from '@/services/security_role/security_role.service';
import { successResponse, errorResponse } from '@/lib/response';

export default async function handler(req, res) {
    const { method } = req;
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
        return errorResponse(res, 'Validation Error', 'Security Role ID is required', 400);
    }

    try {
        switch (method) {
            case 'GET': {
                const result = await getSecurityRoleById(id);
                if (result.success) return successResponse(res, 'Security Role fetched successfully', result.data);
                return errorResponse(res, 'Failed to fetch Security Role', result.message, 404);
            }

            case 'PUT':
            case 'PATCH': {
                const userId = req.headers['x-user-id'];
                const result = await updateSecurityRole(id, req.body, userId);
                if (result.success) return successResponse(res, 'Security Role updated successfully', result.data);
                return errorResponse(res, 'Failed to update Security Role', result.message);
            }

            case 'DELETE': {
                const deletedBy = req.headers['x-user-id'] || null;
                const result = await deleteSecurityRole(id, deletedBy);
                if (result.success) return successResponse(res, 'Security Role deleted successfully', null);
                return errorResponse(res, 'Failed to delete Security Role', result.message);
            }

            default:
                res.setHeader('Allow', ['GET', 'PUT', 'PATCH', 'DELETE']);
                return errorResponse(res, `Method ${method} Not Allowed`, null, 405);
        }
    } catch (error) {
        console.error(`API Error in Security Role [id] route (${method}):`, error);
        return errorResponse(res, 'Internal Server Error', error.message, 500);
    }
}
