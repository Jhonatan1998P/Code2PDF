import { FileText, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { FileWithContent, getReadableLanguage } from "@/src/lib/file-utils";
import { motion, AnimatePresence } from "motion/react";

interface FileListProps {
  files: FileWithContent[];
  onRemove: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
}

export default function FileList({ files, onRemove, onMoveUp, onMoveDown }: FileListProps) {
  if (files.length === 0) return null;

  return (
    <div className="space-y-3 mt-6">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
        Archivos seleccionados ({files.length})
      </h3>
      <AnimatePresence mode="popLayout">
        {files.map((file, index) => (
          <motion.div
            key={file.id}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow group"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
              <p className="text-xs text-gray-500">{getReadableLanguage(file.extension)} • {(file.size / 1024).toFixed(1)} KB</p>
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onMoveUp(file.id)}
                disabled={index === 0}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                title="Mover arriba"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
              <button
                onClick={() => onMoveDown(file.id)}
                disabled={index === files.length - 1}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                title="Mover abajo"
              >
                <ArrowDown className="w-4 h-4" />
              </button>
              <button
                onClick={() => onRemove(file.id)}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                title="Eliminar"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
