using System.Text;
using Tracklab.Api.Infrastructure;
using Tracklab.Api.Models;

namespace Tracklab.Tests;

public class PagingHeaderBuilderTests
{
    private static readonly IReadOnlySet<string> AllowedSorts = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        { "code", "description", "order" };

    [Fact]
    public void Apply_SetsCorrectOffset_ForPage2()
    {
        var req = new HttpRequestMessage();
        var q = new PagingQuery { Page = 2, PageSize = 10 };

        PagingHeaderBuilder.Apply(req, q, AllowedSorts);

        Assert.Equal("10", req.Headers.GetValues("X-Paging-Offset").First());
        Assert.Equal("10", req.Headers.GetValues("X-Paging-Limit").First());
    }

    [Fact]
    public void Apply_ClampsPageSize_ToMax100()
    {
        var req = new HttpRequestMessage();
        var q = new PagingQuery { Page = 1, PageSize = 999 };

        PagingHeaderBuilder.Apply(req, q, AllowedSorts);

        Assert.Equal("100", req.Headers.GetValues("X-Paging-Limit").First());
        Assert.Equal("0", req.Headers.GetValues("X-Paging-Offset").First());
    }

    [Fact]
    public void Apply_ClampsPageSize_ToMin1()
    {
        var req = new HttpRequestMessage();
        var q = new PagingQuery { Page = 1, PageSize = -5 };

        PagingHeaderBuilder.Apply(req, q, AllowedSorts);

        Assert.Equal("1", req.Headers.GetValues("X-Paging-Limit").First());
    }

    [Fact]
    public void Apply_DefaultSearch_IsWildcard()
    {
        var req = new HttpRequestMessage();
        var q = new PagingQuery { Page = 1, PageSize = 10, Search = null };

        PagingHeaderBuilder.Apply(req, q, AllowedSorts);

        Assert.Equal("%", req.Headers.GetValues("X-Paging-Search").First());
    }

    [Fact]
    public void Apply_CustomSearch_IsPreserved()
    {
        var req = new HttpRequestMessage();
        var q = new PagingQuery { Page = 1, PageSize = 10, Search = " hello " };

        PagingHeaderBuilder.Apply(req, q, AllowedSorts);

        Assert.Equal("%hello%", req.Headers.GetValues("X-Paging-Search").First());
    }

    [Fact]
    public void Apply_WhitelistedSort_IsApplied()
    {
        var req = new HttpRequestMessage();
        var q = new PagingQuery { Page = 1, PageSize = 10, SortBy = "code", SortOrder = "DESC" };

        PagingHeaderBuilder.Apply(req, q, AllowedSorts);

        Assert.Equal("code", req.Headers.GetValues("X-Paging-SortBy").First());
        Assert.Equal("DESC", req.Headers.GetValues("X-Paging-SortOrder").First());
    }

    [Fact]
    public void Apply_NonWhitelistedSort_IsIgnored()
    {
        var req = new HttpRequestMessage();
        var q = new PagingQuery { Page = 1, PageSize = 10, SortBy = "malicious_field", SortOrder = "ASC" };

        PagingHeaderBuilder.Apply(req, q, AllowedSorts);

        Assert.False(req.Headers.Contains("X-Paging-SortBy"));
    }

    [Fact]
    public void Apply_IncludeFilter_ProducesValidBase64()
    {
        var req = new HttpRequestMessage();
        var filters = new List<Dictionary<string, string>>
        {
            new() { { "code", "TRK" } }
        };
        var q = new PagingQuery { Page = 1, PageSize = 10, Include = filters, Operator = "OR" };

        PagingHeaderBuilder.Apply(req, q, AllowedSorts);

        var b64 = req.Headers.GetValues("X-Paging-Include").First();
        var decoded = Encoding.UTF8.GetString(Convert.FromBase64String(b64));
        Assert.Contains("TRK", decoded);
        Assert.Equal("OR", req.Headers.GetValues("X-Paging-Operator").First());
        Assert.Equal("true", req.Headers.GetValues("X-Paging-IgnoreCase").First());
    }

    [Fact]
    public void Apply_IncludeRaw_NormalizedToJsonObject()
    {
        var req = new HttpRequestMessage();
        var rawB64 = Convert.ToBase64String(Encoding.UTF8.GetBytes("[{\"lastStatus\":\"SUBMITTED\"}]"));
        var q = new PagingQuery { Page = 1, PageSize = 10, IncludeRaw = rawB64, Operator = "AND" };

        PagingHeaderBuilder.Apply(req, q, AllowedSorts);

        var headerVal = req.Headers.GetValues("X-Paging-Include").First();
        var decoded = Encoding.UTF8.GetString(Convert.FromBase64String(headerVal));
        Assert.Contains("lastStatus", decoded);
        Assert.Contains("SUBMITTED", decoded);
        Assert.StartsWith("{", decoded.Trim());
        Assert.Equal("AND", req.Headers.GetValues("X-Paging-Operator").First());
        Assert.Equal("true", req.Headers.GetValues("X-Paging-IgnoreCase").First());
    }
}
