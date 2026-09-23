import { getBoxKpis } from '@/services/box/box.service';
import { successResponse, errorResponse } from '@/lib/response';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return errorResponse(res, 'Method not allowed', 'Only GET method is allowed', 405);
    }

    try {
        const result = await getBoxKpis();
        
        if (result.success) return successResponse(res, 'Box KPIs fetched successfully', result.data);
        return errorResponse(res, 'Failed to fetch Box KPIs', result.message);
    } catch (error) {
        console.error('KPIs error:', error);
        return errorResponse(res, 'Internal Server Error', error.message || 'Error fetching Box KPIs', 500);
    }
}
