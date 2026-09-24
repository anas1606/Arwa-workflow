import React from 'react';
import Head from 'next/head';

export default function StockPage() {
  return (
    <>
      <Head>
        <title>Stock - Arwa Workflow</title>
      </Head>
      <div className="flex h-full flex-col gap-4 p-4">
        <h1 className="text-2xl font-bold text-grey-text-strong">Stock Module</h1>
        <p className="text-grey-muted">This is the new Stock module. It is currently under construction.</p>
      </div>
    </>
  );
}
