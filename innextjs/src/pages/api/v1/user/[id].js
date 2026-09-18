import { getUserById, updateUser, deleteUser } from '@/services/user/user.service';
import { updateUserSchema } from '@/services/user/user.validation';
import { successResponse, errorResponse } from '@/lib/response';

export default async function handler(req, res) {
    const { method } = req;
    const { id } = req.query;

    if (!id) {
        return errorResponse(res, 'User ID is required', null, 400);
    }

    try {
        switch (method) {
            case 'GET': {
                const result = await getUserById(id);
                if (result.success) return successResponse(res, 'User fetched successfully', result.data);
                return errorResponse(res, 'Failed to fetch User', result.message, 404);
            }

            case 'PUT': {
                const validationResult = updateUserSchema.safeParse({ ...req.body, id });
                if (!validationResult.success) {
                    const errors = validationResult.error?.errors || validationResult.error?.issues || [];
                    const errorMessage = errors.map(err => err.message).join(', ');
                    return errorResponse(res, 'Validation Error', errorMessage, 400);
                }

                const userId = req.headers['x-user-id'];
                const result = await updateUser(id, validationResult.data, userId);
                if (result.success) return successResponse(res, 'User updated successfully', result.data);
                return errorResponse(res, 'Failed to update User', result.message);
            }

            case 'DELETE': {
                const deletedBy = req.headers['x-user-id'] || null;
                const result = await deleteUser(id, deletedBy);
                if (result.success) return successResponse(res, 'User deleted successfully', null);
                return errorResponse(res, 'Failed to delete User', result.message);
            }

            default:
                res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
                return errorResponse(res, `Method ${method} Not Allowed`, null, 405);
        }
    } catch (error) {
        console.error(`API Error in User [id] route for method ${method}:`, error);
        return errorResponse(res, 'Internal Server Error', error.message, 500);
    }
}
