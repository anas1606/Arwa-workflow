import { getColours } from "@/services/product/colour.service";
import { errorResponse, successResponse } from "@/lib/response";

export default async function handler(req, res) {
    switch (req.method) {
        case 'GET': {
            try {
                const { page = 1, limit = 10, search = '', productId = 'ALL', minimal = 'false' } = req.query;
                const result = await getColours(page, limit, search, productId, minimal === 'true');
                if (result.success) return successResponse(res, "Colours fetched successfully", result.data, result.meta);
                return errorResponse(res, result.error);
            } catch (error) {
                console.error("Error in GET colour:", error);
                return errorResponse(res, "Internal server error");
            }
        }
        default:
            res.setHeader('Allow', ['GET']);
            return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
