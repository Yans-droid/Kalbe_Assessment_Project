using System.Diagnostics;
using Tracklab.Api.Data;
using Tracklab.Api.Infrastructure;

namespace Tracklab.Api.Middleware;

public class RequestLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestLoggingMiddleware> _logger;

    public RequestLoggingMiddleware(RequestDelegate next, ILogger<RequestLoggingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, AppDbContext db)
    {
        var correlationId = context.Request.Headers["X-Correlation-Id"].FirstOrDefault()
                            ?? Guid.NewGuid().ToString();
        context.Response.Headers["X-Correlation-Id"] = correlationId;
        context.Items["CorrelationId"] = correlationId;

        var sw = Stopwatch.StartNew();

        await _next(context);

        sw.Stop();

        var user = TokenCookieHelper.GetUsername(context.Request) ?? "anonymous";
        var method = context.Request.Method;
        var path = (context.Request.Path.Value ?? "/") + context.Request.QueryString;
        var status = context.Response.StatusCode;
        var durationMs = sw.ElapsedMilliseconds;

        // Never log auth/secret paths' bodies
        var message = $"{method} {path} → {status} ({durationMs}ms) [{user}] corr={correlationId}";

        _logger.LogInformation(message);

        try
        {
            db.RequestLogs.Add(new RequestLog
            {
                Timestamp = DateTime.UtcNow,
                CorrelationId = correlationId,
                Method = method,
                Path = path,
                StatusCode = status,
                DurationMs = durationMs,
                User = user,
                Message = message
            });
            await db.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to persist request log to SQLite");
        }
    }
}
