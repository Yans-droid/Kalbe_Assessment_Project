using System.ComponentModel.DataAnnotations;

namespace Tracklab.Api.Models;

public class CreateTrackerRequest
{
    [Required] public string Code { get; set; } = string.Empty;
    public string? ParentCode { get; set; }
    public string? Description { get; set; }
    public string? ActionType { get; set; }
    public string? ModuleFlow { get; set; }
    public bool IsUsingNotification { get; set; }
    public bool IsPublic { get; set; }
    public string? Icon { get; set; }
    public int Order { get; set; }
    public int Mandays { get; set; }
    public bool IsParallel { get; set; }
}

public class UpdateTrackerRequest
{
    [Required] public Guid Id { get; set; }
    [Required] public string Code { get; set; } = string.Empty;
    public string? ParentCode { get; set; }
    public string? Description { get; set; }
    public string? ActionType { get; set; }
    public string? ModuleFlow { get; set; }
    public bool IsUsingNotification { get; set; }
    public bool IsPublic { get; set; }
    public string? Icon { get; set; }
    public int Order { get; set; }
    public int Mandays { get; set; }
    public bool IsParallel { get; set; }
    public bool IsActive { get; set; }
}
