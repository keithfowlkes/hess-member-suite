import React, { useState, useEffect } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import { supabase } from '@/integrations/supabase/client';

interface TinyMCEEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const TinyMCEEditor: React.FC<TinyMCEEditorProps> = ({
  value,
  onChange,
  placeholder = "Enter content...",
  className = ""
}) => {
  const [apiKey, setApiKey] = useState<string>('dr67kwwgfkm6433kt5s4y3eov00k139jqt0lm33tz3bvhbn7');
  const [keyVersion, setKeyVersion] = useState(0);

  const fetchApiKey = async () => {
    console.log('🔑 Fetching TinyMCE API key...');
    try {
      // First try to get from system settings (where we store it now)
      const { data: settingsData, error: settingsError } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'tinymce_api_key')
        .maybeSingle();

      console.log('📊 System settings query result:', { settingsData, settingsError });

      if (!settingsError && settingsData?.setting_value) {
        console.log('✅ TinyMCE API key found in settings:', settingsData.setting_value.substring(0, 10) + '...');
        setApiKey(settingsData.setting_value);
        return;
      }

      console.log('⚠️ No key in settings, trying edge function...');
      // Fallback to edge function
      const { data, error } = await supabase.functions.invoke('get-tinymce-key');
      console.log('📡 Edge function result:', { data, error });
      
      if (!error && data?.apiKey) {
        console.log('✅ TinyMCE API key found from edge function:', data.apiKey.substring(0, 10) + '...');
        setApiKey(data.apiKey);
        return;
      }

      console.log('❌ Fallback: Using hardcoded API key');
      // Use the provided API key as fallback
      setApiKey('dr67kwwgfkm6433kt5s4y3eov00k139jqt0lm33tz3bvhbn7');
    } catch (error) {
      console.error('💥 Error fetching TinyMCE API key:', error);
      console.log('❌ Error fallback: Using hardcoded API key');
      // Use the provided API key as fallback
      setApiKey('dr67kwwgfkm6433kt5s4y3eov00k139jqt0lm33tz3bvhbn7');
    }
  };

  useEffect(() => {
    fetchApiKey();
  }, [keyVersion]);

  // Listen for API key updates
  useEffect(() => {
    const handleStorageChange = () => {
      // Increment version to trigger re-fetch
      setKeyVersion(prev => prev + 1);
    };

    // Listen for custom events when API key is updated
    window.addEventListener('tinymce-key-updated', handleStorageChange);
    
    return () => {
      window.removeEventListener('tinymce-key-updated', handleStorageChange);
    };
  }, []);

  // Add a method to refresh the key from outside
  React.useImperativeHandle(React.createRef(), () => ({
    refreshApiKey: () => {
      setKeyVersion(prev => prev + 1);
    }
  }));

  console.log('🔧 TinyMCE Editor initializing with API key:', apiKey.substring(0, 10) + '...');
  
  return (
    <div className={className}>
      <Editor
        key={`tinymce-${keyVersion}-${apiKey}`}
        apiKey={apiKey}
        value={value}
        onEditorChange={(content) => onChange(content)}
        init={{
          height: 400,
          menubar: false,
          plugins: [
            'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
            'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
            'insertdatetime', 'media', 'table', 'help', 'wordcount', 'emoticons',
            'template', 'codesample'
          ],
          toolbar: 'undo redo | blocks | bold italic forecolor backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | removeformat | image link | help',
          content_style: 'body { font-family: -apple-system, BlinkMacSystemFont, San Francisco, Segoe UI, Roboto, Helvetica Neue, sans-serif; font-size: 14px }',
          placeholder: placeholder,
          branding: false,
          resize: true,
          automatic_uploads: true,
          file_picker_types: 'image',
          paste_data_images: true,
          // Remove the onboarding plugin if using a valid API key
          ...(apiKey !== 'no-api-key' && apiKey !== 'dr67kwwgfkm6433kt5s4y3eov00k139jqt0lm33tz3bvhbn7' ? {} : {
            plugins: [
              'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
              'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
              'insertdatetime', 'media', 'table', 'help', 'wordcount', 'emoticons',
              'template', 'codesample'
            ]
          }),
          images_upload_handler: (blobInfo: any) => {
            return new Promise((resolve) => {
              const reader = new FileReader();
              reader.onload = () => {
                resolve(reader.result as string);
              };
              reader.readAsDataURL(blobInfo.blob());
            });
          },
          setup: (editor: any) => {
            editor.on('init', () => {
              // Add image resize functionality
              editor.ui.registry.addButton('imageResize', {
                text: 'Resize Image',
                onAction: () => {
                  const selectedNode = editor.selection.getNode();
                  if (selectedNode.tagName === 'IMG') {
                    const currentWidth = selectedNode.style.width || selectedNode.width + 'px';
                    const newWidth = prompt('Enter image width (e.g., 300px, 50%, auto):', currentWidth);
                    if (newWidth && newWidth.trim() !== '') {
                      selectedNode.style.width = newWidth;
                      selectedNode.style.height = 'auto';
                    }
                  } else {
                    alert('Please select an image first');
                  }
                }
              });
            });

            // Add context menu for images
            editor.ui.registry.addContextMenu('imageContextMenu', {
              update: (element: any) => {
                if (element.tagName === 'IMG') {
                  return 'imageResize | removeformat';
                }
                return '';
              }
            });
          },
          contextmenu: 'link image table | imageContextMenu',
          image_advtab: true,
          image_caption: true,
          image_title: true,
          image_description: false,
          convert_urls: false,
          relative_urls: false,
          remove_script_host: false,
          document_base_url: window.location.origin,
        }}
      />
    </div>
  );
};

export default TinyMCEEditor;