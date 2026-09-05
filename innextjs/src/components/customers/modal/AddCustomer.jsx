import React, { useState } from 'react';
import Modal from '@/common/modal/Modal';
import Button from '@/common/buttons/Button';
import Input from '@/common/input/Input';

export default function AddCustomer({ open, onClose, onAdd }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [region, setRegion] = useState('');
  const [error, setError] = useState(null);

  const reset = () => {
    setName('');
    setCode('');
    setRegion('');
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const submit = (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedCode = code.trim().toUpperCase();
    const trimmedRegion = region.trim();
    if (!trimmedName) {
      setError('Customer name is required.');
      return;
    }
    if (!trimmedCode) {
      setError('Customer code is required.');
      return;
    }
    if (!trimmedRegion) {
      setError('Region is required.');
      return;
    }
    onAdd({
      id: `c${Date.now()}`,
      name: trimmedName,
      code: trimmedCode,
      region: trimmedRegion,
      brands: [],
    });
    reset();
  };

  return (
    <Modal
      open={open}
      title="Add customer"
      onClose={handleClose}
      footer={
        <div className="flex w-full gap-2">
          <Button variant="secondary" className="flex-1" onClick={handleClose} text="Cancel" />
          <Button variant="primary" type="submit" form="customers-add-form" className="flex-1" text="Add customer" />
        </div>
      }
    >
      <form id="customers-add-form" className="flex flex-col gap-4" onSubmit={submit}>
        <Input
          type="text"
          id="customers-name"
          label="Customer name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Apex Manufacturing"
          autoFocus
        />
        <Input
          type="text"
          id="customers-code"
          label="Code"
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="e.g. APEX"
          maxLength={8}
          className="font-mono uppercase"
        />
        <Input
          type="text"
          id="customers-region"
          label="Region"
          required
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          placeholder="e.g. Midwest"
        />
        {error ? (
          <p className="text-sm font-medium text-danger-700" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
