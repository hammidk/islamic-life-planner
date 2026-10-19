/** Родительский экран — куда ведёт «назад», если внутри приложения ещё не было переходов */
export function parentPath(pathname: string): string {
  if (pathname === '/profile') return '/';
  if (pathname === '/settings/prayers') return '/settings';
  if (pathname === '/settings' || pathname === '/history') return '/profile';
  if (pathname === '/tasks/stats') return '/journal';
  if (pathname.startsWith('/journal/')) return '/journal';
  if (pathname === '/today' || pathname.startsWith('/today/') || pathname.startsWith('/day/')) {
    return '/week';
  }
  if (pathname.startsWith('/sphere/') || pathname.startsWith('/task/')) return '/';
  return '/';
}