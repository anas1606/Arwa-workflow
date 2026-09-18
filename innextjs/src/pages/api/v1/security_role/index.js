import { getAllSecurityRoles, createSecurityRole } from '@/services/security_role/security_role.service';
import { successResponse, errorResponse } from '@/lib/response';

export default async function handler(req, res) {
    const { method } = req;

    try {
        switch (method) {
            case 'GET': {
                const { page = 1, limit = 10, search = '' } = req.query;
                const result = await getAllSecurityRoles(Number(page), Number(limit), search);
                if (result.success) return successResponse(res, 'Roles fetched successfully', result.data);
                return errorResponse(res, 'Failed to fetch Roles', result.message);
            }

            case 'POST': {
                const userId = req.headers['x-user-id'];
                const result = await createSecurityRole(req.body, userId);
                if (result.success) return successResponse(res, 'Role created successfully', result.data, null, 201);
                return errorResponse(res, 'Failed to create Role', result.message);
            }

            default:
                res.setHeader('Allow', ['GET', 'POST']);
                return errorResponse(res, `Method ${method} Not Allowed`, null, 405);
        }
    } catch (error) {
        console.error('API Error in Security Role index route:', error);
        return errorResponse(res, 'Internal Server Error', error.message, 500);
    }
}
