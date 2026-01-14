import React from 'react';
import './SkeletonLoader.css';

const SkeletonLoader = ({ lines = 3, className = '' }) => {
  return (
    <div className={`skeleton-loader ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <div key={index} className="skeleton-line" style={{ width: index === lines - 1 ? '60%' : '100%' }} />
      ))}
    </div>
  );
};

export default SkeletonLoader;
