'use client';

import React from 'react';

type ButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  className?: string;
};

export default function Button({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  className = '',
}: ButtonProps) {
  const baseStyle = 'px-4 py-2 rounded font-medium transition-colors';

  const variants = {
    primary: 'bg-blue-500 text-white hover:bg-blue-600',
    secondary: 'bg-gray-200 text-black hover:bg-gray-300',
  };

  const disabledStyle = 'opacity-50 cursor-not-allowed';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        ${baseStyle}
        ${variants[variant]}
        ${disabled ? disabledStyle : ''}
        ${className}
      `}
    >
      {children}
    </button>
  );
}
