import { getStickersByBrandId } from '@/services/sticker/sticker.service';

export default async function handler(req, res) {
    if (req.method === 'GET') {
        const { brandId } = req.query;
        if (!brandId) return res.status(400).json({ success: false, message: 'brandId is required' });
        
        const response = await getStickersByBrandId(brandId);
        if (response.success) {
            return res.status(200).json(response);
        } else {
            return res.status(400).json(response);
        }
    } else {
        res.setHeader('Allow', ['GET']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
