import React, { useState, useRef } from 'react';
import { UploadIcon, XCircleIcon } from './icons';

interface ImageUploadProps {
    image: string | null;
    setImage: (base64: string | null) => void;
    disabled?: boolean;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ image, setImage, disabled = false }) => {
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (file: File | null) => {
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result?.toString().split(',')[1];
                if (base64String) {
                    setImage(base64String);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleFileChange(e.target.files?.[0] || null);
    };

    const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
    };

    const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        if (!disabled) {
            handleFileChange(e.dataTransfer.files?.[0] || null);
        }
    };
    
    const onButtonClick = () => {
        fileInputRef.current?.click();
    };

    const onRemoveImage = () => {
        setImage(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    if (image) {
        return (
            <div className="relative group">
                <img 
                    src={`data:image/jpeg;base64,${image}`} 
                    alt="Uploaded Task 1 diagram"
                    className="w-full h-auto max-h-48 object-contain rounded-md border-2 border-slate-300"
                />
                <button
                    onClick={onRemoveImage}
                    className="absolute -top-2 -right-2 bg-white rounded-full text-slate-500 hover:text-red-600 transition-colors duration-200 opacity-0 group-hover:opacity-100"
                    aria-label="Remove image"
                    disabled={disabled}
                >
                    <XCircleIcon className="h-7 w-7"/>
                </button>
            </div>
        )
    }

    return (
        <div 
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg transition-colors duration-200 ${
                isDragging ? 'border-sky-500 bg-sky-50' : 'border-slate-300'
            } ${disabled ? 'bg-slate-100 cursor-not-allowed' : 'bg-white'}`}
        >
            <UploadIcon className="h-8 w-8 text-slate-400 mb-2" />
            <p className="text-sm text-slate-500 text-center">
                <button type="button" onClick={onButtonClick} className="font-semibold text-sky-600 hover:underline focus:outline-none" disabled={disabled}>
                    Upload an image
                </button>
                {' '}or drag and drop
            </p>
            <p className="text-xs text-slate-400 mt-1">PNG, JPG, GIF up to 10MB</p>
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={onFileChange}
                className="hidden"
                disabled={disabled}
            />
        </div>
    );
};

export default ImageUpload;
