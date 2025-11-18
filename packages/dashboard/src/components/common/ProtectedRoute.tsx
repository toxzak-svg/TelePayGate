import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FullPageLoader } from './LoadingSpinner';

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <FullPageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
