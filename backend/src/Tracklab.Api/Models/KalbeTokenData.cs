namespace Tracklab.Api.Models;

public class KalbeTokenData
{
    public string Access { get; set; } = string.Empty;
    public string Refresh { get; set; } = string.Empty;
    public int ExpiresIn { get; set; }
}
