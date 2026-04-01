import { useCallback, useEffect } from "react";
import { FileDown, Loader2, Sparkles, Github, Info, Moon, Sun } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { readFileContent, FileWithContent } from "@/src/lib/file-utils";
import { formatContentByExtension } from "@/src/lib/formatter";
import FileUpload from "@/src/components/FileUpload";
import FileList from "@/src/components/FileList";
import { cn } from "@/src/lib/utils";
import { buildFileWithContent, useAppStore } from "@/src/store/app-store";

interface ProcessedFile {
  name: string;
  language: string;
  sizeKb: string;
  pages: string[][];
}

function waitForNextFrame() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

function preprocessInWorker(
  files: FileWithContent[],
  maxCharsPerLine: number,
  linesPerPage: number,
  onProgress: (value: number) => void,
): Promise<ProcessedFile[]> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./workers/pdf-preprocess.worker.ts", import.meta.url), {
      type: "module",
    });

    worker.onmessage = (event: MessageEvent) => {
      const message = event.data;

      if (message?.type === "progress" && typeof message.value === "number") {
        onProgress(Math.max(35, Math.min(70, 35 + Math.round((message.value / 60) * 35))));
      }

      if (message?.type === "done") {
        worker.terminate();
        resolve((message.files || []) as ProcessedFile[]);
      }
    };

    worker.onerror = (event) => {
      worker.terminate();
      reject(event.error || new Error("Worker error while preprocessing files"));
    };

    worker.postMessage({
      type: "preprocess",
      files,
      maxCharsPerLine,
      linesPerPage,
    });
  });
}

async function formatFilesForExport(
  files: FileWithContent[],
  onProgress: (value: number) => void,
): Promise<FileWithContent[]> {
  const total = files.length;
  const formatted: FileWithContent[] = [];

  for (let i = 0; i < total; i += 1) {
    const file = files[i];
    const content = await formatContentByExtension(file.content, file.extension);
    formatted.push({
      ...file,
      content,
    });

    const value = Math.round(((i + 1) / total) * 30);
    onProgress(Math.max(5, value));

    if ((i + 1) % 2 === 0) {
      await waitForNextFrame();
    }
  }

  return formatted;
}

