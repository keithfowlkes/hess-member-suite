import React, { useMemo, useRef, useCallback } from 'react';
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
  const containerRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);

  // Function to update editor content and trigger onChange
  const updateContent = useCallback(() => {
    const quill = quillRef.current?.getEditor();
    if (quill) {
      onChange(quill.root.innerHTML);
    }
  }, [onChange]);

  // Function to create context menu
  const createContextMenu = useCallback((e: MouseEvent, img: HTMLImageElement) => {
    e.preventDefault();
    
    // Remove any existing menus
    if (contextMenuRef.current) {
      contextMenuRef.current.remove();
      contextMenuRef.current = null;
    }
    
    const menu = document.createElement('div');
    menu.className = 'image-context-menu';
    menu.style.cssText = `
      position: fixed;
      left: ${e.clientX}px;
      top: ${e.clientY}px;
      background-color: white;
      border: 1px solid #ccc;
      border-radius: 6px;
      padding: 4px 0;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      min-width: 180px;
    `;

    const options = [
      { label: 'Small (150px)', size: '150px' },
      { label: 'Medium (300px)', size: '300px' },
      { label: 'Large (500px)', size: '500px' },
      { label: 'Full Width (100%)', size: '100%' },
      { label: 'Custom Size...', size: 'custom' },
      { label: 'Remove Image', size: 'remove' }
    ];

    options.forEach((option, index) => {
      const item = document.createElement('div');
      item.textContent = option.label;
      item.style.cssText = `
        padding: 8px 16px;
        cursor: pointer;
        transition: background-color 0.15s ease;
        ${index === options.length - 2 ? 'border-top: 1px solid #eee; margin-top: 4px;' : ''}
        ${option.size === 'remove' ? 'color: #dc2626; border-top: 1px solid #eee; margin-top: 4px;' : ''}
      `;
      
      item.addEventListener('mouseenter', () => {
        item.style.backgroundColor = option.size === 'remove' ? '#fef2f2' : '#f3f4f6';
      });
      
      item.addEventListener('mouseleave', () => {
        item.style.backgroundColor = 'white';
      });
      
      item.addEventListener('click', () => {
        if (option.size === 'remove') {
          img.remove();
        } else if (option.size === 'custom') {
          const currentWidth = img.style.width || (img.naturalWidth + 'px');
          const newWidth = prompt('Enter image width (e.g., 300px, 50%, auto):', currentWidth);
          if (newWidth !== null && newWidth.trim() !== '') {
            img.style.width = newWidth;
            img.style.height = 'auto';
          }
        } else {
          img.style.width = option.size;
          img.style.height = 'auto';
        }
        
        menu.remove();
        contextMenuRef.current = null;
        updateContent();
      });
      
      menu.appendChild(item);
    });
    
    document.body.appendChild(menu);
    contextMenuRef.current = menu;
    
    // Remove menu when clicking elsewhere
    const removeMenu = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node)) {
        menu.remove();
        contextMenuRef.current = null;
        document.removeEventListener('click', removeMenu);
      }
    };
    
    setTimeout(() => document.addEventListener('click', removeMenu), 100);
  }, [updateContent]);

  // Set up event delegation for image interactions
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG') {
        const img = target as HTMLImageElement;
        
        // Simple click for resize prompt
        const currentWidth = img.style.width || (img.naturalWidth + 'px');
        const newWidth = prompt('Enter image width (e.g., 300px, 50%, auto):', currentWidth);
        
        if (newWidth !== null && newWidth.trim() !== '') {
          img.style.width = newWidth;
          img.style.height = 'auto';
          img.style.maxWidth = '100%';
          img.style.display = 'block';
          updateContent();
        }
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG') {
        const img = target as HTMLImageElement;
        createContextMenu(e, img);
      }
    };

    container.addEventListener('click', handleClick);
    container.addEventListener('contextmenu', handleContextMenu);

    return () => {
      container.removeEventListener('click', handleClick);
      container.removeEventListener('contextmenu', handleContextMenu);
      if (contextMenuRef.current) {
        contextMenuRef.current.remove();
        contextMenuRef.current = null;
      }
    };
  }, [updateContent, createContextMenu]);

  // Style images when content changes
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (quillRef.current) {
        const quill = quillRef.current.getEditor();
        const images = quill.root.querySelectorAll('img');
        
        images.forEach((img: Element) => {
          if (img instanceof HTMLImageElement) {
            img.style.cursor = 'pointer';
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            img.style.display = 'block';
            img.title = 'Click to resize or right-click for options';
          }
        });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [value]);

  // Custom image handler with resize functionality
  const imageHandler = useCallback(() => {
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
          
          const quill = quillRef.current?.getEditor();
          if (quill) {
            const range = quill.getSelection();
            if (range) {
              // Insert image
              quill.insertEmbed(range.index, 'image', imageUrl);
              
              // Style the inserted image
              setTimeout(() => {
                const images = quill.root.querySelectorAll('img');
                const lastImage = images[images.length - 1] as HTMLImageElement;
                if (lastImage && lastImage.src === imageUrl) {
                  lastImage.style.cursor = 'pointer';
                  lastImage.style.maxWidth = '100%';
                  lastImage.style.height = 'auto';
                  lastImage.style.display = 'block';
                  lastImage.title = 'Click to resize or right-click for options';
                }
              }, 100);
            }
          }
        };
        reader.readAsDataURL(file);
      }
    };
  }, []);

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
  }), [imageHandler]);

  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet', 'indent',
    'link', 'image', 'video',
    'color', 'background', 'align'
  ];

  return (
    <div ref={containerRef}>
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
    </div>
  );
};

export default EnhancedQuillEditor;