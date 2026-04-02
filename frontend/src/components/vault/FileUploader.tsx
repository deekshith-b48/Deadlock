"use client";

import { useDropzone } from "react-dropzone";
import { Upload, X } from "lucide-react";
import { formatFileSize } from "@/lib/utils/formatting";

interface FileUploaderProps {
  files: File[];
  onChange: (files: File[]) => void;
  maxSizeMB?: number;
}

export function FileUploader({ files, onChange, maxSizeMB = 100 }: FileUploaderProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (accepted) => onChange([...files, ...accepted]),
    maxSize: maxSizeMB * 1024 * 1024,
  });

  const removeFile = (i: number) => onChange(files.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
          isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="w-10 h-10 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">
          {isDragActive ? "Drop files here..." : "Drag & drop files, or click to browse"}
        </p>
        <p className="text-xs text-muted-foreground mt-2">Any file type · Max {maxSizeMB}MB total</p>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-muted rounded-lg text-sm">
              <div className="flex items-center gap-3">
                <span>📄</span>
                <div>
                  <div className="font-medium">{file.name}</div>
                  <div className="text-xs text-muted-foreground">{formatFileSize(file.size)}</div>
                </div>
              </div>
              <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
