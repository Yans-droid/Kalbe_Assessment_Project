using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Tracklab.Api.Data;
using Tracklab.Api.Infrastructure;

namespace Tracklab.Api.Controllers;

[ApiController]
[Route("api/logs")]
public class LogsController : ControllerBase
{
    private readonly AppDbContext _db;

    public LogsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetRecent()
    {
        var token = TokenCookieHelper.GetAccessToken(Request);
        if (string.IsNullOrEmpty(token))
            return Unauthorized(new { message = "Authentication required." });

        var logs = await _db.RequestLogs
            .OrderByDescending(l => l.Timestamp)
            .Take(100)
            .ToListAsync();

        return Ok(logs);
    }
}
