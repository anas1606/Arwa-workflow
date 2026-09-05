import React from 'react';
import * as LucideIcons from 'lucide-react';
import clsx from 'clsx';

const Icon = ({ name, size = 18, color, className = '', ...props }) => {
  const LucideIcon = LucideIcons[name];

  if (!LucideIcon) {
    console.warn(`Icon "${name}" not found in lucide-react`);
    return null;
  }

  return (
    <LucideIcon
      size={size}
      color={color}
      className={clsx(className)}
      {...props}
    />
  );
};

export default Icon;
