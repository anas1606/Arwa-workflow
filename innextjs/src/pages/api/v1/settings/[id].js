import { getSettingById, updateSetting, deleteSetting } from '@/services/settings/settings.service';

export default async function handler(req, res) {
    const { id } = req.query;
    const userId = req.headers['x-user-id'] || null;

    if (req.method === 'GET') {
        const response = await getSettingById(id);
        if (response.success) {
            return res.status(200).json(response);
        } else {
            return res.status(404).json(response);
        }
    } else if (req.method === 'PUT') {
        const { key, value } = req.body;

        if (!key || !value) {
            return res.status(400).json({ success: false, message: 'Key and Value are required' });
        }

        const response = await updateSetting(id, key, value, userId);
        if (response.success) {
            return res.status(200).json(response);
        } else {
            return res.status(400).json(response);
        }
    } else if (req.method === 'DELETE') {
        const response = await deleteSetting(id, userId);
        if (response.success) {
            return res.status(200).json(response);
        } else {
            return res.status(400).json(response);
        }
    } else {
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
