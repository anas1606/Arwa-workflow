import React from 'react';
import Head from 'next/head';
import AddGodown from '@/components/godown/AddGodown';

export default function AddGodownPage() {
  return (
    <>
      <Head>
        <title>Add Godown Box - Inventory</title>
      </Head>
      <AddGodown />
    </>
  );
}
