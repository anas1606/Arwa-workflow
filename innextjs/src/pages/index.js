import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Automatically navigate to the dashboard page
    router.replace('/dashboard');
  }, [router]);

  return (
    <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h1>Hello World</h1>
      <p>Redirecting to dashboard...</p>
    </div>
  );
}
