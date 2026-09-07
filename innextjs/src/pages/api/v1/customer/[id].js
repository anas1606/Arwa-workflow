import {
    getCustomerById,
    updateCustomer,
    deleteCustomer
} from '@/services/customer/customer.service';
import { updateCustomerSchema } from '@/services/customer/customer.validation';
import { successResponse, errorResponse } from '@/lib/response';

export default async function handler(req, res) {
    const { method } = req;
    const { id } = req.query;

    if (!id) {
        return errorResponse(res, 'ID is required', null, 400);
    }

    try {
        switch (method) {
            case 'GET': {
                const result = await getCustomerById(id);
                if (result.success) return successResponse(res, 'Customer fetched successfully', result.data);
                return errorResponse(res, 'Failed to fetch Customer', result.message);
            }

            case 'PUT': {
                const validationResult = updateCustomerSchema.safeParse({ id, ...req.body });
                if (!validationResult.success) {
                    const errorMessage = validationResult.error.errors.map(err => err.message).join(', ');
                    return errorResponse(res, 'Validation Error', errorMessage, 400);
                }

                const result = await updateCustomer(id, validationResult.data);
                if (result.success) return successResponse(res, 'Customer updated successfully', result.data);
                return errorResponse(res, 'Failed to update Customer', result.message);
            }

            case 'DELETE': {
                const deletedBy = req.body.deletedBy || null;
                const result = await deleteCustomer(id, deletedBy);
                if (result.success) return successResponse(res, 'Customer deleted successfully', result.data);
                return errorResponse(res, 'Failed to delete Customer', result.message);
            }

            default:
                res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
                return errorResponse(res, `Method ${method} Not Allowed`, null, 405);
        }
    } catch (error) {
        console.error(`API Error in Customer [id] route (${method}):`, error);
        return errorResponse(res, 'Internal Server Error', error.message, 500);
    }
}
