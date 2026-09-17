import { getAllModules } from '@/services/module/module.service';
import { successResponse, errorResponse } from '@/lib/response';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return errorResponse(res, `Method ${req.method} Not Allowed`, null, 405);
    }

    try {
        const result = await getAllModules();
        if (result.success) return successResponse(res, 'Modules fetched successfully', result.data);
        return errorResponse(res, 'Failed to fetch Modules', result.message);
    } catch (error) {
        console.error('API Error in Module index route:', error);
        return errorResponse(res, 'Internal Server Error', error.message, 500);
    }
}
