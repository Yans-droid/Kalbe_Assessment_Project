using System.ComponentModel.DataAnnotations;

namespace Tracklab.Api.Models;

public class LoginRequest
{
    [Required] public string User { get; set; } = string.Empty;
    [Required] public string Password { get; set; } = string.Empty;
}
