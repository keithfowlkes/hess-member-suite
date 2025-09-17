import React from 'react';
import headerImage from '@/assets/memberportalheader-clean.png';

export const AuthHeader = () => {
  return (
    <div 
      className="relative w-full h-48 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${headerImage})` }}
    >
    </div>
  );
};