import { successResponse, errorResponse } from '@/lib/response';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return errorResponse(res, `Method ${req.method} Not Allowed`, null, 405);
  }

  try {
   
    return successResponse(res, 'Logout successful', null);
  } catch (error) {
    console.error('API Error in logout route:', error);
    return errorResponse(res, 'Internal Server Error', error.message, 500);
  }
}
