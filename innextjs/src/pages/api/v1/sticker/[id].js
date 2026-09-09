import {
    getStickerById,
    updateSticker,
    deleteSticker
} from '@/services/sticker/sticker.service';
import { updateStickerSchema } from '@/services/sticker/sticker.validation';
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
                const result = await getStickerById(id);
                if (result.success) return successResponse(res, 'Sticker fetched successfully', result.data);
                return errorResponse(res, 'Failed to fetch Sticker', result.message);
            }

            case 'PUT': {
                const validationResult = updateStickerSchema.safeParse({ id, ...req.body });
                if (!validationResult.success) {
                    const errorMessage = validationResult.error.errors.map(err => err.message).join(', ');
                    return errorResponse(res, 'Validation Error', errorMessage, 400);
                }

                const result = await updateSticker(id, validationResult.data);
                if (result.success) return successResponse(res, 'Sticker updated successfully', result.data);
                return errorResponse(res, 'Failed to update Sticker', result.message);
            }

            case 'DELETE': {
                const deletedBy = req.body.deletedBy || null;
                const result = await deleteSticker(id, deletedBy);
                if (result.success) return successResponse(res, 'Sticker deleted successfully', result.data);
                return errorResponse(res, 'Failed to delete Sticker', result.message);
            }

            default:
                res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
                return errorResponse(res, `Method ${method} Not Allowed`, null, 405);
        }
    } catch (error) {
        console.error(`API Error in Sticker [id] route (${method}):`, error);
        return errorResponse(res, 'Internal Server Error', error.message, 500);
    }
}
