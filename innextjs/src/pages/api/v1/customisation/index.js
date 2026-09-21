import { getAllCustomisations } from '@/services/customisation/customisation.service';
import { successResponse, errorResponse } from '@/lib/response';

export default async function handler(req, res) {
    const { method } = req;

    if (method === 'GET') {
        try {
            const { page = 1, limit = 10, search = '', category = 'ALL' } = req.query;
            const result = await getAllCustomisations(page, limit, search, category);
            if (result.success) return successResponse(res, 'Customisations fetched successfully', result.data);
            return errorResponse(res, 'Failed to fetch Customisations', result.message);
        } catch (error) {
            console.error('API Error in Customisation index route:', error);
            return errorResponse(res, 'Internal Server Error', error.message, 500);
        }
    }

    res.setHeader('Allow', ['GET']);
    return errorResponse(res, `Method ${method} Not Allowed`, null, 405);
}
