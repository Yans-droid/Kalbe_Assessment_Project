namespace Tracklab.Api.Models;

public class KalbePagingData<T>
{
    public List<T> Items { get; set; } = new();
    public int PageCurrent { get; set; }
    public int PagePrevious { get; set; }
    public int PageNext { get; set; }
    public int Offset { get; set; }
    public int Limit { get; set; }
    public string? SortBy { get; set; }
    public string? SortOrder { get; set; }
    public int TotalItems { get; set; }
    public int TotalPages { get; set; }
}
