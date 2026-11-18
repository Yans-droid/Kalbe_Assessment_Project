using System.Text;
using System.Text.Json;
using Tracklab.Api.Models;

namespace Tracklab.Api.Infrastructure;

public static class PagingHeaderBuilder
{
    public static void Apply(HttpRequestMessage req, PagingQuery q, IReadOnlySet<string> allowedSortFields)
    {
        var page = Math.Max(1, q.Page);
        var limit = Math.Clamp(q.PageSize, 1, 100);
        req.Headers.Add("X-Paging-Offset", ((page - 1) * limit).ToString());
        req.Headers.Add("X-Paging-Limit", limit.ToString());

        if (!string.IsNullOrWhiteSpace(q.SortBy) && allowedSortFields.Contains(q.SortBy))
        {
            req.Headers.Add("X-Paging-SortBy", q.SortBy);
            req.Headers.Add("X-Paging-SortOrder", q.SortOrder?.ToUpper() == "DESC" ? "DESC" : "ASC");
        }

        // Default wildcard '%' per verified Kalbe API behaviour
        req.Headers.Add("X-Paging-Search", string.IsNullOrWhiteSpace(q.Search) ? "%" : q.Search.Trim());

        if (!string.IsNullOrWhiteSpace(q.IncludeRaw))
        {
            var normalizedB64 = NormalizeToJsonObject(q.IncludeRaw);
            req.Headers.Add("X-Paging-Include", normalizedB64);
            req.Headers.Add("X-Paging-Operator", q.Operator == "AND" ? "AND" : "OR");
            req.Headers.Add("X-Paging-IgnoreCase", "true");
        }
        else if (q.Include is { Count: > 0 })
        {
            var dict = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            foreach (var d in q.Include)
            {
                foreach (var kvp in d)
                {
                    if (!string.IsNullOrWhiteSpace(kvp.Key) && !string.IsNullOrWhiteSpace(kvp.Value))
                        dict[kvp.Key] = kvp.Value;
                }
            }
            var json = JsonSerializer.Serialize(dict);
            req.Headers.Add("X-Paging-Include", Convert.ToBase64String(Encoding.UTF8.GetBytes(json)));
            req.Headers.Add("X-Paging-Operator", q.Operator == "AND" ? "AND" : "OR");
            req.Headers.Add("X-Paging-IgnoreCase", "true");
        }
    }

    /// <summary>
    /// Normalizes any JSON (whether array of objects or single object, raw or Base64)
    /// into a Base64-encoded single JSON object so PostgreSQL's jsonb_each_text does not fail with:
    /// "22023: cannot call jsonb_each_text on a non-object".
    /// </summary>
    public static string NormalizeToJsonObject(string rawB64OrJson)
    {
        string json;
        try
        {
            var bytes = Convert.FromBase64String(rawB64OrJson.Trim());
            json = Encoding.UTF8.GetString(bytes);
        }
        catch
        {
            json = rawB64OrJson.Trim();
        }

        try
        {
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.ValueKind == JsonValueKind.Object)
            {
                return Convert.ToBase64String(Encoding.UTF8.GetBytes(doc.RootElement.GetRawText()));
            }

            if (doc.RootElement.ValueKind == JsonValueKind.Array)
            {
                var dict = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                foreach (var elem in doc.RootElement.EnumerateArray())
                {
                    if (elem.ValueKind == JsonValueKind.Object)
                    {
                        foreach (var prop in elem.EnumerateObject())
                        {
                            var val = prop.Value.GetString();
                            if (!string.IsNullOrWhiteSpace(val))
                                dict[prop.Name] = val;
                        }
                    }
                }
                var normalized = JsonSerializer.Serialize(dict);
                return Convert.ToBase64String(Encoding.UTF8.GetBytes(normalized));
            }
        }
        catch
        {
            // best-effort fallback to original
        }

        return rawB64OrJson.Trim();
    }
}
