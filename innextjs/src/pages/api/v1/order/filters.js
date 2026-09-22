import { getOrderFilters } from '@/services/order/order.service';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { type, search } = req.query;
    const response = await getOrderFilters(type, search);
    if (response.success) {
      return res.status(200).json(response);
    } else {
      return res.status(500).json(response);
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
