namespace Tracklab.Api.Models;

public class KalbeResponse<T>
{
    public T? Data { get; set; }
    public bool Success { get; set; }
    public int Code { get; set; }
}
