using Microsoft.AspNetCore.Mvc;
using Tracklab.Api.Infrastructure;
using Tracklab.Api.Models;
using Tracklab.Api.Services;

namespace Tracklab.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AuthService _auth;
    private readonly IWebHostEnvironment _env;
    private readonly ILogger<AuthController> _logger;

    public AuthController(AuthService auth, IWebHostEnvironment env, ILogger<AuthController> logger)
    {
        _auth = auth;
        _env = env;
        _logger = logger;
    }

    [HttpPost("login")]
    [Microsoft.AspNetCore.RateLimiting.EnableRateLimiting("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        try
        {
            var result = await _auth.TwoStepLoginAsync(req.User, req.Password);

            TokenCookieHelper.SetCookies(
                Response,
                result.AccessToken,
                result.SessionCookie,
                result.Username,
                _env.IsDevelopment(),
                result.ExpiresIn);

            return Ok(new { username = result.Username });
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Login failed for user {User}: {Msg}", req.User, ex.Message);
            // Generic message — do not differentiate user vs password error
            return Unauthorized(new { message = "Invalid credentials." });
        }
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        var accessToken = TokenCookieHelper.GetAccessToken(Request);
        var username = TokenCookieHelper.GetUsername(Request) ?? "unknown";

        try
        {
            if (!string.IsNullOrEmpty(accessToken))
                await _auth.LogoutAsync(username, accessToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Upstream logout failed or token already invalid: {Msg}", ex.Message);
        }
        finally
        {
            TokenCookieHelper.ClearCookies(Response, _env.IsDevelopment());
        }

        return Ok(new { message = "Logged out." });
    }

    [HttpGet("me")]
    public IActionResult Me()
    {
        var accessToken = TokenCookieHelper.GetAccessToken(Request);
        var username = TokenCookieHelper.GetUsername(Request);

        if (string.IsNullOrEmpty(accessToken) || string.IsNullOrEmpty(username))
        {
            TokenCookieHelper.ClearCookies(Response, _env.IsDevelopment());
            return Unauthorized(new { message = "Not authenticated." });
        }

        return Ok(new { username });
    }
}
