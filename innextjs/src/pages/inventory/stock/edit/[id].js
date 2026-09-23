import React from 'react';
import Head from 'next/head';
import EditStock from '@/components/stock/EditStock';

export default function EditStockPage() {
  return (
    <>
      <Head>
        <title>Edit Stock Box - Inventory</title>
      </Head>
      <EditStock />
    </>
  );
}
