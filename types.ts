
export interface FileNode {
  path: string;
  name: string;
  type: 'file' | 'folder';
  content?: string;
  children?: FileNode[];
}

export interface RefactorStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'completed' | 'current';
  filesAffected: string[];
}

export interface ApiResponseTemplate {
  success: boolean;
  data: any | null;
  error: {
    code: string;
    message: string;
  } | null;
}
