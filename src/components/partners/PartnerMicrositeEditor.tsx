import React, { useEffect, useState } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import { supabase } from '@/integrations/supabase/client';
import { uploadPartnerAsset } from '@/hooks/useBusinessPartners';

interface PartnerMicrositeEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: number;
}

const FALLBACK_KEY = 'dr67kwwgfkm6433kt5s4y3eov00k139jqt0lm33tz3bvhbn7';

/**
 * WYSIWYG editor for partner microsites. Images are uploaded straight into the
 * partner-assets bucket and can be floated left/right so body text wraps around them.
 */
export const PartnerMicrositeEditor: React.FC<PartnerMicrositeEditorProps> = ({
  value,
  onChange,
  placeholder = 'Describe this partner, their services and their work with HESS members...',
  height = 520,
}) => {
  const [apiKey, setApiKey] = useState<string>(FALLBACK_KEY);

  useEffect(() => {
    const loadKey = async () => {
      try {
        const { data } = await supabase
          .from('system_settings')
          .select('setting_value')
          .eq('setting_key', 'tinymce_api_key')
          .maybeSingle();
        if (data?.setting_value) {
          setApiKey(data.setting_value);
          return;
        }
        const { data: fnData } = await supabase.functions.invoke('get-tinymce-key');
        if (fnData?.apiKey) setApiKey(fnData.apiKey);
      } catch {
        /* keep fallback key */
      }
    };
    loadKey();
  }, []);

  return (
    <Editor
      key={apiKey}
      apiKey={apiKey}
      value={value}
      onEditorChange={(content) => onChange(content)}
      init={{
        height,
        menubar: 'edit insert format table',
        placeholder,
        branding: false,
        automatic_uploads: true,
        paste_data_images: true,
        file_picker_types: 'image',
        convert_urls: false,
        relative_urls: false,
        image_advtab: true,
        image_caption: true,
        image_title: true,
        object_resizing: true,
        plugins: [
          'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
          'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
          'media', 'table', 'wordcount', 'quickbars',
        ],
        toolbar:
          'undo redo | blocks | bold italic underline forecolor | ' +
          'alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | ' +
          'uploadImage image media link table | wrapLeft wrapRight wrapNone | removeformat code fullscreen',
        quickbars_selection_toolbar: 'bold italic quicklink',
        quickbars_image_toolbar: 'wrapLeft wrapNone wrapRight | alignleft aligncenter alignright | image',
        image_class_list: [
          { title: 'No wrap', value: '' },
          { title: 'Wrap text right of image', value: 'partner-img-left' },
          { title: 'Wrap text left of image', value: 'partner-img-right' },
        ],
        content_style: `
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 1.6; }
          img { max-width: 100%; height: auto; }
          .partner-img-left { float: left; margin: 0 1.25rem 1rem 0; max-width: 45%; }
          .partner-img-right { float: right; margin: 0 0 1rem 1.25rem; max-width: 45%; }
          p { overflow-wrap: break-word; }
        `,
        setup: (editor: any) => {
          const applyWrap = (mode: 'left' | 'right' | 'none') => {
            const node = editor.selection.getNode();
            if (!node || node.nodeName !== 'IMG') {
              editor.notificationManager.open({
                text: 'Select an image first, then choose how text should wrap.',
                type: 'info',
                timeout: 2500,
              });
              return;
            }
            node.classList.remove('partner-img-left', 'partner-img-right');
            node.style.float = '';
            node.style.margin = '';
            if (mode === 'left') node.classList.add('partner-img-left');
            if (mode === 'right') node.classList.add('partner-img-right');
            editor.fire('change');
          };

          editor.ui.registry.addButton('wrapLeft', {
            icon: 'align-left',
            tooltip: 'Float image left (text wraps to the right)',
            onAction: () => applyWrap('left'),
          });
          editor.ui.registry.addButton('wrapRight', {
            icon: 'align-right',
            tooltip: 'Float image right (text wraps to the left)',
            onAction: () => applyWrap('right'),
          });
          editor.ui.registry.addButton('wrapNone', {
            icon: 'remove-formatting',
            tooltip: 'Remove image text wrapping',
            onAction: () => applyWrap('none'),
          });
        },
        images_upload_handler: async (blobInfo: any) => {
          const blob: Blob = blobInfo.blob();
          const file = new File([blob], blobInfo.filename() || 'image.png', {
            type: blob.type || 'image/png',
          });
          return await uploadPartnerAsset(file);
        },
        file_picker_callback: (callback: any) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;
            try {
              const url = await uploadPartnerAsset(file);
              callback(url, { alt: file.name });
            } catch (error) {
              console.error('Partner image upload failed', error);
            }
          };
          input.click();
        },
      }}
    />
  );
};

export default PartnerMicrositeEditor;
