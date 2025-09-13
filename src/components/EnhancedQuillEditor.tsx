import React, { useMemo, useRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import '@/styles/quill-custom.css';

interface EnhancedQuillEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const EnhancedQuillEditor: React.FC<EnhancedQuillEditorProps> = ({
  value,
  onChange,
  placeholder,
  className = ""
}) => {
  const quillRef = useRef<ReactQuill>(null);

  // Custom image handler with resize functionality
  const imageHandler = () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = () => {
      const file = input.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const imageUrl = e.target?.result as string;
          
          // Create image element to get dimensions
          const img = new Image();
          img.onload = () => {
            const quill = quillRef.current?.getEditor();
            if (quill) {
              const range = quill.getSelection();
              if (range) {
                // Insert image with resize attributes
                quill.insertEmbed(range.index, 'image', imageUrl);
                
                // Get the inserted image element and make it resizable
                setTimeout(() => {
                  const images = quill.root.querySelectorAll('img');
                  const lastImage = images[images.length - 1] as HTMLImageElement;
                  if (lastImage && lastImage.src === imageUrl) {
                    makeImageResizable(lastImage);
                  }
                }, 100);
              }
            }
          };
          img.src = imageUrl;
        };
        reader.readAsDataURL(file);
      }
    };
  };

  // Function to make images resizable
  const makeImageResizable = (img: HTMLImageElement) => {
    img.style.cursor = 'pointer';
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    
    // Add resize handles
    img.addEventListener('click', () => {
      const currentWidth = img.style.width || img.naturalWidth + 'px';
      const newWidth = prompt('Enter image width (e.g., 300px, 50%, auto):', currentWidth);
      
      if (newWidth !== null && newWidth.trim() !== '') {
        img.style.width = newWidth;
        img.style.height = 'auto';
        
        // Trigger onChange to update the value
        const quill = quillRef.current?.getEditor();
        if (quill) {
          onChange(quill.root.innerHTML);
        }
      }
    });

    // Add context menu for more options
    img.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      
      const menu = document.createElement('div');
      menu.style.position = 'fixed';
      menu.style.left = e.clientX + 'px';
      menu.style.top = e.clientY + 'px';
      menu.style.backgroundColor = 'white';
      menu.style.border = '1px solid #ccc';
      menu.style.borderRadius = '4px';
      menu.style.padding = '8px';
      menu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
      menu.style.zIndex = '1000';
      menu.innerHTML = `
        <div style="cursor: pointer; padding: 4px 8px; hover:background-color: #f0f0f0;" onclick="resizeImage('small')">Small (150px)</div>
        <div style="cursor: pointer; padding: 4px 8px; hover:background-color: #f0f0f0;" onclick="resizeImage('medium')">Medium (300px)</div>
        <div style="cursor: pointer; padding: 4px 8px; hover:background-color: #f0f0f0;" onclick="resizeImage('large')">Large (500px)</div>
        <div style="cursor: pointer; padding: 4px 8px; hover:background-color: #f0f0f0;" onclick="resizeImage('full')">Full Width (100%)</div>
        <hr style="margin: 4px 0;">
        <div style="cursor: pointer; padding: 4px 8px; hover:background-color: #f0f0f0;" onclick="removeImage()">Remove Image</div>
      `;
      
      document.body.appendChild(menu);
      
      // Add event handlers
      (window as any).resizeImage = (size: string) => {
        switch(size) {
          case 'small': img.style.width = '150px'; break;
          case 'medium': img.style.width = '300px'; break;
          case 'large': img.style.width = '500px'; break;
          case 'full': img.style.width = '100%'; break;
        }
        img.style.height = 'auto';
        document.body.removeChild(menu);
        
        const quill = quillRef.current?.getEditor();
        if (quill) {
          onChange(quill.root.innerHTML);
        }
      };
      
      (window as any).removeImage = () => {
        img.remove();
        document.body.removeChild(menu);
        
        const quill = quillRef.current?.getEditor();
        if (quill) {
          onChange(quill.root.innerHTML);
        }
      };
      
      // Remove menu when clicking elsewhere
      const removeMenu = (e: MouseEvent) => {
        if (!menu.contains(e.target as Node)) {
          if (document.body.contains(menu)) {
            document.body.removeChild(menu);
          }
          document.removeEventListener('click', removeMenu);
        }
      };
      setTimeout(() => document.addEventListener('click', removeMenu), 100);
    });
  };

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'align': [] }],
        ['link', 'image'],
        ['clean']
      ],
      handlers: {
        image: imageHandler
      }
    },
    clipboard: {
      matchVisual: false,
    }
  }), []);

  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet', 'indent',
    'link', 'image', 'video',
    'color', 'background', 'align'
  ];

  // Add resize functionality to existing images when component mounts or value changes
  React.useEffect(() => {
    if (quillRef.current) {
      const quill = quillRef.current.getEditor();
      const images = quill.root.querySelectorAll('img');
      images.forEach((img: Element) => {
        if (img instanceof HTMLImageElement) {
          makeImageResizable(img);
        }
      });
    }
  }, [value]);

  return (
    <ReactQuill
      ref={quillRef}
      theme="snow"
      value={value}
      onChange={onChange}
      modules={modules}
      formats={formats}
      placeholder={placeholder}
      className={className}
    />
  );
};

export default EnhancedQuillEditor;