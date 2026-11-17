namespace Tracklab.Api.Models;

public class PagingResponse<T>
{
    public List<T> Items { get; set; } = new();
    public int PageCurrent { get; set; }
    public int TotalItems { get; set; }
    public int TotalPages { get; set; }
    public int PageSize { get; set; }
}
