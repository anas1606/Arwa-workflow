import prisma from '@/lib/prisma';
import { decryptString } from '@/lib/encryption';
import { generateToken } from '@/lib/jwt';

export const loginUser = async (identifier, password) => {
    try {
        if (!identifier || !password) {
            return { success: false, message: 'Username/Email/Phone and password are required' };
        }

        // Find the user
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { username: identifier },
                    { email: identifier },
                    { phone: identifier }
                ]
            },
            include: {
                security_role: {
                    include: {
                        permissions: true,
                    }
                }
            }
        });

        if (!user || user.is_deleted) {
            return { success: false, message: 'User not found' };
        }

        if (!user.isActive) {
            return { success: false, message: 'Invalid credentials or inactive account' };
        }

        // Check password
        const decryptedStoredPassword = decryptString(user.password);
        
        // Decrypt the password sent by the frontend
        const decryptedLoginPassword = decryptString(password);
        
        console.log("Login Debug:", {
            identifier,
            storedEncrypted: user.password,
            sentEncrypted: password,
            decryptedStoredPassword,
            decryptedLoginPassword
        });

        if (decryptedLoginPassword !== decryptedStoredPassword) {
            return { success: false, message: 'Invalid credentials' };
        }

        // Build the payload
        const payload = {
            id: user.id,
            username: user.username,
            phone: user.phone,
            email: user.email,
            isSuperAdmin: user.isSuperAdmin,
            role: user.security_role?.role_name || undefined,
            security_role_id: user.security_role_id,
            security_role: user.security_role ? {
                id: user.security_role.id,
                role_name: user.security_role.role_name,
                role_number: user.security_role.role_number,
                permissions: user.security_role.permissions.map(p => ({
                    module_key: p.module_key,
                    can_read: p.can_read,
                    can_create: p.can_create,
                    can_update: p.can_update,
                    can_delete: p.can_delete,
                }))
            } : null
        };

        const token = generateToken(payload);

        return { 
            success: true, 
            data: {
                token,
                user: payload
            }
        };
    } catch (error) {
        console.error('Service error during login:', error);
        return { success: false, message: 'Internal server error during login' };
    }
};
