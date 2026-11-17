using System.ComponentModel.DataAnnotations;

namespace Tracklab.Api.Models;

public class CreateRequestRequest
{
    [Required] public string ProjectCode { get; set; } = string.Empty;
    public string? PartnerId { get; set; }
    public decimal TotalFee { get; set; }
    public string? LastStatus { get; set; }
    public string? ReceivingStatus { get; set; }
    public int? LeadTime { get; set; }
    public DateTime? ReceivedDate { get; set; }
    public DateTime? AnalysisWipDate { get; set; }
    public DateTime? AnalysisCompletedDate { get; set; }
}

public class UpdateRequestRequest
{
    [Required] public Guid Id { get; set; }
    [Required] public string ProjectCode { get; set; } = string.Empty;
    public string? PartnerId { get; set; }
    public decimal TotalFee { get; set; }
    public string? LastStatus { get; set; }
    public string? ReceivingStatus { get; set; }
    public int? LeadTime { get; set; }
    public DateTime? ReceivedDate { get; set; }
    public DateTime? AnalysisWipDate { get; set; }
    public DateTime? AnalysisCompletedDate { get; set; }
    public bool IsActive { get; set; }
}
