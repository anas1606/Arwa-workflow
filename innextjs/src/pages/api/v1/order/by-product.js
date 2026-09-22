import { getOrdersByProduct } from '@/services/order/order.service';
import { successResponse, errorResponse } from '@/lib/response';

export default async function handler(req, res) {
    const { method } = req;

    try {
        if (method === 'GET') {
            const { page = 1, limit = 10, search = '' } = req.query;
            const extractValue = (key) => req.query[key] || req.query[`${key}[]`];
            const extractJson = (key) => {
                const val = extractValue(key);
                if (!val) return undefined;
                try { return JSON.parse(val); } catch (e) { return undefined; }
            };

            const filters = {
                orderType: extractValue('orderType'),
                priority: extractValue('priority'),
                status: extractValue('status'),
                customerId: extractValue('customerId'),
                productId: extractValue('productId'),
                orderNumber: extractValue('orderNumber'),
                orderDate: extractJson('orderDate'),
                dueDate: extractJson('dueDate'),
                quantity: extractJson('quantity')
            };

            const result = await getOrdersByProduct(page, limit, search, filters);
            if (result.success) return successResponse(res, 'Orders grouped by product fetched successfully', result.data);
            return errorResponse(res, 'Failed to fetch grouped Orders', result.message);
        } else {
            res.setHeader('Allow', ['GET']);
            return errorResponse(res, `Method ${method} Not Allowed`, null, 405);
        }
    } catch (error) {
        console.error('API Error in Order by-product route:', error);
        return errorResponse(res, 'Internal Server Error', error.message, 500);
    }
}
