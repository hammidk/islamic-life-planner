import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { parentPath } from '../utils/navigation';

/**
 * «Назад»: если внутри приложения уже был переход — шаг назад по истории,
 * иначе (открыли по прямой ссылке) — на родительский экран.
 */
export function useBack(): () => void {
  const navigate = useNavigate();
  const { key, pathname } = useLocation();
  return useCallback(() => {
    if (key !== 'default') navigate(-1);else
    navigate(parentPath(pathname), { replace: true });
  }, [key, pathname, navigate]);
}