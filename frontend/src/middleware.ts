import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('tracklab_access');
  const isLoginPage = request.nextUrl.pathname === '/login';

  if (isLoginPage) {
    const isExpiredOrLogout =
      request.nextUrl.searchParams.has('expired') ||
      request.nextUrl.searchParams.has('logout');

    if (isExpiredOrLogout) {
      const response = NextResponse.next();
      response.cookies.delete('tracklab_access');
      response.cookies.delete('tracklab_session');
      response.cookies.delete('tracklab_user');
      return response;
    }

    if (token) {
      return NextResponse.redirect(new URL('/trackers', request.url));
    }

    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
