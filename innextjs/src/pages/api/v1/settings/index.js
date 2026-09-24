import { getSettingsList, createSetting } from '@/services/settings/settings.service';

export default async function handler(req, res) {
    if (req.method === 'GET') {
        const { page = 1, limit = 10, search = '' } = req.query;
        const response = await getSettingsList(Number(page), Number(limit), search);
        if (response.success) {
            return res.status(200).json(response);
        } else {
            return res.status(500).json(response);
        }
    } else if (req.method === 'POST') {
        const { key, value } = req.body;
        const userId = req.headers['x-user-id'] || null;

        if (!key || !value) {
            return res.status(400).json({ success: false, message: 'Key and Value are required' });
        }

        const response = await createSetting(key, value, userId);
        if (response.success) {
            return res.status(201).json(response);
        } else {
            return res.status(400).json(response);
        }
    } else {
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
