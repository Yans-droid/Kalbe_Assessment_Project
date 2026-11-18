namespace Tracklab.Api.Infrastructure;

public static class TokenCookieHelper
{
    private const string AccessCookie = "tracklab_access";
    private const string SessionCookie = "tracklab_session";
    private const string UserCookie = "tracklab_user";

    public static void SetCookies(HttpResponse response, string accessToken, string? sessionCookie, string username, bool isDev, int expiresInSeconds = 3600)
    {
        var opts = new CookieOptions
        {
            Path = "/",
            HttpOnly = true,
            SameSite = SameSiteMode.Lax,
            Secure = !isDev,
            Expires = DateTimeOffset.UtcNow.AddSeconds(expiresInSeconds)
        };

        response.Cookies.Append(AccessCookie, accessToken, opts);

        if (!string.IsNullOrEmpty(sessionCookie))
        {
            var sessionOpts = new CookieOptions
            {
                Path = "/",
                HttpOnly = true,
                SameSite = SameSiteMode.Strict,
                Secure = !isDev,
                Expires = DateTimeOffset.UtcNow.AddSeconds(expiresInSeconds)
            };
            response.Cookies.Append(SessionCookie, sessionCookie, sessionOpts);
        }

        var userOpts = new CookieOptions
        {
            Path = "/",
            HttpOnly = true,
            SameSite = SameSiteMode.Lax,
            Secure = !isDev,
            Expires = DateTimeOffset.UtcNow.AddSeconds(expiresInSeconds)
        };
        response.Cookies.Append(UserCookie, username, userOpts);
    }

    public static string? GetAccessToken(HttpRequest request)
        => request.Cookies[AccessCookie];

    public static string? GetSessionCookie(HttpRequest request)
        => request.Cookies[SessionCookie];

    public static string? GetUsername(HttpRequest request)
        => request.Cookies[UserCookie];

    public static void ClearCookies(HttpResponse response, bool isDev = false)
    {
        var deleteOpts = new CookieOptions
        {
            Path = "/",
            HttpOnly = true,
            SameSite = SameSiteMode.Lax,
            Secure = !isDev,
            Expires = DateTimeOffset.UtcNow.AddDays(-1)
        };
        response.Cookies.Delete(AccessCookie, deleteOpts);
        response.Cookies.Delete(UserCookie, deleteOpts);

        var sessionDeleteOpts = new CookieOptions
        {
            Path = "/",
            HttpOnly = true,
            SameSite = SameSiteMode.Strict,
            Secure = !isDev,
            Expires = DateTimeOffset.UtcNow.AddDays(-1)
        };
        response.Cookies.Delete(SessionCookie, sessionDeleteOpts);

        // Fallback delete with root path
        response.Cookies.Delete(AccessCookie, new CookieOptions { Path = "/" });
        response.Cookies.Delete(SessionCookie, new CookieOptions { Path = "/" });
        response.Cookies.Delete(UserCookie, new CookieOptions { Path = "/" });
    }
}
