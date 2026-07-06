import React, { useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import IntersectObserver from '@/components/common/IntersectObserver';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { RouteGuard } from '@/components/common/RouteGuard';
import { routes } from './routes';

const App: React.FC = () => {
  const routeElements = useMemo(() => {
    return routes.map((route, index) => {
      const element = route.publicOnly ? (
        <RouteGuard publicOnly>{route.element}</RouteGuard>
      ) : route.public ? (
        route.element
      ) : (
        <RouteGuard>{route.element}</RouteGuard>
      );
      return <Route key={index} path={route.path} element={element} />;
    });
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <Router>
          <IntersectObserver />
          <div className="flex min-h-screen w-full flex-col">
            <main className="flex-1 min-w-0">
              <Routes>{routeElements}</Routes>
            </main>
          </div>
          <Toaster />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
