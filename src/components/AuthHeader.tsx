import React from 'react';
import headerImage from '@/assets/memberportalheader.png';

export const AuthHeader = () => {
  return (
    <div 
      className="relative w-full h-48 bg-cover bg-center bg-no-repeat flex items-center justify-center"
      style={{ backgroundImage: `url(${headerImage})` }}
    >
      {/* Dark overlay for better text readability */}
      <div className="absolute inset-0 bg-black/40"></div>
      
      {/* Content */}
      <div className="relative z-10 text-center text-white">
        <h1 className="text-4xl font-bold mb-2">
          HESS Member Portal & Analytics Dashboard
        </h1>
        <p className="text-lg opacity-90">
          (close this window to return to the main website)
        </p>
      </div>
    </div>
  );
};