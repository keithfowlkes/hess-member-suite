import React, { useState, useEffect } from 'react';
import headerImage from '@/assets/memberportal-header-master.png';
import { supabase } from '@/integrations/supabase/client';

export const AuthHeader = () => {
  const [dynamicHeader, setDynamicHeader] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load current header graphic from storage
  useEffect(() => {
    const loadHeaderGraphic = async () => {
      try {
        // Check if header graphic exists in storage
        const { data: files, error } = await supabase.storage
          .from('invoice-logos')
          .list('', {
            search: 'header-graphic'
          });

        if (error) {
          console.error('Error loading header graphic:', error);
          setLoading(false);
          return;
        }

        if (files && files.length > 0) {
          const headerFile = files.find(file => file.name.startsWith('header-graphic'));
          if (headerFile) {
            const { data } = supabase.storage
              .from('invoice-logos')
              .getPublicUrl(headerFile.name);
            setDynamicHeader(data.publicUrl);
          }
        }
      } catch (error) {
        console.error('Error loading header graphic:', error);
      } finally {
        setLoading(false);
      }
    };

    loadHeaderGraphic();
  }, []);

  // Use dynamic header if available, otherwise fall back to static image
  const headerImageUrl = dynamicHeader || headerImage;

  return (
    <div 
      className="relative w-full h-48 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${headerImageUrl})` }}
    >
    </div>
  );
};