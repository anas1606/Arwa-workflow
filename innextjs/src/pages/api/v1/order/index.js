import {
    createOrder,
    getAllOrders
} from '@/services/order/order.service';
import { createOrderSchema } from '@/services/order/order.validation';
import { successResponse, errorResponse } from '@/lib/response';

export default async function handler(req, res) {
    const { method } = req;

    try {
        switch (method) {
            case 'GET': {
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
                const result = await getAllOrders(page, limit, search, filters);
                if (result.success) return successResponse(res, 'Orders fetched successfully', result.data);
                return errorResponse(res, 'Failed to fetch Orders', result.message);
            }

            case 'POST': {
                const validationResult = createOrderSchema.safeParse(req.body);
                if (!validationResult.success) {
                    const errorMessage = validationResult.error.issues.map(err => err.message).join(', ');
                    return errorResponse(res, 'Validation Error', errorMessage, 400);
                }

                const userId = req.headers['x-user-id'] || null;
                const result = await createOrder(validationResult.data, userId);
                if (result.success) return successResponse(res, 'Order created successfully', result.data, null, 201);
                return errorResponse(res, 'Failed to create Order', result.message);
            }

            default:
                res.setHeader('Allow', ['GET', 'POST']);
                return errorResponse(res, `Method ${method} Not Allowed`, null, 405);
        }
    } catch (error) {
        console.error('API Error in Order index route:', error);
        return errorResponse(res, 'Internal Server Error', error.message, 500);
    }
}