export default function App() {
  const files = useAppStore((state) => state.files);
  const isGenerating = useAppStore((state) => state.isGenerating);
  const progress = useAppStore((state) => state.progress);
  const addProcessedFiles = useAppStore((state) => state.addProcessedFiles);
  const removeFile = useAppStore((state) => state.removeFile);
  const moveFileUp = useAppStore((state) => state.moveFileUp);
  const moveFileDown = useAppStore((state) => state.moveFileDown);
  const setGenerating = useAppStore((state) => state.setGenerating);
  const setProgress = useAppStore((state) => state.setProgress);
  const clearProgress = useAppStore((state) => state.clearProgress);
  const theme = useAppStore((state) => state.theme);
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  const exportMode = useAppStore((state) => state.exportMode);
  const setExportMode = useAppStore((state) => state.setExportMode);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem("code2pdf-theme", theme);
  }, [theme]);

  const handleFilesAdded = useCallback(
    async (newFiles: File[]) => {
      const processedFiles = await Promise.all(
        newFiles.map(async (file) => {
          const content = await readFileContent(file);
          return buildFileWithContent(file, content);
        }),
      );

      addProcessedFiles(processedFiles);
    },
    [addProcessedFiles],
  );

  const generatePDF = async () => {
    if (files.length === 0) {
      return;
    }

    setGenerating(true);
    setProgress(1);

    try {
      const filesForExport = exportMode === "fast" ? await formatFilesForExport(files, setProgress) : files;
      if (exportMode === "faithful") {
        setProgress(35);
      }
      const [{ jsPDF }] = await Promise.all([import("jspdf")]);

      const pdf = new jsPDF({
        orientation: "p",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 12;
      const lineHeight = 4.2;

      pdf.setFont("courier", "normal");
      pdf.setFontSize(9);
      const charWidth = Math.max(1, pdf.getTextWidth("M"));
      const maxCharsPerLine = Math.max(50, Math.floor((pageWidth - margin * 2) / charWidth));
      const linesPerPage = Math.max(20, Math.floor((pageHeight - 28) / lineHeight));

      const processedFiles = await preprocessInWorker(filesForExport, maxCharsPerLine, linesPerPage, setProgress);
      if (processedFiles.length === 0) {
        throw new Error("No files to export");
      }

      const totalCodePages = processedFiles.reduce((acc, file) => acc + file.pages.length, 0);
      const indexEntriesPerPage = 34;
      const indexPages = Math.max(1, Math.ceil(processedFiles.length / indexEntriesPerPage));

      let nextStartPage = 2 + indexPages;
      const fileStartPages = processedFiles.map((file) => {
        const start = nextStartPage;
        nextStartPage += file.pages.length;
        return start;
      });

      pdf.setFillColor(248, 250, 252);
      pdf.rect(0, 0, pageWidth, pageHeight, "F");
      pdf.setTextColor(15, 23, 42);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(26);
      pdf.text("Documento Unificado de Codigo", margin, 28);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(12);
      pdf.setTextColor(71, 85, 105);
      pdf.text(`Generado el ${new Date().toLocaleDateString()} con ${filesForExport.length} archivos`, margin, 38);

      pdf.setTextColor(30, 41, 59);
      pdf.setFontSize(11);
      pdf.text("Este documento fue optimizado para velocidad y legibilidad.", margin, 50);
      pdf.text("Incluye numeracion de lineas y paginacion por archivo.", margin, 57);

      for (let page = 0; page < indexPages; page += 1) {
        pdf.addPage();
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(16);
        pdf.setTextColor(15, 23, 42);
        pdf.text(page === 0 ? "Indice de archivos" : "Indice de archivos (continuacion)", margin, 18);

        let y = 28;
        const sliceStart = page * indexEntriesPerPage;
        const slice = processedFiles.slice(sliceStart, sliceStart + indexEntriesPerPage);

        pdf.setFont("courier", "normal");
        pdf.setFontSize(10);
        pdf.setTextColor(51, 65, 85);

        slice.forEach((file, localIndex) => {
          const globalIndex = sliceStart + localIndex;
          const displayName = file.name.length > 62 ? `${file.name.slice(0, 59)}...` : file.name;
          const label = `${String(globalIndex + 1).padStart(2, "0")}. ${displayName}`;
          const detail = `${file.language} | ${file.sizeKb} KB | p.${fileStartPages[globalIndex]}`;

          pdf.text(label, margin, y);
          pdf.text(detail, pageWidth - margin, y, { align: "right" });
          y += 7;
        });
      }

      let renderedCodePages = 0;
      for (let i = 0; i < processedFiles.length; i += 1) {
        const file = processedFiles[i];

        for (let pageIndex = 0; pageIndex < file.pages.length; pageIndex += 1) {
          pdf.addPage();
          pdf.setFillColor(248, 250, 252);
          pdf.rect(0, 0, pageWidth, pageHeight, "F");

          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(11);
          pdf.setTextColor(15, 23, 42);
          pdf.text(file.name, margin, 12);

          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(9);
          pdf.setTextColor(71, 85, 105);
          pdf.text(
            `${file.language} | Seccion ${pageIndex + 1}/${file.pages.length}`,
            pageWidth - margin,
            12,
            { align: "right" },
          );

          pdf.setDrawColor(226, 232, 240);
          pdf.line(margin, 14, pageWidth - margin, 14);

          pdf.setFont("courier", "normal");
          pdf.setFontSize(9);
          pdf.setTextColor(30, 41, 59);

          let y = 20;
          file.pages[pageIndex].forEach((line) => {
            pdf.text(line, margin, y);
            y += lineHeight;
          });

          renderedCodePages += 1;
          const renderProgress = 60 + Math.round((renderedCodePages / totalCodePages) * 40);
          setProgress(Math.min(100, renderProgress));

          if (renderedCodePages % 4 === 0) {
            await waitForNextFrame();
          }
        }
      }

      pdf.save(`CodeContext_${Date.now()}.pdf`);
      setProgress(100);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("No pudimos generar el PDF. Revisa los archivos y vuelve a intentar.");
    } finally {
      setGenerating(false);
      setTimeout(() => clearProgress(), 800);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-blue-100 dark:bg-slate-950 dark:text-slate-100 dark:selection:bg-blue-900/40">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 dark:bg-slate-900 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400">
              Code2PDF
            </h1>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <button
              onClick={toggleTheme}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              aria-label="Cambiar tema"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {theme === "dark" ? "Claro" : "Oscuro"}
            </button>
            <a href="#" className="hover:text-slate-600 transition-colors" aria-label="Repositorio">
              <Github className="w-5 h-5" />
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        <div className="text-center mb-12">
          <motion.h2
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4 dark:text-slate-100"
          >
            Prepara tu codigo para documentarlo
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-slate-500 text-lg max-w-2xl mx-auto dark:text-slate-300"
          >
            Une multiples archivos en un PDF estructurado y veloz de generar,
            incluso con miles de lineas de codigo.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 gap-8">
          <section>
            <FileUpload onFilesAdded={handleFilesAdded} />

            <div className="mt-4 flex items-start gap-2 text-xs text-slate-400 bg-slate-100 p-3 rounded-lg dark:bg-slate-900 dark:text-slate-300">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <p>
                Tus archivos se procesan localmente en tu navegador. Nada se sube a servidores externos.
              </p>
            </div>
          </section>

          <section>
            <FileList files={files} onRemove={removeFile} onMoveUp={moveFileUp} onMoveDown={moveFileDown} />

            {files.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 flex flex-col items-center gap-4"
              >
                <div className="flex items-center rounded-xl border border-slate-200 p-1 dark:border-slate-700">
                  <button
                    onClick={() => setExportMode("fast")}
                    className={cn(
                      "px-3 py-1.5 text-sm rounded-lg transition-colors",
                      exportMode === "fast"
                        ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
                    )}
                  >
                    Rapido
                  </button>
                  <button
                    onClick={() => setExportMode("faithful")}
                    className={cn(
                      "px-3 py-1.5 text-sm rounded-lg transition-colors",
                      exportMode === "faithful"
                        ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
                    )}
                  >
                    Fiel al origen
                  </button>
                </div>

                <button
                  onClick={generatePDF}
                  disabled={isGenerating}
                  className={cn(
                    "w-full md:w-auto px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed",
                    isGenerating ? "bg-slate-800" : "hover:bg-slate-800 hover:-translate-y-1",
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
                <p className="text-sm text-slate-400 dark:text-slate-300">
                  Modo {exportMode === "fast" ? "Rapido" : "Fiel al origen"}. Se exportaran {files.length} archivos.
                </p>
              </motion.div>
            )}
          </section>
        </div>
      </main>

      <footer className="mt-auto py-12 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-slate-400 text-sm dark:text-slate-400">© 2026 Code2PDF. Herramienta de productividad para desarrolladores.</p>
        </div>
      </footer>

      <AnimatePresence>
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          >
            <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center dark:bg-slate-900">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 dark:bg-slate-800">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2 dark:text-slate-100">Generando Documento</h3>
              <p className="text-slate-500 mb-6 dark:text-slate-300">
                Procesamos el contenido en segundo plano para mantener la interfaz responsiva.
              </p>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden dark:bg-slate-700">
                <motion.div className="bg-blue-600 h-full" initial={{ width: 0 }} animate={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs font-mono text-slate-400 mt-2 dark:text-slate-300">{progress}% completado</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
