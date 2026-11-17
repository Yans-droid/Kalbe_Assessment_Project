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

        if (q.Include is { Count: > 0 })
        {
            var json = JsonSerializer.Serialize(q.Include);
            req.Headers.Add("X-Paging-Include", Convert.ToBase64String(Encoding.UTF8.GetBytes(json)));
            req.Headers.Add("X-Paging-Operator", q.Operator == "AND" ? "AND" : "OR");
            req.Headers.Add("X-Paging-IgnoreCase", "true");
        }
    }
}
