import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  padding?: 'sm' | 'md' | 'lg' | 'none';
}

const padClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
};

const Card: React.FC<CardProps> = ({
  hover = false,
  padding = 'md',
  className = '',
  children,
  ...props
}) => (
  <div
    className={`
      bg-card rounded-card border border-line shadow-soft
      ${hover ? 'hover-lift hover:shadow-lift cursor-pointer' : ''}
      ${padClasses[padding]}
      ${className}
    `}
    {...props}
  >
    {children}
  </div>
);

export default Card;
