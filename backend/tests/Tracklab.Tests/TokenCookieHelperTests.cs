using Microsoft.AspNetCore.Http;
using Tracklab.Api.Infrastructure;

namespace Tracklab.Tests;

public class TokenCookieHelperTests
{
    [Fact]
    public void SetAndGetCookies_RoundTrips()
    {
        var httpContext = new DefaultHttpContext();

        TokenCookieHelper.SetCookies(
            httpContext.Response,
            accessToken: "test-access-token",
            sessionCookie: "session=abc123",
            username: "assessment.it",
            isDev: true,
            expiresInSeconds: 3600);

        // Simulate browser sending cookies back by reading Set-Cookie headers
        var setCookieHeaders = httpContext.Response.Headers.SetCookie;
        Assert.Contains(setCookieHeaders, h => h!.Contains("tracklab_access=test-access-token"));
        Assert.Contains(setCookieHeaders, h => h!.Contains("tracklab_session="));
        Assert.Contains(setCookieHeaders, h => h!.Contains("tracklab_user=assessment.it"));

        // Verify httponly is set
        Assert.Contains(setCookieHeaders, h => h!.Contains("httponly"));
    }

    [Fact]
    public void ClearCookies_DeletesAll()
    {
        var httpContext = new DefaultHttpContext();

        TokenCookieHelper.ClearCookies(httpContext.Response);

        var setCookieHeaders = httpContext.Response.Headers.SetCookie;
        // Clear sets expiration in the past
        Assert.True(setCookieHeaders.Count >= 3, "Should delete all 3 cookies");
    }

    [Fact]
    public void GetAccessToken_ReturnsNull_WhenNoCookie()
    {
        var httpContext = new DefaultHttpContext();
        var result = TokenCookieHelper.GetAccessToken(httpContext.Request);
        Assert.Null(result);
    }

    [Fact]
    public void GetUsername_ReturnsNull_WhenNoCookie()
    {
        var httpContext = new DefaultHttpContext();
        var result = TokenCookieHelper.GetUsername(httpContext.Request);
        Assert.Null(result);
    }
}
