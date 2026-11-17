namespace Tracklab.Api.Models;

public class KalbeTokenInfo
{
    public string Access { get; set; } = string.Empty;
    public string Refresh { get; set; } = string.Empty;
    public int ExpiresIn { get; set; }
}

public class KalbeLoginData
{
    public KalbeTokenInfo? Token { get; set; }
    public string User { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
}
