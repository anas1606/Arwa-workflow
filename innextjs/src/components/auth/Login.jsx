import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import axios from 'axios';
import { toast } from 'sonner';
import Input from '@/common/input/Input';
import Button from '@/common/buttons/Button';
import { User, Lock, LogIn } from 'lucide-react';
import { encryptString } from '@/lib/encryption';

export default function Login() {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            router.replace('/');
        }
    }, [router]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            // Encrypt the password before sending it over the network
            const encryptedPassword = encryptString(password);
            
            const response = await axios.post('/api/v1/auth/login', {
                identifier,
                password: encryptedPassword
            });

            if (response.data && response.data.success) {
                const token = response.data.data.token;
                localStorage.setItem('token', token);
                toast.success('Logged in successfully');
                router.push('/'); // Navigate to index to calculate default route based on permissions
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Login failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4 sm:px-6 lg:px-8">
            <Head>
                <title>Login | Arwa Weld</title>
            </Head>
            
            <div className="w-full max-w-md space-y-8 card-panel !p-8 shadow-xl">
                <div>
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-primary text-2xl font-bold text-white shadow-sm shadow-primary/30">
                        AW
                    </div>
                    <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-grey-text-strong">
                        Sign in to your account
                    </h2>
                    <p className="mt-2 text-center text-sm text-grey-muted">
                        Factory workflow management
                    </p>
                </div>
                
                <form className="mt-8 space-y-6" onSubmit={handleLogin}>
                    <div className="space-y-4 rounded-md">
                        <div>
                            <Input
                                id="identifier"
                                name="identifier"
                                type="text"
                                required
                                placeholder="Username, Email, or Phone"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                startIcon={User}
                            />
                        </div>
                        <div>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                required
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                startIcon={Lock}
                            />
                        </div>
                    </div>

                    <div>
                        <Button
                            type="submit"
                            variant="primary"
                            className="w-full justify-center"
                            disabled={isLoading}
                            startIcon={isLoading ? undefined : LogIn}
                        >
                            {isLoading ? 'Signing in...' : 'Sign in'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
