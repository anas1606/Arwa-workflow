import {
    getOrderById,
    updateOrder,
    deleteOrder
} from '@/services/order/order.service';
import { updateOrderSchema } from '@/services/order/order.validation';
import { successResponse, errorResponse } from '@/lib/response';

export default async function handler(req, res) {
    const { method } = req;
    const { id } = req.query;

    if (!id) {
        return errorResponse(res, 'Validation Error', 'Order ID is required', 400);
    }

    try {
        switch (method) {
            case 'GET': {
                const result = await getOrderById(id);
                if (result.success && result.data) return successResponse(res, 'Order fetched successfully', result.data);
                if (result.success && !result.data) return errorResponse(res, 'Not Found', 'Order not found', 404);
                return errorResponse(res, 'Failed to fetch Order', result.message);
            }

            case 'PUT': {
                const validationResult = updateOrderSchema.safeParse({ id, ...req.body });
                if (!validationResult.success) {
                    const errorMessage = validationResult.error.issues.map(err => err.message).join(', ');
                    return errorResponse(res, 'Validation Error', errorMessage, 400);
                }

                const userId = req.headers['x-user-id'] || null;
                const result = await updateOrder(id, validationResult.data, userId);
                if (result.success) return successResponse(res, 'Order updated successfully', result.data);
                return errorResponse(res, 'Failed to update Order', result.message);
            }

            case 'DELETE': {
                const userId = req.headers['x-user-id'] || null;
                const result = await deleteOrder(id, userId);
                if (result.success) return successResponse(res, 'Order deleted successfully', result.data);
                return errorResponse(res, 'Failed to delete Order', result.message);
            }

            default:
                res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
                return errorResponse(res, `Method ${method} Not Allowed`, null, 405);
        }
    } catch (error) {
        console.error('API Error in Order [id] route:', error);
        return errorResponse(res, 'Internal Server Error', error.message, 500);
    }
}
