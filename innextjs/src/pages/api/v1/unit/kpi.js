import { getUnitKpis } from '@/services/unit/unit.service';
import { successResponse, errorResponse } from '@/lib/response';

export default async function handler(req, res) {
    if (req.method === 'GET') {
        try {
            const result = await getUnitKpis();
            if (result.success) return successResponse(res, 'Unit KPIs fetched successfully', result.data);
            return errorResponse(res, 'Failed to fetch Unit KPIs', result.message);
        } catch (error) {
            console.error('API Error in Unit KPIs route:', error);
            return errorResponse(res, 'Internal Server Error', error.message, 500);
        }
    } else {
        res.setHeader('Allow', ['GET']);
        return errorResponse(res, `Method ${req.method} Not Allowed`, null, 405);
    }
}
