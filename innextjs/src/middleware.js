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
    '/api/v1/security_role': 'security_roles',
    '/api/v1/module': 'modules',
    '/api/v1/order': 'orders',
    '/api/v1/box': 'godown',
    '/api/v1/stock': 'stock',
    '/api/v1/bom': 'bom',
    '/api/v1/settings': 'settings',
    '/api/v1/job-work': 'job_work',
    '/api/v1/bom-calculation': 'bom_calculation',
    '/api/v1/raw-material-planning': 'raw_material_planning',
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

        // Check against the database by calling the verify endpoint
        const verifyUrl = new URL('/api/v1/auth/verify', req.url);
        const verifyRes = await fetch(verifyUrl.toString(), {
            headers: { authorization: authHeader }
        });

        if (!verifyRes.ok) {
            return NextResponse.json({ success: false, message: 'Unauthorized: User is inactive or deleted' }, { status: 401 });
        }

        const isSuperAdmin = decoded.isSuperAdmin === true || 
                             decoded.role === 'super_admin' || 
                             decoded.role === 'SUPER_ADMIN' ||
                             (decoded.role && decoded.role.toLowerCase().replace(/[^a-z0-9]/g, '') === 'superadmin');

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

                // Custom Business Rule: raw_material_planning POST is just a calculation (Read operation)
                if (req.method === 'POST' && matchedModuleKey === 'raw_material_planning') {
                    requiredAction = 'can_read';
                }

                let hasPermission = modulePerms && modulePerms[requiredAction];

                // Custom Business Rule: Grant BOM Calculation permissions if user has Job Work create permission
                if (!hasPermission && matchedModuleKey === 'bom_calculation') {
                    const jobWorkPerm = permissions.find(p => p.module_key === 'job_work');
                    if (jobWorkPerm && jobWorkPerm.can_create) {
                        hasPermission = true;
                    }
                }

                // --- OPEN READ EXCEPTION ---
                // Allow all authenticated users to perform GET requests (Open Read, Strict Write)
                if (req.method === 'GET') {
                    hasPermission = true;
                }

                if (!hasPermission) {
                    return NextResponse.json(
                        { success: false, message: `Forbidden: You do not have ${requiredAction} permission for ${matchedModuleKey}` }, 
                        { status: 403 }
                    );
                }
            }
        }

        const requestHeaders = new Headers(req.headers);
        requestHeaders.set('x-user-id', decoded.id);

        return NextResponse.next({
            request: {
                headers: requestHeaders,
            },
        });
    } catch (error) {
        console.error('Middleware Error:', error);
        return NextResponse.json({ success: false, message: 'Unauthorized: Invalid token signature' }, { status: 401 });
    }
}

export const config = {
  matcher: '/api/v1/:path*',
};
