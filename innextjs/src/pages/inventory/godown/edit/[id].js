import React from 'react';
import Head from 'next/head';
import EditGodown from '@/components/godown/EditGodown';

export default function EditGodownPage() {
  return (
    <>
      <Head>
        <title>Edit Godown Box - Inventory</title>
      </Head>
      <EditGodown />
    </>
  );
}
