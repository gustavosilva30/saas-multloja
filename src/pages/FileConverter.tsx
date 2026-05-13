import React, { useState, useCallback, useRef, type DragEvent } from 'react';
import { Upload, FileText, Image as ImageIcon, File, Download, Loader2, X, CheckCircle2, AlertTriangle, FileSpreadsheet, Presentation } from 'lucide-react';
import { apiFetch } from '@/lib/api';

type ConversionFormat = 'pdf' | 'jpg' | 'png' | 'webp' | 'docx';

interface ConversionResult {
  download_url: string;
  original_filename: string;
  converted_filename: string;
}

export function FileConverter() {
  const [file, setFile] = useState<File | null>(null);
  const [converting, setConverting] = useState(false);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [outputFormat, setOutputFormat] = useState<ConversionFormat>('pdf');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getAvailableFormats = useCallback((fileType: string): ConversionFormat[] => {
    if (fileType.startsWith('image/')) {
      return ['jpg', 'png', 'webp'];
    }
    if (
      fileType.includes('word') || 
      fileType.includes('document') || 
      fileType.includes('officedocument') ||
      fileType.includes('excel') ||
      fileType.includes('spreadsheet') ||
      fileType.includes('powerpoint') ||
      fileType.includes('presentation')
    ) {
      return ['pdf'];
    }
    if (fileType === 'application/pdf') {
      return ['jpg', 'png', 'webp'];
    }
    return [];
  }, []);

  const handleDrag = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      validateAndSetFile(droppedFile);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    // Validate file type
    const validTypes = ['image/', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats', 'application/vnd.ms-excel', 'application/vnd.ms-powerpoint'];
    const isValid = validTypes.some(type => selectedFile.type.startsWith(type));

    if (!isValid) {
      setError('Tipo de arquivo não suportado. Use imagens, PDF, Word, Excel ou PowerPoint.');
      return;
    }

    // Validate file size (max 50MB)
    if (selectedFile.size > 50 * 1024 * 1024) {
      setError('Arquivo muito grande. Máximo 50MB.');
      return;
    }

    setFile(selectedFile);
    setError('');
    setResult(null);

    // Set default output format based on input type
    const formats = getAvailableFormats(selectedFile.type);
    if (formats.length > 0) {
      setOutputFormat(formats[0]);
    }
  };

  const handleConvert = async () => {
    if (!file) return;

    setConverting(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('output_format', outputFormat);

      const token = localStorage.getItem('auth_token');
      const API_URL = import.meta.env.VITE_API_URL || 'https://api.gsntech.com.br';

      const res = await fetch(`${API_URL}/api/convert`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao converter arquivo');
      }

      // Try to get actual filename from content-disposition header
      const disposition = res.headers.get('content-disposition');
      let convertedFilename = `${file.name.split('.')[0]}.${outputFormat}`;
      if (disposition && disposition.includes('filename="')) {
        convertedFilename = disposition.split('filename="')[1].split('"')[0];
      } else if (disposition && disposition.includes('filename=')) {
        convertedFilename = disposition.split('filename=')[1];
      }

      // Get the blob from response
      const blob = await res.blob();
      
      // Create download URL from blob
      const downloadUrl = URL.createObjectURL(blob);

      setResult({
        download_url: downloadUrl,
        original_filename: file.name,
        converted_filename: convertedFilename,
      });
    } catch (err: any) {
      setError(err.message || 'Erro ao converter arquivo. Tente novamente.');
    } finally {
      setConverting(false);
    }
  };

  const handleDownload = () => {
    if (result) {
      window.open(result.download_url, '_blank');
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileIcon = () => {
    if (!file) return File;
    if (file.type.startsWith('image/')) return ImageIcon;
    if (file.type.includes('pdf') || file.type.includes('word')) return FileText;
    if (file.type.includes('excel') || file.type.includes('spreadsheet')) return FileSpreadsheet;
    if (file.type.includes('powerpoint') || file.type.includes('presentation')) return Presentation;
    return File;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const availableFormats = file ? getAvailableFormats(file.type) : [];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Conversor de Arquivos</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Converta imagens, PDF, documentos Word, Excel e PowerPoint sem sair do sistema.
        </p>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8 shadow-sm">
        {/* Upload Area */}
        {!file ? (
          <div
            className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all
              ${dragActive
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                : 'border-zinc-300 dark:border-zinc-700 hover:border-emerald-500 dark:hover:border-emerald-500'
              }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                <Upload size={32} className="text-zinc-400" />
              </div>
              <div>
                <p className="text-lg font-medium text-zinc-900 dark:text-white mb-1">
                  Arraste e solte o arquivo aqui
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                  ou clique para selecionar
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors"
                >
                  Selecionar Arquivo
                </button>
              </div>
              <p className="text-xs text-zinc-400">
                Formatos suportados: JPG, PNG, WEBP, PDF, Word, Excel, PowerPoint (máx 50MB)
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* File Info */}
            <div className="flex items-center gap-4 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-xl">
              <div className="w-12 h-12 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                {React.createElement(getFileIcon(), { size: 24, className: 'text-emerald-600 dark:text-emerald-400' })}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-zinc-900 dark:text-white truncate">{file.name}</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{formatFileSize(file.size)}</p>
              </div>
              <button
                onClick={handleReset}
                className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Format Selection */}
            {availableFormats.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Formato de saída
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableFormats.map((format) => (
                    <button
                      key={format}
                      onClick={() => setOutputFormat(format)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors
                        ${outputFormat === format
                          ? 'bg-emerald-500 text-white'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                        }`}
                    >
                      {format.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <AlertTriangle size={20} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Result */}
            {result && (
              <div className="flex items-center gap-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={20} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-emerald-900 dark:text-emerald-100">Conversão concluída!</p>
                  <p className="text-sm text-emerald-700 dark:text-emerald-300 truncate">
                    {result.converted_filename}
                  </p>
                </div>
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  <Download size={16} />
                  Baixar
                </button>
              </div>
            )}

            {/* Convert Button */}
            {!result && (
              <button
                onClick={handleConvert}
                disabled={converting || availableFormats.length === 0}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {converting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Convertendo...
                  </>
                ) : (
                  <>
                    <Upload size={18} />
                    Converter para {outputFormat.toUpperCase()}
                  </>
                )}
              </button>
            )}

            {/* New Conversion Button */}
            {result && (
              <button
                onClick={handleReset}
                className="w-full py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium rounded-xl transition-colors"
              >
                Converter outro arquivo
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
