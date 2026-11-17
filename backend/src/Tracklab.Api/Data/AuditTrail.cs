using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Tracklab.Api.Data;

[Table("audit_trails")]
public class AuditTrail
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }
    public DateTime Timestamp { get; set; }
    public string? User { get; set; }
    public string? Entity { get; set; }
    public string? EntityId { get; set; }
    public string? Action { get; set; }
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }
    public string? CorrelationId { get; set; }
}
