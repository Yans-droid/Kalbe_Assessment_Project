namespace Tracklab.Api.Models;

public class TrackingDto
{
    public Guid Id { get; set; }
    public string? TrackerCode { get; set; }
    public string? Value { get; set; }
    public Guid TrackerId { get; set; }
    public Guid RequestId { get; set; }
    public string? PartnerId { get; set; }
    public bool IsActive { get; set; }
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }
}
