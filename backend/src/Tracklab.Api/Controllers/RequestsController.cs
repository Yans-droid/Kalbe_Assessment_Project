using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Tracklab.Api.Infrastructure;
using Tracklab.Api.Models;
using Tracklab.Api.Services;

namespace Tracklab.Api.Controllers;

[ApiController]
[Route("api/requests")]
public class RequestsController : ControllerBase
{
    private static readonly IReadOnlySet<string> AllowedSortFields = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        { "projectCode", "lastStatus", "receivingStatus", "totalFee", "receivedDate" };

    private readonly KalbeApiClient _kalbe;
    private readonly AuditService _audit;
    private readonly ILogger<RequestsController> _logger;

    public RequestsController(KalbeApiClient kalbe, AuditService audit, ILogger<RequestsController> logger)
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

        var data = await _kalbe.GetPagedAsync<RequestDto>("requests", query, token!, AllowedSortFields);
        if (data == null) return NotFound();

        return Ok(new PagingResponse<RequestDto>
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

        var data = await _kalbe.GetByIdAsync<RequestDto>("requests", id, token!);
        return data == null ? NotFound() : Ok(data);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateRequestRequest req)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var (token, username, ok) = GetAuth();
        if (!ok) return Unauthorized401();

        // Validate
        if (string.IsNullOrWhiteSpace(req.ProjectCode))
            return BadRequest(new { message = "projectCode is required." });
        if (req.TotalFee < 0)
            return BadRequest(new { message = "totalFee must be >= 0." });
        if (req.AnalysisWipDate.HasValue && req.AnalysisCompletedDate.HasValue
            && req.AnalysisCompletedDate < req.AnalysisWipDate)
            return BadRequest(new { message = "analysisCompletedDate must be >= analysisWipDate." });

        var correlationId = HttpContext.Items["CorrelationId"]?.ToString();
        var newId = Guid.NewGuid();

        var body = new
        {
            id = newId,
            partnerId = req.PartnerId,
            projectCode = req.ProjectCode,
            totalFee = req.TotalFee,
            lastStatus = req.LastStatus,
            receivingStatus = req.ReceivingStatus,
            leadTime = req.LeadTime,
            receivedDate = req.ReceivedDate,
            analysisWipDate = req.AnalysisWipDate,
            analysisCompletedDate = req.AnalysisCompletedDate,
            createdBy = username
        };

        var result = await _kalbe.CreateAsync<RequestDto>("requests", body, token!);

        await _audit.RecordAsync(username, "Request", newId.ToString(), "CREATE",
            newValue: JsonSerializer.Serialize(body), correlationId: correlationId);

        return CreatedAtAction(nameof(GetById), new { id = newId }, result);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateRequestRequest req)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var (token, username, ok) = GetAuth();
        if (!ok) return Unauthorized401();

        if (string.IsNullOrWhiteSpace(req.ProjectCode))
            return BadRequest(new { message = "projectCode is required." });
        if (req.TotalFee < 0)
            return BadRequest(new { message = "totalFee must be >= 0." });
        if (req.AnalysisWipDate.HasValue && req.AnalysisCompletedDate.HasValue
            && req.AnalysisCompletedDate < req.AnalysisWipDate)
            return BadRequest(new { message = "analysisCompletedDate must be >= analysisWipDate." });

        var correlationId = HttpContext.Items["CorrelationId"]?.ToString();

        RequestDto? oldData = null;
        try { oldData = await _kalbe.GetByIdAsync<RequestDto>("requests", id, token!); } catch { }

        var body = new
        {
            id,
            partnerId = req.PartnerId,
            projectCode = req.ProjectCode,
            totalFee = req.TotalFee,
            lastStatus = req.LastStatus,
            receivingStatus = req.ReceivingStatus,
            leadTime = req.LeadTime,
            receivedDate = req.ReceivedDate,
            analysisWipDate = req.AnalysisWipDate,
            analysisCompletedDate = req.AnalysisCompletedDate,
            isActive = req.IsActive,
            updatedBy = username
        };

        var result = await _kalbe.UpdateAsync<RequestDto>("requests", body, token!);

        await _audit.RecordAsync(username, "Request", id.ToString(), "UPDATE",
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

        RequestDto? oldData = null;
        try { oldData = await _kalbe.GetByIdAsync<RequestDto>("requests", id, token!); } catch { }

        await _kalbe.DeleteAsync("requests", id, username!, token!);

        await _audit.RecordAsync(username, "Request", id.ToString(), "DELETE",
            oldValue: oldData != null ? JsonSerializer.Serialize(oldData) : null,
            correlationId: correlationId);

        return NoContent();
    }
}
