import { calculateRawMaterialPlanning } from '@/services/raw-material-planning/raw-material-planning.service';

export default async function handler(req, res) {
    if (req.method === 'POST') {
        const { products, isReserved, origin } = req.body;
        
        try {
            const result = await calculateRawMaterialPlanning({ products, isReserved, origin });
            
            if (result.success) {
                return res.status(200).json(result);
            } else {
                return res.status(400).json(result);
            }
        } catch (error) {
            console.error('API Error:', error);
            return res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
    } else {
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
