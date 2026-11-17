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
                HttpOnly = true,
                SameSite = SameSiteMode.Strict,
                Secure = !isDev,
                Expires = DateTimeOffset.UtcNow.AddSeconds(expiresInSeconds)
            };
            response.Cookies.Append(SessionCookie, sessionCookie, sessionOpts);
        }

        var userOpts = new CookieOptions
        {
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

    public static void ClearCookies(HttpResponse response)
    {
        response.Cookies.Delete(AccessCookie);
        response.Cookies.Delete(SessionCookie);
        response.Cookies.Delete(UserCookie);
    }
}
