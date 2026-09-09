import { getBrandsByCustomerId } from '@/services/brand/brand.service';

export default async function handler(req, res) {
    if (req.method === 'GET') {
        const { customerId } = req.query;
        if (!customerId) return res.status(400).json({ success: false, message: 'customerId is required' });
        
        const response = await getBrandsByCustomerId(customerId);
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
