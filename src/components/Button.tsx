'use client';

import React from 'react';

type ButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
};

export default function Button({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  className = '',
  type = 'button',
}: ButtonProps) {
  const baseStyle =
    'inline-flex items-center justify-center gap-2 min-h-11 rounded-xl px-5 py-3 text-sm font-medium leading-none transition-colors cursor-pointer sm:text-[0.9375rem]';

  const variants = {
    primary: 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700',
    secondary:
      'border border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700 hover:border-slate-500 active:bg-slate-600',
  };

  const disabledStyle = 'opacity-50 !cursor-not-allowed pointer-events-none';

  return (
    <button
      type={type}
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
