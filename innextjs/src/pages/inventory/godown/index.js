import React from 'react';
import Head from 'next/head';
import Godown from '@/components/godown/Godown';

export default function GodownPage() {
  return (
    <>
      <Head>
        <title>Godown - Arwa Workflow</title>
      </Head>
      <Godown />
    </>
  );
}
