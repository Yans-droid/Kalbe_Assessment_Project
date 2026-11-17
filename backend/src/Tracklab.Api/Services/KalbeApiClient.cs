using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using Tracklab.Api.Infrastructure;
using Tracklab.Api.Models;

namespace Tracklab.Api.Services;

public class KalbeApiClient
{
    private readonly HttpClient _httpClient;
    private readonly KalbeSettings _settings;
    private readonly ILogger<KalbeApiClient> _logger;

    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true
    };

    public KalbeApiClient(HttpClient httpClient, IOptions<KalbeSettings> settings, ILogger<KalbeApiClient> logger)
    {
        _httpClient = httpClient;
        _settings = settings.Value;
        _logger = logger;
    }

    private string AuthPath(string subpath) =>
        $"{(_settings.PathAuthentication ?? "/api/v1/authentication").TrimEnd('/')}/{subpath.TrimStart('/')}";

    private string FeaturePath(string subpath) =>
        $"{(_settings.PathFeature ?? "/api/v1/feature").TrimEnd('/')}/{subpath.TrimStart('/')}";

    private void AddAppHeaders(HttpRequestMessage req)
    {
        req.Headers.TryAddWithoutValidation("app_id", _settings.AppId);
        req.Headers.TryAddWithoutValidation("app_key", _settings.AppKey);
    }

    /// <summary>
    /// Two-step login: POST /auth/login with CookieContainer, capture session cookie.
    /// Returns (loginData, sessionCookie).
    /// </summary>
    public async Task<(KalbeLoginData? loginData, string? sessionCookie)> LoginAsync(string user, string password)
    {
        var cookieContainer = new CookieContainer();
        var handler = new HttpClientHandler
        {
            CookieContainer = cookieContainer,
            UseCookies = true,
            AllowAutoRedirect = true
        };

        using var client = new HttpClient(handler) { BaseAddress = new Uri(_settings.BaseUrl), Timeout = TimeSpan.FromSeconds(15) };

        var body = JsonSerializer.Serialize(new
        {
            user,
            password,
            appCode = "ASSESSMENT",
            moduleCode = "ALL"
        }, _jsonOptions);

        var req = new HttpRequestMessage(HttpMethod.Post, AuthPath("auth/login"))
        {
            Content = new StringContent(body, Encoding.UTF8, "application/json")
        };
        req.Headers.TryAddWithoutValidation("app_id", _settings.AppId);
        req.Headers.TryAddWithoutValidation("app_key", _settings.AppKey);

        var resp = await client.SendAsync(req);
        resp.EnsureSuccessStatusCode();

        var json = await resp.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<KalbeResponse<KalbeLoginData>>(json, _jsonOptions);

        // Capture session cookie
        var uri = new Uri(_settings.BaseUrl);
        var cookies = cookieContainer.GetCookies(uri);
        var sessionCookie = cookies.Count > 0
            ? string.Join("; ", cookies.Cast<Cookie>().Select(c => $"{c.Name}={c.Value}"))
            : null;

        return (result?.Data, sessionCookie);
    }

    /// <summary>
    /// Refresh token: GET /auth/token/refresh?refreshAuthorization=true
    /// </summary>
    public async Task<KalbeTokenData?> RefreshTokenAsync(string accessToken, string? sessionCookie)
    {
        var req = new HttpRequestMessage(HttpMethod.Get, AuthPath("auth/token/refresh?refreshAuthorization=true"));
        AddAppHeaders(req);
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        if (!string.IsNullOrEmpty(sessionCookie))
            req.Headers.TryAddWithoutValidation("Cookie", sessionCookie);

        var resp = await _httpClient.SendAsync(req);
        resp.EnsureSuccessStatusCode();

        var json = await resp.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<KalbeResponse<KalbeTokenData>>(json, _jsonOptions);
        return result?.Data;
    }

    /// <summary>
    /// Logout: POST /auth/logout
    /// </summary>
    public async Task LogoutAsync(string user, string accessToken)
    {
        var body = JsonSerializer.Serialize(new { user }, _jsonOptions);
        var req = new HttpRequestMessage(HttpMethod.Post, AuthPath("auth/logout"))
        {
            Content = new StringContent(body, Encoding.UTF8, "application/json")
        };
        AddAppHeaders(req);
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        try { await _httpClient.SendAsync(req); } catch { /* best-effort */ }
    }

    /// <summary>
    /// Generic paged GET: GET /{entity}/paging/advance
    /// </summary>
    public async Task<KalbePagingData<T>?> GetPagedAsync<T>(string entity, PagingQuery query, string accessToken, IReadOnlySet<string> allowedSortFields)
    {
        var req = new HttpRequestMessage(HttpMethod.Get, $"{FeaturePath(entity)}/paging/advance");
        AddAppHeaders(req);
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        PagingHeaderBuilder.Apply(req, query, allowedSortFields);

        var resp = await _httpClient.SendAsync(req);
        resp.EnsureSuccessStatusCode();

        var json = await resp.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<KalbeResponse<KalbePagingData<T>>>(json, _jsonOptions);
        return result?.Data;
    }

    /// <summary>
    /// Get single: GET /{entity}/{id}
    /// </summary>
    public async Task<T?> GetByIdAsync<T>(string entity, Guid id, string accessToken)
    {
        var req = new HttpRequestMessage(HttpMethod.Get, $"{FeaturePath(entity)}/{id}");
        AddAppHeaders(req);
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var resp = await _httpClient.SendAsync(req);
        resp.EnsureSuccessStatusCode();

        var json = await resp.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<KalbeResponse<T>>(json, _jsonOptions);
        return result!.Data;
    }

    /// <summary>
    /// Create: POST /{entity}
    /// </summary>
    public async Task<T?> CreateAsync<T>(string entity, object body, string accessToken)
    {
        var bodyJson = JsonSerializer.Serialize(body, _jsonOptions);
        var req = new HttpRequestMessage(HttpMethod.Post, FeaturePath(entity))
        {
            Content = new StringContent(bodyJson, Encoding.UTF8, "application/json")
        };
        AddAppHeaders(req);
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var resp = await _httpClient.SendAsync(req);
        resp.EnsureSuccessStatusCode();

        var json = await resp.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<KalbeResponse<T>>(json, _jsonOptions);
        return result!.Data;
    }

    /// <summary>
    /// Update: PUT /{entity}
    /// </summary>
    public async Task<T?> UpdateAsync<T>(string entity, object body, string accessToken)
    {
        var bodyJson = JsonSerializer.Serialize(body, _jsonOptions);
        var req = new HttpRequestMessage(HttpMethod.Put, FeaturePath(entity))
        {
            Content = new StringContent(bodyJson, Encoding.UTF8, "application/json")
        };
        AddAppHeaders(req);
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var resp = await _httpClient.SendAsync(req);
        resp.EnsureSuccessStatusCode();

        var json = await resp.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<KalbeResponse<T>>(json, _jsonOptions);
        return result!.Data;
    }

    /// <summary>
    /// Delete (soft): DELETE /{entity} with body
    /// </summary>
    public async Task DeleteAsync(string entity, Guid id, string deletedBy, string accessToken)
    {
        var bodyJson = JsonSerializer.Serialize(new { id, deletedBy, doHardDelete = false }, _jsonOptions);
        var req = new HttpRequestMessage(HttpMethod.Delete, FeaturePath(entity))
        {
            Content = new StringContent(bodyJson, Encoding.UTF8, "application/json")
        };
        AddAppHeaders(req);
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var resp = await _httpClient.SendAsync(req);
        resp.EnsureSuccessStatusCode();
    }
}
