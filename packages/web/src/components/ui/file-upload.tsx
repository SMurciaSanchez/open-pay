'use client';

import { useState, useRef } from 'react';
import { Upload, X, FileIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onFileSelected: (file: File | null) => void;
  accept?: string;
  maxSize?: number;
  className?: string;
}

export function FileUpload({
  onFileSelected,
  accept = '*',
  maxSize = 10485760, // 10MB default
  className
}: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (selectedFile: File | null) => {
    setFileError(null);

    if (!selectedFile) {
      setFile(null);
      onFileSelected(null);
      return;
    }

    // Check file size
    if (selectedFile.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / 1048576);
      setFileError(`El archivo excede el tamaño máximo permitido (${maxSizeMB}MB)`);
      return;
    }

    // Check file type if accept is specified
    if (accept !== '*') {
      const acceptedTypes = accept.split(',');
      const fileType = selectedFile.type;
      const isAccepted = acceptedTypes.some(type => {
        if (type.includes('*')) {
          // Handle wildcards like 'image/*'
          const mainType = type.split('/')[0];
          return fileType.startsWith(mainType);
        }
        return type === fileType;
      });

      if (!isAccepted) {
        setFileError(`Tipo de archivo no permitido. Formatos aceptados: ${accept}`);
        return;
      }
    }

    setFile(selectedFile);
    onFileSelected(selectedFile);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length) {
      handleFileChange(files[0]);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFile = () => {
    setFile(null);
    setFileError(null);
    onFileSelected(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={cn('w-full', className)}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null)}
        accept={accept}
        className="hidden"
      />

      {!file ? (
        <div
          className={cn(
            'border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-colors',
            isDragging
              ? 'border-primary bg-secondary/20'
              : 'border-input hover:border-primary/50',
            fileError && 'border-destructive'
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleButtonClick}
        >
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm font-medium">
              Arrastra un archivo o haz clic para seleccionar
            </p>
            <p className="text-xs text-muted-foreground">
              {accept !== '*'
                ? `Formatos aceptados: ${accept}`
                : 'Todos los formatos aceptados'}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between p-3 border rounded-md">
          <div className="flex items-center gap-2">
            <FileIcon className="h-5 w-5 text-primary" />
            <div className="text-sm truncate max-w-[200px]">
              {file.name}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRemoveFile}
            type="button"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {fileError && (
        <p className="text-xs text-destructive mt-1">{fileError}</p>
      )}
    </div>
  );
} 