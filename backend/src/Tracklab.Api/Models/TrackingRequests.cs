using System.ComponentModel.DataAnnotations;

namespace Tracklab.Api.Models;

public class CreateTrackingRequest
{
    [Required] public Guid TrackerId { get; set; }
    [Required] public Guid RequestId { get; set; }
    public string? TrackerCode { get; set; }
    public string? Value { get; set; }
    public string? PartnerId { get; set; }
}

public class UpdateTrackingRequest
{
    [Required] public Guid Id { get; set; }
    [Required] public Guid TrackerId { get; set; }
    [Required] public Guid RequestId { get; set; }
    public string? TrackerCode { get; set; }
    public string? Value { get; set; }
    public string? PartnerId { get; set; }
    public bool IsActive { get; set; }
}
