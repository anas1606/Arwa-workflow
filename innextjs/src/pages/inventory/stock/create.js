import React from 'react';
import Head from 'next/head';
import AddStock from '@/components/stock/AddStock';

export default function AddStockPage() {
  return (
    <>
      <Head>
        <title>Add Stock Box - Inventory</title>
      </Head>
      <AddStock />
    </>
  );
}
