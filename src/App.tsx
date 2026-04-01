import { useState, useCallback, useEffect } from "react";
import { FileWithContent, readFileContent, getLanguageFromExtension, getReadableLanguage } from "@/src/lib/file-utils";
import FileUpload from "@/src/components/FileUpload";
import FileList from "@/src/components/FileList";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import Prism from "prismjs";
import "prismjs/themes/prism-tomorrow.css";
// Load base languages and dependencies in correct order
import "prismjs/components/prism-markup";
import "prismjs/components/prism-clike";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-markdown";
import "prismjs/components/prism-css";
import "prismjs/components/prism-markup-templating";
import "prismjs/components/prism-php";
import { FileDown, Loader2, Sparkles, Github, Info } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/src/lib/utils";

export default function App() {
  const [files, setFiles] = useState<FileWithContent[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFilesAdded = useCallback(async (newFiles: File[]) => {
    const processedFiles = await Promise.all(
      newFiles.map(async (file) => {
        const content = await readFileContent(file);
        const extension = file.name.split('.').pop() || '';
        return {
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          content,
          extension,
          language: getLanguageFromExtension(extension),
          size: file.size,
        };
      })
    );
    setFiles((prev) => [...prev, ...processedFiles]);
  }, []);

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const moveUp = (id: string) => {
    const index = files.findIndex((f) => f.id === id);
    if (index > 0) {
      const newFiles = [...files];
      [newFiles[index - 1], newFiles[index]] = [newFiles[index], newFiles[index - 1]];
      setFiles(newFiles);
    }
  };

  const moveDown = (id: string) => {
    const index = files.findIndex((f) => f.id === id);
    if (index < files.length - 1) {
      const newFiles = [...files];
      [newFiles[index + 1], newFiles[index]] = [newFiles[index], newFiles[index + 1]];
      setFiles(newFiles);
    }
  };

  const generatePDF = async () => {
    if (files.length === 0) return;
    setIsGenerating(true);
    setProgress(0);

    try {
      const pdf = new jsPDF({
        orientation: "p",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // 1. Generate Cover Page
      const coverContainer = document.createElement("div");
      coverContainer.style.position = "absolute";
      coverContainer.style.left = "-9999px";
      coverContainer.style.top = "0";
      coverContainer.style.width = "800px";
      coverContainer.style.minHeight = "1120px";
      coverContainer.style.backgroundColor = "#ffffff";
      coverContainer.style.color = "#1e293b";
      coverContainer.style.fontFamily = "'Inter', sans-serif";
      coverContainer.style.padding = "80px";
      
      coverContainer.innerHTML = `
        <h1 style="font-size: 48px; font-weight: 800; margin-bottom: 16px; color: #0f172a;">Documento de Código Unificado</h1>
        <p style="font-size: 18px; color: #64748b; margin-bottom: 64px;">Generado el ${new Date().toLocaleDateString()} • ${files.length} archivos</p>
        
        <h2 style="font-size: 24px; font-weight: 700; margin-bottom: 24px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">Índice de Archivos</h2>
        <ul style="list-style: none; padding: 0; margin: 0;">
          ${files.map((f, idx) => `
            <li style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f1f5f9;">
              <span style="font-weight: 500; font-family: 'JetBrains Mono', monospace; font-size: 14px;">${idx + 1}. ${f.name}</span>
              <span style="color: #64748b; font-size: 14px;">${getReadableLanguage(f.extension)} • ${(f.size / 1024).toFixed(1)} KB</span>
            </li>
          `).join('')}
        </ul>
      `;
      
      document.body.appendChild(coverContainer);
      const coverCanvas = await html2canvas(coverContainer, { scale: 1.5, logging: false });
      const coverImg = coverCanvas.toDataURL("image/jpeg", 0.9);
      const coverHeight = (coverCanvas.height * pdfWidth) / coverCanvas.width;
      
      pdf.addImage(coverImg, "JPEG", 0, 0, pdfWidth, coverHeight);
      document.body.removeChild(coverContainer);

      // 2. Process Files with Wrapper Approach (Fast & Accurate)
      const PAGE_WIDTH = 800;
      const LINE_HEIGHT = 21; // 14px * 1.5 line-height
      const PAGE_HEIGHT = Math.floor(1131 / LINE_HEIGHT) * LINE_HEIGHT; // 1113px (perfect A4 ratio multiple)
      
      const wrapper = document.createElement("div");
      wrapper.style.position = "fixed";
      wrapper.style.left = "-9999px";
      wrapper.style.top = "0";
      wrapper.style.width = `${PAGE_WIDTH}px`;
      wrapper.style.height = `${PAGE_HEIGHT}px`;
      wrapper.style.overflow = "hidden";
      wrapper.style.backgroundColor = "#1e1e1e";
      document.body.appendChild(wrapper);

      const content = document.createElement("div");
      content.style.position = "absolute";
      content.style.left = "0";
      content.style.top = "0";
      content.style.width = "100%";
      content.style.backgroundColor = "#1e1e1e";
      content.style.color = "#d4d4d4";
      content.style.fontFamily = "'JetBrains Mono', 'Fira Code', monospace";
      content.style.fontSize = "14px";
      content.style.lineHeight = "1.5";
      wrapper.appendChild(content);

      const style = document.createElement("style");
      style.innerHTML = `
        pre[class*="language-"], code[class*="language-"] {
          white-space: pre-wrap !important;
          word-break: break-word !important;
          overflow-wrap: break-word !important;
          margin: 0 !important;
          padding: 0 !important;
          background: transparent !important;
        }
      `;

      let totalFiles = files.length;
      
      for (let i = 0; i < totalFiles; i++) {
        const file = files[i];
        
        content.innerHTML = "";
        content.appendChild(style);
        
        const header = document.createElement("div");
        header.style.padding = "40px 40px 20px 40px";
        header.style.borderBottom = "1px solid #333";
        header.style.marginBottom = "20px";
        
        const title = document.createElement("h1");
        title.innerText = file.name;
        title.style.margin = "0";
        title.style.fontSize = "24px";
        title.style.color = "#ffffff";
        title.style.fontFamily = "'Inter', sans-serif";
        header.appendChild(title);

        const meta = document.createElement("p");
        meta.innerText = `${getReadableLanguage(file.extension)} • ${file.content.split('\n').length} líneas`;
        meta.style.margin = "8px 0 0 0";
        meta.style.fontSize = "14px";
        meta.style.color = "#888";
        meta.style.fontFamily = "'Inter', sans-serif";
        header.appendChild(meta);
        
        content.appendChild(header);

        const codePre = document.createElement("pre");
        codePre.className = `language-${file.language}`;
        codePre.style.padding = "0 40px 40px 40px";
        
        const codeBlock = document.createElement("code");
        codeBlock.className = `language-${file.language}`;
        codeBlock.textContent = file.content; // textContent preserves exact whitespace and prevents HTML injection
        
        codePre.appendChild(codeBlock);
        content.appendChild(codePre);

        // Highlight once per file (solves the "everything is commented" bug)
        Prism.highlightElement(codeBlock);

        // Wait for rendering
        await new Promise(resolve => setTimeout(resolve, 50));

        const totalHeight = content.scrollHeight;
        const pagesForFile = Math.ceil(totalHeight / PAGE_HEIGHT);

        for (let p = 0; p < pagesForFile; p++) {
          content.style.top = `-${p * PAGE_HEIGHT}px`;
          
          await new Promise(resolve => setTimeout(resolve, 10));

          const canvas = await html2canvas(wrapper, {
            backgroundColor: "#1e1e1e",
            scale: 1.5,
            logging: false,
            useCORS: true,
          });

          const imgData = canvas.toDataURL("image/jpeg", 0.8);
          const imgProps = pdf.getImageProperties(imgData);
          const renderHeight = (imgProps.height * pdfWidth) / imgProps.width;

          pdf.addPage();
          pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, renderHeight);
          
          setProgress(Math.round(((i + ((p + 1) / pagesForFile)) / totalFiles) * 100));
        }
      }

      document.body.removeChild(wrapper);
      pdf.save(`CodeContext_${new Date().getTime()}.pdf`);
      setProgress(100);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Hubo un error al generar el PDF. Por favor, intenta de nuevo.");
    } finally {
      setIsGenerating(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-blue-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
              Code2PDF
            </h1>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <a href="#" className="hover:text-slate-600 transition-colors">
              <Github className="w-5 h-5" />
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <motion.h2 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4"
          >
            Prepara tu código para la IA
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-slate-500 text-lg max-w-2xl mx-auto"
          >
            Une múltiples archivos en un solo PDF estructurado y con resaltado de sintaxis. 
            Perfecto para dar contexto completo a tus chats con IA.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 gap-8">
          {/* Upload Area */}
          <section>
            <FileUpload onFilesAdded={handleFilesAdded} />
            
            <div className="mt-4 flex items-start gap-2 text-xs text-slate-400 bg-slate-100 p-3 rounded-lg">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <p>
                Tus archivos se procesan localmente en tu navegador. 
                Nada se sube a ningún servidor externo.
              </p>
            </div>
          </section>

          {/* File List & Actions */}
          <section>
            <FileList 
              files={files} 
              onRemove={removeFile} 
              onMoveUp={moveUp} 
              onMoveDown={moveDown} 
            />

            {files.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 flex flex-col items-center gap-4"
              >
                <button
                  onClick={generatePDF}
                  disabled={isGenerating}
                  className={cn(
                    "w-full md:w-auto px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed",
                    isGenerating ? "bg-slate-800" : "hover:bg-slate-800 hover:-translate-y-1"
                  )}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span>Generando PDF ({progress}%)</span>
                    </>
                  ) : (
                    <>
                      <FileDown className="w-6 h-6" />
                      <span>Descargar PDF Unificado</span>
                    </>
                  )}
                </button>
                <p className="text-sm text-slate-400">
                  Se generará un PDF con {files.length} archivos formateados.
                </p>
              </motion.div>
            )}
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto py-12 border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-slate-400 text-sm">
            © 2026 Code2PDF. Herramienta de productividad para desarrolladores.
          </p>
        </div>
      </footer>

      {/* Loading Overlay for Mobile */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          >
            <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Generando Documento</h3>
              <p className="text-slate-500 mb-6">
                Estamos formateando y resaltando tu código. Esto puede tardar unos segundos...
              </p>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <motion.div 
                  className="bg-blue-600 h-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs font-mono text-slate-400 mt-2">{progress}% completado</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
