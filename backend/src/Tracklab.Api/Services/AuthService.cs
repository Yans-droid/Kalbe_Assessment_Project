using Tracklab.Api.Models;

namespace Tracklab.Api.Services;

public class AuthResult
{
    public string AccessToken { get; set; } = string.Empty;
    public string? SessionCookie { get; set; }
    public string Username { get; set; } = string.Empty;
    public int ExpiresIn { get; set; }
}

public class AuthService
{
    private readonly KalbeApiClient _kalbeClient;
    private readonly ILogger<AuthService> _logger;

    public AuthService(KalbeApiClient kalbeClient, ILogger<AuthService> logger)
    {
        _kalbeClient = kalbeClient;
        _logger = logger;
    }

    /// <summary>
    /// Two-step login: POST /auth/login → GET /auth/token/refresh
    /// Returns the final access token and session cookie.
    /// </summary>
    public async Task<AuthResult> TwoStepLoginAsync(string user, string password)
    {
        _logger.LogInformation("Two-step login initiated for user {User}", user);

        var (loginData, sessionCookie) = await _kalbeClient.LoginAsync(user, password);

        if (loginData?.Token == null)
            throw new InvalidOperationException("Login failed: no token returned from Kalbe API.");

        // Step 2: immediately refresh to get the proper feature-access token
        var refreshed = await _kalbeClient.RefreshTokenAsync(loginData.Token.Access, sessionCookie);

        if (refreshed == null)
            throw new InvalidOperationException("Two-step refresh failed.");

        _logger.LogInformation("Two-step login succeeded for user {User}", user);

        return new AuthResult
        {
            AccessToken = refreshed.Access,
            SessionCookie = sessionCookie,
            Username = loginData.Username,
            ExpiresIn = refreshed.ExpiresIn
        };
    }

    /// <summary>
    /// Refresh an existing access token using session cookie.
    /// </summary>
    public async Task<KalbeTokenData?> RefreshAsync(string accessToken, string? sessionCookie)
    {
        return await _kalbeClient.RefreshTokenAsync(accessToken, sessionCookie);
    }

    /// <summary>
    /// Logout from upstream.
    /// </summary>
    public async Task LogoutAsync(string user, string accessToken)
    {
        await _kalbeClient.LogoutAsync(user, accessToken);
        _logger.LogInformation("User {User} logged out", user);
    }
}
