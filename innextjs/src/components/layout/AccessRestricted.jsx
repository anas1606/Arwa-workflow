import React from 'react';
import Head from 'next/head';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { useRouter } from 'next/router';
import Button from '@/common/buttons/Button';

export default function AccessRestricted() {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>Access Restricted | Arwa Weld</title>
      </Head>
      <div className="flex h-full flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center text-center max-w-md">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-danger-bg text-danger-main">
            <ShieldAlert size={40} />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-grey-text-strong">
            Access Restricted
          </h1>
          <p className="mb-8 text-sm text-grey-muted">
            You don't have the necessary permissions to view this page. Please contact your system administrator if you believe this is a mistake.
          </p>
          <div className="flex flex-col gap-3 w-full sm:flex-row sm:justify-center">
            <Button
              variant="secondary"
              onClick={() => router.back()}
              startIcon={ArrowLeft}
              text="Go Back"
              className="w-full sm:w-auto"
            />
            <Button
              variant="primary"
              onClick={() => router.push('/')}
              startIcon={Home}
              text="Home"
              className="w-full sm:w-auto"
            />
          </div>
        </div>
      </div>
    </>
  );
}
