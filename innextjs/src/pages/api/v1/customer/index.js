import {
    createCustomer,
    getAllCustomers
} from '@/services/customer/customer.service';
import { createCustomerSchema } from '@/services/customer/customer.validation';
import { successResponse, errorResponse } from '@/lib/response';

export default async function handler(req, res) {
    const { method } = req;

    try {
        switch (method) {
            case 'GET': {
                const { page = 1, limit = 10, search = '', region = '' } = req.query;
                const result = await getAllCustomers(page, limit, search, region);
                if (result.success) return successResponse(res, 'Customers fetched successfully', result.data);
                return errorResponse(res, 'Failed to fetch Customers', result.message);
            }

            case 'POST': {
                const validationResult = createCustomerSchema.safeParse(req.body);
                if (!validationResult.success) {
                    const errorMessage = validationResult.error.errors.map(err => err.message).join(', ');
                    return errorResponse(res, 'Validation Error', errorMessage, 400);
                }

                const result = await createCustomer(validationResult.data);
                if (result.success) return successResponse(res, 'Customer created successfully', result.data, null, 201);
                return errorResponse(res, 'Failed to create Customer', result.message);
            }

            default:
                res.setHeader('Allow', ['GET', 'POST']);
                return errorResponse(res, `Method ${method} Not Allowed`, null, 405);
        }
    } catch (error) {
        console.error('API Error in Customer index route:', error);
        return errorResponse(res, 'Internal Server Error', error.message, 500);
    }
}
