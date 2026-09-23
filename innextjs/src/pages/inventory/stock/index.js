import React from 'react';
import Head from 'next/head';
import Stock from '@/components/stock/Stock';

export default function StockPage() {
  return (
    <>
      <Head>
        <title>Stock - Arwa Workflow</title>
      </Head>
      <Stock />
    </>
  );
}
