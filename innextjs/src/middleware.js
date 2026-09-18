import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET;

// Map API routes to their corresponding module keys for permission checks
const moduleMap = {
    '/api/v1/category': 'categories',
    '/api/v1/product': 'products',
    '/api/v1/customer': 'customers',
    '/api/v1/unit': 'units',
    '/api/v1/brand': 'customisation',
    '/api/v1/sticker': 'customisation',
    '/api/v1/user': 'users',
    '/api/v1/production': 'production',
    '/api/v1/security_role': 'security_roles',
    '/api/v1/module': 'modules',
};

export async function middleware(req) {
    const { pathname } = req.nextUrl;

    // Allow auth endpoints (login, register) to bypass security
    if (pathname.startsWith('/api/v1/auth/')) {
        return NextResponse.next();
    }

    try {
        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ success: false, message: 'Unauthorized: Missing or invalid token' }, { status: 401 });
        }

        const token = authHeader.split(' ')[1];
        const secret = new TextEncoder().encode(JWT_SECRET);
        
        // jwtVerify throws an error if the signature is invalid or token is expired
        const { payload: decoded } = await jwtVerify(token, secret);

        const isSuperAdmin = decoded.role === 'super_admin';

        if (!isSuperAdmin) {
            // Find which module they are accessing
            let matchedModuleKey = null;
            for (const [route, moduleKey] of Object.entries(moduleMap)) {
                if (pathname.startsWith(route)) {
                    matchedModuleKey = moduleKey;
                    break;
                }
            }

            if (matchedModuleKey) {
                const permissions = decoded.security_role?.permissions || [];
                const modulePerms = permissions.find(p => p.module_key === matchedModuleKey);

                let requiredAction;
                switch (req.method) {
                    case 'POST': requiredAction = 'can_create'; break;
                    case 'PUT':
                    case 'PATCH': requiredAction = 'can_update'; break;
                    case 'DELETE': requiredAction = 'can_delete'; break;
                    case 'GET':
                    default: requiredAction = 'can_read'; break;
                }

                if (!modulePerms || !modulePerms[requiredAction]) {
                    return NextResponse.json(
                        { success: false, message: `Forbidden: You do not have ${requiredAction} permission for ${matchedModuleKey}` }, 
                        { status: 403 }
                    );
                }
            }
        }

        return NextResponse.next();
    } catch (error) {
        console.error('Middleware Error:', error);
        return NextResponse.json({ success: false, message: 'Unauthorized: Invalid token signature' }, { status: 401 });
    }
}

export const config = {
  matcher: '/api/v1/:path*',
};
