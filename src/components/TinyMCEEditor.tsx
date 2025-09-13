import React from 'react';
import { Editor } from '@tinymce/tinymce-react';

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
  return (
    <div className={className}>
      <Editor
        apiKey="no-api-key"
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