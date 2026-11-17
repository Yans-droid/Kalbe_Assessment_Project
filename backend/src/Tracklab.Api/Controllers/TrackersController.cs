using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc;
using Tracklab.Api.Infrastructure;
using Tracklab.Api.Models;
using Tracklab.Api.Services;

namespace Tracklab.Api.Controllers;

[ApiController]
[Route("api/trackers")]
public class TrackersController : ControllerBase
{
    private static readonly IReadOnlySet<string> AllowedSortFields = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        { "code", "description", "actionType", "order", "mandays", "moduleFlow" };

    private static readonly string[] AllowedActionTypes = { "none", "text", "file", "date" };
    private static readonly Regex CodeRegex = new(@"^[A-Z0-9-]+$", RegexOptions.Compiled);

    private readonly KalbeApiClient _kalbe;
    private readonly AuditService _audit;
    private readonly ILogger<TrackersController> _logger;

    public TrackersController(KalbeApiClient kalbe, AuditService audit, ILogger<TrackersController> logger)
    {
        _kalbe = kalbe;
        _audit = audit;
        _logger = logger;
    }

    private IActionResult Unauthorized401() =>
        Unauthorized(new { message = "Authentication required." });

    private (string? accessToken, string? username, bool ok) GetAuth()
    {
        var token = TokenCookieHelper.GetAccessToken(Request);
        var user = TokenCookieHelper.GetUsername(Request);
        return (token, user, !string.IsNullOrEmpty(token) && !string.IsNullOrEmpty(user));
    }

    [HttpGet]
    public async Task<IActionResult> GetPaged([FromQuery] PagingQuery query)
    {
        var (token, _, ok) = GetAuth();
        if (!ok) return Unauthorized401();

        var data = await _kalbe.GetPagedAsync<TrackerDto>("trackers", query, token!, AllowedSortFields);
        if (data == null) return NotFound();

        return Ok(new PagingResponse<TrackerDto>
        {
            Items = data.Items,
            PageCurrent = data.PageCurrent,
            TotalItems = data.TotalItems,
            TotalPages = data.TotalPages,
            PageSize = Math.Clamp(query.PageSize, 1, 100)
        });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var (token, _, ok) = GetAuth();
        if (!ok) return Unauthorized401();

        var data = await _kalbe.GetByIdAsync<TrackerDto>("trackers", id, token!);
        return data == null ? NotFound() : Ok(data);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTrackerRequest req)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var (token, username, ok) = GetAuth();
        if (!ok) return Unauthorized401();

        // Validate
        if (!CodeRegex.IsMatch(req.Code))
            return BadRequest(new { message = "code must match ^[A-Z0-9-]+$" });
        if (req.ActionType != null && !AllowedActionTypes.Contains(req.ActionType))
            return BadRequest(new { message = $"actionType must be one of: {string.Join(", ", AllowedActionTypes)}" });
        if (req.Mandays < -1)
            return BadRequest(new { message = "mandays must be >= -1" });

        var correlationId = HttpContext.Items["CorrelationId"]?.ToString();
        var newId = Guid.NewGuid();

        var body = new
        {
            id = newId,
            code = req.Code,
            parentCode = req.ParentCode,
            description = req.Description,
            actionType = req.ActionType ?? "none",
            moduleFlow = req.ModuleFlow,
            isUsingNotification = req.IsUsingNotification,
            isPublic = req.IsPublic,
            icon = req.Icon,
            order = req.Order,
            mandays = req.Mandays,
            isParallel = req.IsParallel,
            createdBy = username
        };

        var result = await _kalbe.CreateAsync<TrackerDto>("trackers", body, token!);

        await _audit.RecordAsync(username, "Tracker", newId.ToString(), "CREATE",
            newValue: JsonSerializer.Serialize(body), correlationId: correlationId);

        return CreatedAtAction(nameof(GetById), new { id = newId }, result);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateTrackerRequest req)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var (token, username, ok) = GetAuth();
        if (!ok) return Unauthorized401();

        if (!CodeRegex.IsMatch(req.Code))
            return BadRequest(new { message = "code must match ^[A-Z0-9-]+$" });
        if (req.ActionType != null && !AllowedActionTypes.Contains(req.ActionType))
            return BadRequest(new { message = $"actionType must be one of: {string.Join(", ", AllowedActionTypes)}" });
        if (req.Mandays < -1)
            return BadRequest(new { message = "mandays must be >= -1" });

        var correlationId = HttpContext.Items["CorrelationId"]?.ToString();

        // Get old for audit
        TrackerDto? oldData = null;
        try { oldData = await _kalbe.GetByIdAsync<TrackerDto>("trackers", id, token!); } catch { }

        var body = new
        {
            id,
            code = req.Code,
            parentCode = req.ParentCode,
            description = req.Description,
            actionType = req.ActionType ?? "none",
            moduleFlow = req.ModuleFlow,
            isUsingNotification = req.IsUsingNotification,
            isPublic = req.IsPublic,
            icon = req.Icon,
            order = req.Order,
            mandays = req.Mandays,
            isParallel = req.IsParallel,
            isActive = req.IsActive,
            updatedBy = username
        };

        var result = await _kalbe.UpdateAsync<TrackerDto>("trackers", body, token!);

        await _audit.RecordAsync(username, "Tracker", id.ToString(), "UPDATE",
            oldValue: oldData != null ? JsonSerializer.Serialize(oldData) : null,
            newValue: JsonSerializer.Serialize(body),
            correlationId: correlationId);

        return Ok(result);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var (token, username, ok) = GetAuth();
        if (!ok) return Unauthorized401();

        var correlationId = HttpContext.Items["CorrelationId"]?.ToString();

        TrackerDto? oldData = null;
        try { oldData = await _kalbe.GetByIdAsync<TrackerDto>("trackers", id, token!); } catch { }

        await _kalbe.DeleteAsync("trackers", id, username!, token!);

        await _audit.RecordAsync(username, "Tracker", id.ToString(), "DELETE",
            oldValue: oldData != null ? JsonSerializer.Serialize(oldData) : null,
            correlationId: correlationId);

        return NoContent();
    }
}
