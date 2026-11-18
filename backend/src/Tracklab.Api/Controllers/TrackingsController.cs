using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Tracklab.Api.Infrastructure;
using Tracklab.Api.Models;
using Tracklab.Api.Services;

namespace Tracklab.Api.Controllers;

[ApiController]
[Route("api/trackings")]
public class TrackingsController : ControllerBase
{
    private static readonly IReadOnlySet<string> AllowedSortFields = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        { "trackerCode", "value", "requestId", "trackerId" };

    private readonly KalbeApiClient _kalbe;
    private readonly AuditService _audit;
    private readonly ILogger<TrackingsController> _logger;

    public TrackingsController(KalbeApiClient kalbe, AuditService audit, ILogger<TrackingsController> logger)
    {
        _kalbe = kalbe;
        _audit = audit;
        _logger = logger;
    }

    private IActionResult Unauthorized401()
    {
        var isDev = HttpContext.RequestServices.GetService<IWebHostEnvironment>()?.IsDevelopment() ?? false;
        TokenCookieHelper.ClearCookies(Response, isDev);
        return Unauthorized(new { message = "Authentication required." });
    }

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

        var data = await _kalbe.GetPagedAsync<TrackingDto>("trackings", query, token!, AllowedSortFields);
        if (data == null) return NotFound();

        return Ok(new PagingResponse<TrackingDto>
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

        var data = await _kalbe.GetByIdAsync<TrackingDto>("trackings", id, token!);
        return data == null ? NotFound() : Ok(data);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTrackingRequest req)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var (token, username, ok) = GetAuth();
        if (!ok) return Unauthorized401();

        var correlationId = HttpContext.Items["CorrelationId"]?.ToString();
        var newId = Guid.NewGuid();

        var body = new
        {
            id = newId,
            trackerId = req.TrackerId,
            requestId = req.RequestId,
            trackerCode = req.TrackerCode,
            value = req.Value,
            partnerId = req.PartnerId,
            createdBy = username
        };

        var result = await _kalbe.CreateAsync<TrackingDto>("trackings", body, token!);

        await _audit.RecordAsync(username, "Tracking", newId.ToString(), "CREATE",
            newValue: JsonSerializer.Serialize(body), correlationId: correlationId);

        return CreatedAtAction(nameof(GetById), new { id = newId }, result);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateTrackingRequest req)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var (token, username, ok) = GetAuth();
        if (!ok) return Unauthorized401();

        var correlationId = HttpContext.Items["CorrelationId"]?.ToString();

        TrackingDto? oldData = null;
        try { oldData = await _kalbe.GetByIdAsync<TrackingDto>("trackings", id, token!); } catch { }

        var body = new
        {
            id,
            trackerId = req.TrackerId,
            requestId = req.RequestId,
            trackerCode = req.TrackerCode,
            value = req.Value,
            partnerId = req.PartnerId,
            isActive = req.IsActive,
            updatedBy = username
        };

        var result = await _kalbe.UpdateAsync<TrackingDto>("trackings", body, token!);

        await _audit.RecordAsync(username, "Tracking", id.ToString(), "UPDATE",
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

        TrackingDto? oldData = null;
        try { oldData = await _kalbe.GetByIdAsync<TrackingDto>("trackings", id, token!); } catch { }

        await _kalbe.DeleteAsync("trackings", id, username!, token!);

        await _audit.RecordAsync(username, "Tracking", id.ToString(), "DELETE",
            oldValue: oldData != null ? JsonSerializer.Serialize(oldData) : null,
            correlationId: correlationId);

        return NoContent();
    }
}
