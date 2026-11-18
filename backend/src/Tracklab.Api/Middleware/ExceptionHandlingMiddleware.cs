using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Tracklab.Api.Infrastructure;

namespace Tracklab.Api.Middleware;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;
    private readonly IHostEnvironment _env;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger, IHostEnvironment env)
    {
        _next = next;
        _logger = logger;
        _env = env;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception ex)
    {
        _logger.LogError(ex, "Unhandled exception: {Message}", ex.Message);

        var (status, title) = ex switch
        {
            TaskCanceledException or OperationCanceledException or TimeoutException =>
                (HttpStatusCode.BadGateway, "Upstream service timeout or unavailable"),
            HttpRequestException hre when hre.StatusCode == HttpStatusCode.Unauthorized =>
                (HttpStatusCode.Unauthorized, "Authentication failed"),
            HttpRequestException hre when hre.StatusCode == HttpStatusCode.BadGateway =>
                (HttpStatusCode.BadGateway, "Upstream service error"),
            _ => (HttpStatusCode.InternalServerError, "An unexpected error occurred")
        };

        if (status == HttpStatusCode.Unauthorized)
        {
            // Clear auth cookies on 401 so the browser doesn't get stuck in an infinite loop
            TokenCookieHelper.ClearCookies(context.Response, _env.IsDevelopment());
        }

        var problem = new ProblemDetails
        {
            Status = (int)status,
            Title = title,
            Instance = context.Request.Path
        };

        context.Response.ContentType = "application/problem+json";
        context.Response.StatusCode = (int)status;

        var json = JsonSerializer.Serialize(problem, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        await context.Response.WriteAsync(json);
    }
}
