import { createPackaging, getAllPackagings } from '@/services/packaging/packaging.service';
import { createPackagingSchema } from '@/services/packaging/packaging.validation';
import { successResponse, errorResponse } from '@/lib/response';

export default async function handler(req, res) {
    const { method } = req;

    try {
        switch (method) {
            case 'GET': {
                const { page = 1, limit = 10, search = '', customerId = 'ALL', minimal = 'false' } = req.query;
                const result = await getAllPackagings(page, limit, search, customerId, minimal === 'true');
                if (result.success) return successResponse(res, 'Packagings fetched successfully', result.data);
                return errorResponse(res, 'Failed to fetch Packagings', result.message);
            }

            case 'POST': {
                const validationResult = createPackagingSchema.safeParse(req.body);
                if (!validationResult.success) {
                    const errorMessage = validationResult.error.errors.map(err => err.message).join(', ');
                    return errorResponse(res, 'Validation Error', errorMessage, 400);
                }

                const userId = req.headers['x-user-id'];
                const result = await createPackaging(validationResult.data, userId);
                if (result.success) return successResponse(res, 'Packaging created successfully', result.data, null, 201);
                return errorResponse(res, 'Failed to create Packaging', result.message);
            }

            default:
                res.setHeader('Allow', ['GET', 'POST']);
                return errorResponse(res, `Method ${method} Not Allowed`, null, 405);
        }
    } catch (error) {
        console.error('API Error in Packaging index route:', error);
        return errorResponse(res, 'Internal Server Error', error.message, 500);
    }
}
