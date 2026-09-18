import { getSecurityRoleOptions } from '@/services/security_role/security_role.service';
import { successResponse, errorResponse } from '@/lib/response';

export default async function handler(req, res) {
    const { method } = req;

    try {
        if (method === 'GET') {
            const { search = '' } = req.query;
            const result = await getSecurityRoleOptions(search);
            if (result.success) return successResponse(res, 'Role options fetched successfully', result.data);
            return errorResponse(res, 'Failed to fetch Role options', result.message);
        } else {
            res.setHeader('Allow', ['GET']);
            return errorResponse(res, `Method ${method} Not Allowed`, null, 405);
        }
    } catch (error) {
        console.error('API Error in Security Role options route:', error);
        return errorResponse(res, 'Internal Server Error', error.message, 500);
    }
}
