namespace Tracklab.Api.Models;

public class RequestDto
{
    public Guid Id { get; set; }
    public string? PartnerId { get; set; }
    public string? ProjectCode { get; set; }
    public decimal TotalFee { get; set; }
    public string? LastStatus { get; set; }
    public string? ReceivingStatus { get; set; }
    public int? LeadTime { get; set; }
    public DateTime? ReceivedDate { get; set; }
    public DateTime? AnalysisWipDate { get; set; }
    public DateTime? AnalysisCompletedDate { get; set; }
    public bool IsActive { get; set; }
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }
}
