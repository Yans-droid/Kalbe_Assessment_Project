namespace Tracklab.Api.Models;

public class PagingQuery
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
    public string? SortBy { get; set; }
    public string? SortOrder { get; set; }
    public string? Search { get; set; }
    public List<Dictionary<string, string>>? Include { get; set; }
    public string? Operator { get; set; }
}
