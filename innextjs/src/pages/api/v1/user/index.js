import { getAllUsers, createUser } from '@/services/user/user.service';
import { createUserSchema } from '@/services/user/user.validation';
import { successResponse, errorResponse } from '@/lib/response';

export default async function handler(req, res) {
    const { method } = req;

    try {
        switch (method) {
            case 'GET': {
                const { page = 1, limit = 10, search = '', roleId = '' } = req.query;
                const result = await getAllUsers(Number(page), Number(limit), search, roleId);
                if (result.success) return successResponse(res, 'Users fetched successfully', result.data);
                return errorResponse(res, 'Failed to fetch Users', result.message);
            }

            case 'POST': {
                const validationResult = createUserSchema.safeParse(req.body);
                if (!validationResult.success) {
                    const errors = validationResult.error?.errors || validationResult.error?.issues || [];
                    const errorMessage = errors.map(err => err.message).join(', ');
                    return errorResponse(res, 'Validation Error', errorMessage, 400);
                }

                const userId = req.headers['x-user-id'];
                const result = await createUser(validationResult.data, userId);
                if (result.success) return successResponse(res, 'User created successfully', result.data, null, 201);
                return errorResponse(res, 'Failed to create User', result.message);
            }

            default:
                res.setHeader('Allow', ['GET', 'POST']);
                return errorResponse(res, `Method ${method} Not Allowed`, null, 405);
        }
    } catch (error) {
        console.error('API Error in User index route:', error);
        return errorResponse(res, 'Internal Server Error', error.message, 500);
    }
}
