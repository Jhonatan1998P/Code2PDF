export interface FileWithContent {
  id: string;
  name: string;
  content: string;
  extension: string;
  language: string;
  size: number;
}

export const getLanguageFromExtension = (extension: string): string => {
  const mapping: Record<string, string> = {
    'js': 'javascript',
    'ts': 'typescript',
    'tsx': 'tsx',
    'jsx': 'jsx',
    'html': 'html',
    'css': 'css',
    'md': 'markdown',
    'php': 'php',
    'txt': 'text',
    'json': 'json',
  };
  return mapping[extension.toLowerCase()] || 'text';
};

export const getReadableLanguage = (extension: string): string => {
  const mapping: Record<string, string> = {
    'js': 'JavaScript',
    'ts': 'TypeScript',
    'tsx': 'TypeScript React',
    'jsx': 'JavaScript React',
    'html': 'HTML',
    'css': 'CSS',
    'md': 'Markdown',
    'php': 'PHP',
    'txt': 'Plain Text',
    'json': 'JSON',
  };
  return mapping[extension.toLowerCase()] || 'Generic Text';
};

export const readFileContent = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
};
