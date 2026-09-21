import { getCustomisationKpis } from '@/services/customisation/customisation.service';
import { successResponse, errorResponse } from '@/lib/response';

export default async function handler(req, res) {
    const { method } = req;

    if (method === 'GET') {
        try {
            const result = await getCustomisationKpis();
            if (result.success) {
                return successResponse(res, 'Customisation KPIs fetched successfully', result.data);
            }
            return errorResponse(res, 'Failed to fetch Customisation KPIs', result.message);
        } catch (error) {
            console.error('API Error in Customisation KPI route:', error);
            return errorResponse(res, 'Internal Server Error', error.message, 500);
        }
    }

    res.setHeader('Allow', ['GET']);
    return errorResponse(res, `Method ${method} Not Allowed`, null, 405);
}
