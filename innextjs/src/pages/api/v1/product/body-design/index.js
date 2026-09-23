import { getBodyDesigns } from "@/services/product/bodyDesign.service";
import { errorResponse, successResponse } from "@/lib/response";

export default async function handler(req, res) {
    switch (req.method) {
        case 'GET': {
            try {
                const { page = 1, limit = 10, search = '', productId = 'ALL', minimal = 'false' } = req.query;
                const result = await getBodyDesigns(page, limit, search, productId, minimal === 'true');
                if (result.success) return successResponse(res, "Body designs fetched successfully", result.data, result.meta);
                return errorResponse(res, result.error);
            } catch (error) {
                console.error("Error in GET body-design:", error);
                return errorResponse(res, "Internal server error");
            }
        }
        default:
            res.setHeader('Allow', ['GET']);
            return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
