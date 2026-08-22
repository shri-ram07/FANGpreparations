import { createBrowserRouter } from 'react-router'
import { AppShell } from '@/components/AppShell'
import { RouteError } from '@/components/RouteError'
import Dashboard from '@/routes/dashboard'

// Dashboard is the ONLY eager route — it must first-paint from the main chunk
// with zero async work. Everything else is a lazy route chunk.
export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'subjects', lazy: () => import('./routes/subjects') },
      { path: 'subject/:subjectId', lazy: () => import('./routes/subject') },
      { path: 'subject/:subjectId/:moduleId', lazy: () => import('./routes/module') },
      { path: 'practice', lazy: () => import('./routes/practice') },
      { path: 'review', lazy: () => import('./routes/review') },
      { path: 'interview', lazy: () => import('./routes/interview') },
      { path: 'revision', lazy: () => import('./routes/revision') },
      { path: 'playground/sql', lazy: () => import('./routes/sql-playground') },
      { path: 'roadmap', lazy: () => import('./routes/roadmap') },
      ...(import.meta.env.DEV ? [{ path: 'dev/interactives', lazy: () => import('./routes/dev-interactives') }] : []),
    ],
  },
], {
  // Vite's BASE_URL is '/' locally and '/FANGpreparations/' on GitHub Pages;
  // react-router wants it without the trailing slash.
  basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/',
})
