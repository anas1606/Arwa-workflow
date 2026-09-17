import "@/styles/globals.css";
import { Layout } from "@/components/layout/Layout";
import Head from 'next/head';

import { Toaster } from 'sonner';

import { useRouter } from 'next/router';

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const isLoginPage = router.pathname === '/login';

  return (
    <>
      <Head>
        <title>Arwa Weld</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>
      {isLoginPage ? (
        <Component {...pageProps} />
      ) : (
        <Layout>
          <Component {...pageProps} />
        </Layout>
      )}
      <Toaster position="top-right" richColors duration={1500} />
    </>
  );
}
