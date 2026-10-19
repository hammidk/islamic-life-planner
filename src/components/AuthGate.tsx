import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LiveDataProvider } from '../contexts/LiveDataContext';
import { LoadingScreen } from './LoadingScreen';
import { UserDataGate } from './UserDataGate';
import { AuthScreen } from '../pages/AuthScreen';

/** Без сессии — экран входа; с сессией — данные пользователя и приложение */
export function AuthGate({ children }: {children: React.ReactNode;}) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <AuthScreen />;

  return (
    <LiveDataProvider>
      <UserDataGate userId={user.id}>{children}</UserDataGate>
    </LiveDataProvider>);

}