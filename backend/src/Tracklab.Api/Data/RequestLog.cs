using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Tracklab.Api.Data;

[Table("request_logs")]
public class RequestLog
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }
    public DateTime Timestamp { get; set; }
    public string? CorrelationId { get; set; }
    public string? Method { get; set; }
    public string? Path { get; set; }
    public int StatusCode { get; set; }
    public long DurationMs { get; set; }
    public string? User { get; set; }
    public string? Message { get; set; }
}
