import DashboardPage from '@/pages/DashboardPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import NotFound from '@/pages/NotFound';
import type { ReactNode } from 'react';

export interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  visible?: boolean;
  /** Accessible without login. Routes without this flag require authentication. */
  public?: boolean;
  /** Only accessible when logged out. */
  publicOnly?: boolean;
}

export const routes: RouteConfig[] = [
  {
    name: 'Dashboard',
    path: '/',
    element: <DashboardPage />,
  },
  {
    name: 'Login',
    path: '/login',
    element: <LoginPage />,
    public: true,
    publicOnly: true,
  },
  {
    name: 'Register',
    path: '/register',
    element: <RegisterPage />,
    public: true,
    publicOnly: true,
  },
  {
    name: 'Not Found',
    path: '*',
    element: <NotFound />,
    public: true,
  },
];
