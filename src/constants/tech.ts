import { ProjectCategory, ProjectStatus, DeveloperSpecialty } from '../types';

export const POPULAR_TECHNOLOGIES = [
  'Rust',
  'Python',
  'TypeScript',
  'Go',
  'React',
  'Next.js',
  'PyTorch',
  'CUDA',
  'PostgreSQL',
  'Redis',
  'FastAPI',
  'Docker',
  'WebAssembly',
  'Tailwind CSS',
  'GraphQL',
  'Swift',
  'Kotlin',
  'Tauri',
  'Svelte',
  'Elixir',
] as const;

export const PROJECT_CATEGORIES: { id: ProjectCategory; label: string }[] = [
  { id: 'AI', label: 'AI & Inference' },
  { id: 'Systems', label: 'Systems & Kernels' },
  { id: 'Web', label: 'Web & Tooling' },
  { id: 'Mobile', label: 'Mobile & Native' },
  { id: 'Open Source', label: 'Open Source Core' },
  { id: 'Data', label: 'Data & Distributed' },
];

export const PROJECT_STATUSES: { id: ProjectStatus; label: string; badgeClass: string }[] = [
  { id: 'active', label: 'Active', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'beta', label: 'Beta', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'alpha', label: 'Alpha', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'shipped', label: 'Shipped', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'archived', label: 'Archived', badgeClass: 'bg-slate-100 text-slate-600 border-slate-200' },
];

export const DEVELOPER_SPECIALTIES: DeveloperSpecialty[] = [
  'AI',
  'Systems',
  'Rust',
  'Frontend',
  'Backend',
  'Open Source',
  'Mobile',
  'DevOps',
];
