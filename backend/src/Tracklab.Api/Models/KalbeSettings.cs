namespace Tracklab.Api.Models;

public class KalbeSettings
{
    public string BaseUrl { get; set; } = string.Empty;
    public string AppId { get; set; } = string.Empty;
    public string AppKey { get; set; } = string.Empty;
    public string PathFeature { get; set; } = "/api/v1/feature";
    public string PathAuthentication { get; set; } = "/api/v1/authentication";
}
