import { getCategoryKpis } from '@/services/category/category.service';
import { successResponse, errorResponse } from '@/lib/response';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return errorResponse(res, `Method ${req.method} Not Allowed`, null, 405);
    }

    try {
        const result = await getCategoryKpis();
        if (result.success) {
            return successResponse(res, 'Category KPIs fetched successfully', result.data);
        }
        return errorResponse(res, 'Failed to fetch Category KPIs', result.message);
    } catch (error) {
        console.error('API Error in Category KPI route:', error);
        return errorResponse(res, 'Internal Server Error', error.message, 500);
    }
}
