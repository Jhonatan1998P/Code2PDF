import { Upload } from "lucide-react";
import React, { useState, useRef, useCallback } from "react";
import { cn } from "@/src/lib/utils";

interface FileUploadProps {
  onFilesAdded: (files: File[]) => void;
}

export default function FileUpload({ onFilesAdded }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      const droppedFiles = Array.from(e.dataTransfer.files) as File[];
      onFilesAdded(droppedFiles);
    }
  }, [onFilesAdded]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files) as File[];
      onFilesAdded(selectedFiles);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [onFilesAdded]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={cn(
        "relative group cursor-pointer border-2 border-dashed rounded-2xl p-8 transition-all duration-300 flex flex-col items-center justify-center gap-4",
        isDragging 
          ? "border-blue-500 bg-blue-50/50" 
          : "border-gray-200 hover:border-blue-400 hover:bg-gray-50/50"
      )}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        className="hidden"
        multiple
        accept=".txt,.md,.tsx,.js,.html,.css,.php,.ts"
      />
      
      <div className={cn(
        "w-16 h-16 rounded-full flex items-center justify-center transition-transform duration-300",
        isDragging ? "scale-110 bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-400 group-hover:text-blue-500 group-hover:bg-blue-50"
      )}>
        <Upload className="w-8 h-8" />
      </div>

      <div className="text-center">
        <p className="text-lg font-medium text-gray-700">
          {isDragging ? "Suelta los archivos aquí" : "Arrastra y suelta tus archivos aquí"}
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Soporta .txt, .md, .tsx, .js, .html, .css, .php, .ts
        </p>
      </div>

      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm">
        Seleccionar archivos
      </button>
    </div>
  );
}
