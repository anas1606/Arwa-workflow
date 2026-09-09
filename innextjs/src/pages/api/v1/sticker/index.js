import {
    createSticker,
    getAllStickers
} from '@/services/sticker/sticker.service';
import { createStickerSchema } from '@/services/sticker/sticker.validation';
import { successResponse, errorResponse } from '@/lib/response';

export default async function handler(req, res) {
    const { method } = req;

    try {
        switch (method) {
            case 'GET': {
                const { page = 1, limit = 10, search = '', brandId = '' } = req.query;
                const result = await getAllStickers(page, limit, search, brandId);
                if (result.success) return successResponse(res, 'Stickers fetched successfully', result.data);
                return errorResponse(res, 'Failed to fetch Stickers', result.message);
            }

            case 'POST': {
                const validationResult = createStickerSchema.safeParse(req.body);
                if (!validationResult.success) {
                    const errorMessage = validationResult.error.errors.map(err => err.message).join(', ');
                    return errorResponse(res, 'Validation Error', errorMessage, 400);
                }

                const result = await createSticker(validationResult.data);
                if (result.success) return successResponse(res, 'Sticker created successfully', result.data, null, 201);
                return errorResponse(res, 'Failed to create Sticker', result.message);
            }

            default:
                res.setHeader('Allow', ['GET', 'POST']);
                return errorResponse(res, `Method ${method} Not Allowed`, null, 405);
        }
    } catch (error) {
        console.error('API Error in Sticker index route:', error);
        return errorResponse(res, 'Internal Server Error', error.message, 500);
    }
}
