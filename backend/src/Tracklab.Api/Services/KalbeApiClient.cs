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
        if (!resp.IsSuccessStatusCode)
        {
            var errJson = await resp.Content.ReadAsStringAsync();
            _logger.LogError("Kalbe API RefreshToken failed with {Status}: {Body}", resp.StatusCode, errJson);
            throw new HttpRequestException($"Kalbe upstream returned {resp.StatusCode}: {errJson}", null, resp.StatusCode);
        }

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
    /// Generic paged GET: GET /{entity}/paging/advance with intelligent multi-strategy retry and graceful fallback
    /// </summary>
    public async Task<KalbePagingData<T>?> GetPagedAsync<T>(string entity, PagingQuery query, string accessToken, IReadOnlySet<string> allowedSortFields)
    {
        var hasFilter = !string.IsNullOrWhiteSpace(query.IncludeRaw) || query.Include is { Count: > 0 };

        // 1. Try standard request with PagingHeaderBuilder
        var req = CreatePagedRequest(entity, query, accessToken, allowedSortFields);
        var resp = await _httpClient.SendAsync(req);

        if (resp.IsSuccessStatusCode)
        {
            var json = await resp.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<KalbeResponse<KalbePagingData<T>>>(json, _jsonOptions);
            return result?.Data;
        }

        var errJson = await resp.Content.ReadAsStringAsync();
        _logger.LogWarning("Kalbe API {Entity} paging failed with {Status}: {Body}", entity, resp.StatusCode, errJson);

        // If not 500 or no filter was passed, throw directly as normal
        if (resp.StatusCode != HttpStatusCode.InternalServerError || !hasFilter)
        {
            throw new HttpRequestException($"Kalbe upstream returned {resp.StatusCode}: {errJson}", null, resp.StatusCode);
        }

        // Parse filters
        var parsedFilters = ParseFilters(query.IncludeRaw, query.Include);

        // 2. If 500 occurred with filter, try variation: PascalCase headers without extra flags
        try
        {
            var altInclude = BuildPascalCaseInclude(parsedFilters);
            if (!string.IsNullOrWhiteSpace(altInclude))
            {
                var altQuery = new PagingQuery
                {
                    Page = query.Page,
                    PageSize = query.PageSize,
                    Search = query.Search,
                    SortBy = query.SortBy,
                    SortOrder = query.SortOrder,
                    Operator = null,
                    IncludeRaw = altInclude
                };
                var altReq = CreatePagedRequest(entity, altQuery, accessToken, allowedSortFields, omitExtraHeaders: true);
                var altResp = await _httpClient.SendAsync(altReq);
                if (altResp.IsSuccessStatusCode)
                {
                    var altJson = await altResp.Content.ReadAsStringAsync();
                    var altResult = JsonSerializer.Deserialize<KalbeResponse<KalbePagingData<T>>>(altJson, _jsonOptions);
                    _logger.LogInformation("Kalbe API {Entity} paging succeeded with PascalCase include filter", entity);
                    return altResult?.Data;
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "PascalCase include filter attempt failed");
        }

        // 3. Graceful Fallback: Upstream server returned 500 on X-Paging-Include.
        // Fetch base data without the filter header and perform in-memory filtering.
        _logger.LogWarning("Kalbe API {Entity} advance filter returned 500; executing graceful fallback with BFF post-filtering", entity);

        var fallbackQuery = new PagingQuery
        {
            Page = 1,
            PageSize = 100, // retrieve full set from Kalbe upstream (~20-50 items)
            Search = query.Search,
            SortBy = query.SortBy,
            SortOrder = query.SortOrder
        };
        var fallbackReq = CreatePagedRequest(entity, fallbackQuery, accessToken, allowedSortFields);
        var fallbackResp = await _httpClient.SendAsync(fallbackReq);
        if (!fallbackResp.IsSuccessStatusCode)
        {
            var fbErr = await fallbackResp.Content.ReadAsStringAsync();
            throw new HttpRequestException($"Kalbe upstream fallback returned {fallbackResp.StatusCode}: {fbErr}", null, fallbackResp.StatusCode);
        }

        var fallbackJson = await fallbackResp.Content.ReadAsStringAsync();
        var fallbackResult = JsonSerializer.Deserialize<KalbeResponse<KalbePagingData<T>>>(fallbackJson, _jsonOptions);
        var rawData = fallbackResult?.Data;
        if (rawData == null) return null;

        var allItems = rawData.Items ?? new List<T>();
        var filtered = allItems.Where(it => MatchesFilter(it, parsedFilters)).ToList();

        var page = Math.Max(1, query.Page);
        var limit = Math.Clamp(query.PageSize, 1, 100);
        var pagedItems = filtered.Skip((page - 1) * limit).Take(limit).ToList();

        return new KalbePagingData<T>
        {
            Items = pagedItems,
            TotalItems = filtered.Count,
            TotalPages = Math.Max(1, (int)Math.Ceiling((double)filtered.Count / limit)),
            PageCurrent = page,
            Limit = limit,
            Offset = (page - 1) * limit,
            SortBy = query.SortBy,
            SortOrder = query.SortOrder
        };
    }

    private HttpRequestMessage CreatePagedRequest(
        string entity,
        PagingQuery query,
        string accessToken,
        IReadOnlySet<string> allowedSortFields,
        bool omitExtraHeaders = false)
    {
        var req = new HttpRequestMessage(HttpMethod.Get, $"{FeaturePath(entity)}/paging/advance");
        AddAppHeaders(req);
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        if (omitExtraHeaders)
        {
            var page = Math.Max(1, query.Page);
            var limit = Math.Clamp(query.PageSize, 1, 100);
            req.Headers.Add("X-Paging-Offset", ((page - 1) * limit).ToString());
            req.Headers.Add("X-Paging-Limit", limit.ToString());
            if (!string.IsNullOrWhiteSpace(query.SortBy) && allowedSortFields.Contains(query.SortBy))
            {
                req.Headers.Add("X-Paging-SortBy", query.SortBy);
                req.Headers.Add("X-Paging-SortOrder", query.SortOrder?.ToUpper() == "DESC" ? "DESC" : "ASC");
            }
            if (!string.IsNullOrWhiteSpace(query.Search))
            {
                req.Headers.Add("X-Paging-Search", query.Search.Trim());
            }
            if (!string.IsNullOrWhiteSpace(query.IncludeRaw))
            {
                req.Headers.Add("X-Paging-Include", query.IncludeRaw.Trim());
            }
        }
        else
        {
            PagingHeaderBuilder.Apply(req, query, allowedSortFields);
        }
        return req;
    }

    private static string? BuildPascalCaseInclude(List<KeyValuePair<string, string>> filters)
    {
        if (filters.Count == 0) return null;
        var list = new List<Dictionary<string, string>>();
        foreach (var f in filters)
        {
            if (string.IsNullOrWhiteSpace(f.Key)) continue;
            var pascalKey = char.ToUpperInvariant(f.Key[0]) + f.Key.Substring(1);
            list.Add(new Dictionary<string, string> { { pascalKey, f.Value } });
        }
        var json = JsonSerializer.Serialize(list);
        return Convert.ToBase64String(Encoding.UTF8.GetBytes(json));
    }

    private static List<KeyValuePair<string, string>> ParseFilters(string? includeRaw, List<Dictionary<string, string>>? include)
    {
        var result = new List<KeyValuePair<string, string>>();
        if (include is { Count: > 0 })
        {
            foreach (var dict in include)
            {
                foreach (var kvp in dict)
                {
                    if (!string.IsNullOrWhiteSpace(kvp.Key) && !string.IsNullOrWhiteSpace(kvp.Value))
                        result.Add(new KeyValuePair<string, string>(kvp.Key, kvp.Value.Trim()));
                }
            }
            return result;
        }

        if (string.IsNullOrWhiteSpace(includeRaw)) return result;

        try
        {
            var json = Encoding.UTF8.GetString(Convert.FromBase64String(includeRaw.Trim()));
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.ValueKind == JsonValueKind.Array)
            {
                foreach (var elem in doc.RootElement.EnumerateArray())
                {
                    if (elem.ValueKind == JsonValueKind.Object)
                    {
                        foreach (var prop in elem.EnumerateObject())
                        {
                            var val = prop.Value.GetString();
                            if (!string.IsNullOrWhiteSpace(val))
                                result.Add(new KeyValuePair<string, string>(prop.Name, val.Trim()));
                        }
                    }
                }
            }
            else if (doc.RootElement.ValueKind == JsonValueKind.Object)
            {
                foreach (var prop in doc.RootElement.EnumerateObject())
                {
                    var val = prop.Value.GetString();
                    if (!string.IsNullOrWhiteSpace(val))
                        result.Add(new KeyValuePair<string, string>(prop.Name, val.Trim()));
                }
            }
        }
        catch
        {
            // best-effort parse
        }

        return result;
    }

    private static bool MatchesFilter<T>(T item, List<KeyValuePair<string, string>> filters)
    {
        if (filters.Count == 0) return true;
        var props = typeof(T).GetProperties();
        foreach (var filter in filters)
        {
            var prop = props.FirstOrDefault(p => string.Equals(p.Name, filter.Key, StringComparison.OrdinalIgnoreCase));
            if (prop == null) continue;
            var val = prop.GetValue(item)?.ToString();
            if (string.IsNullOrWhiteSpace(val)) return false;
            if (!val.Contains(filter.Value, StringComparison.OrdinalIgnoreCase) &&
                !string.Equals(val, filter.Value, StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }
        }
        return true;
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
        if (!resp.IsSuccessStatusCode)
        {
            var errJson = await resp.Content.ReadAsStringAsync();
            _logger.LogError("Kalbe API {Entity} getById failed with {Status}: {Body}", entity, resp.StatusCode, errJson);
            throw new HttpRequestException($"Kalbe upstream returned {resp.StatusCode}: {errJson}", null, resp.StatusCode);
        }

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
        if (!resp.IsSuccessStatusCode)
        {
            var errJson = await resp.Content.ReadAsStringAsync();
            _logger.LogError("Kalbe API {Entity} create failed with {Status}: {Body}", entity, resp.StatusCode, errJson);
            throw new HttpRequestException($"Kalbe upstream returned {resp.StatusCode}: {errJson}", null, resp.StatusCode);
        }

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
        if (!resp.IsSuccessStatusCode)
        {
            var errJson = await resp.Content.ReadAsStringAsync();
            _logger.LogError("Kalbe API {Entity} update failed with {Status}: {Body}", entity, resp.StatusCode, errJson);
            throw new HttpRequestException($"Kalbe upstream returned {resp.StatusCode}: {errJson}", null, resp.StatusCode);
        }

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
