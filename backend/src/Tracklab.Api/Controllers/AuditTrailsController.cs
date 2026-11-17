using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Tracklab.Api.Data;
using Tracklab.Api.Infrastructure;

namespace Tracklab.Api.Controllers;

[ApiController]
[Route("api/audit-trails")]
public class AuditTrailsController : ControllerBase
{
    private readonly AppDbContext _db;

    public AuditTrailsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetRecent()
    {
        var token = TokenCookieHelper.GetAccessToken(Request);
        if (string.IsNullOrEmpty(token))
            return Unauthorized(new { message = "Authentication required." });

        var trails = await _db.AuditTrails
            .OrderByDescending(a => a.Timestamp)
            .Take(100)
            .ToListAsync();

        return Ok(trails);
    }
}
