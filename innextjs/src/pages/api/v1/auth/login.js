import { loginUser } from '@/services/auth/auth.service';
import { successResponse, errorResponse } from '@/lib/response';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return errorResponse(res, `Method ${req.method} Not Allowed`, null, 405);
  }

  try {
    const { identifier, password } = req.body;
    const result = await loginUser(identifier, password);

    if (result.success) {
      return successResponse(res, 'Login successful', result.data);
    } else {
      return errorResponse(res, result.message, null, 401);
    }
  } catch (error) {
    console.error('API Error in login route:', error);
    return errorResponse(res, 'Internal Server Error', error.message, 500);
  }
}

