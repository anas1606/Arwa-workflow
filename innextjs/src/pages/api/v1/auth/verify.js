import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET;
import prisma from '@/lib/prisma';


export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'Missing token' });
        }

        const token = authHeader.split(' ')[1];
        const secret = new TextEncoder().encode(JWT_SECRET);
        
        // This validates the signature and expiration
        const { payload: decoded } = await jwtVerify(token, secret);

        // Check if user is still active in database
        const user = await prisma.user.findUnique({
            where: { id: decoded.id }
        });

        if (!user || !user.isActive || user.is_deleted) {
            return res.status(401).json({ success: false, message: 'User is inactive or deleted' });
        }

        return res.status(200).json({ success: true, message: 'Token is valid' });
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }
}
