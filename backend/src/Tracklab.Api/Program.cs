using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Serilog;
using Tracklab.Api.Data;
using Tracklab.Api.Infrastructure;
using Tracklab.Api.Middleware;
using Tracklab.Api.Models;
using Tracklab.Api.Services;

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    // Serilog
    builder.Host.UseSerilog((ctx, lc) => lc
        .ReadFrom.Configuration(ctx.Configuration)
        .WriteTo.Console()
        .WriteTo.File(
            path: "logs/log-.txt",
            rollingInterval: RollingInterval.Day,
            retainedFileCountLimit: 30,
            outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss.fff} [{Level:u3}] {Message:lj}{NewLine}{Exception}")
        .Enrich.FromLogContext());

    // Settings
    builder.Services.Configure<KalbeSettings>(builder.Configuration.GetSection("Kalbe"));

    // SQLite
    var connStr = builder.Configuration.GetConnectionString("DefaultConnection") ?? "Data Source=tracklab.db";
    builder.Services.AddDbContext<AppDbContext>(opt => opt.UseSqlite(connStr));

    // HttpClient for Kalbe upstream
    builder.Services.AddHttpClient<KalbeApiClient>(client =>
    {
        var baseUrl = builder.Configuration["Kalbe:BaseUrl"] ?? "https://api-assessment-biopharma.kalbe.co.id";
        client.BaseAddress = new Uri(baseUrl);
        client.Timeout = TimeSpan.FromSeconds(15);
    });

    // Services
    builder.Services.AddScoped<AuthService>();
    builder.Services.AddScoped<AuditService>();

    // CORS
    var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
        ?? new[] { "http://localhost:3000" };
    builder.Services.AddCors(opt => opt.AddPolicy("FrontendPolicy", policy =>
        policy.WithOrigins(allowedOrigins)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials()));

    // Rate limiting — 10 login requests per minute per IP
    builder.Services.AddRateLimiter(opt =>
    {
        opt.AddPolicy("login", context => RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0
            }));
        opt.RejectionStatusCode = 429;
    });

    builder.Services.AddControllers()
        .AddJsonOptions(opt =>
        {
            opt.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
            opt.JsonSerializerOptions.DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
        });

    var app = builder.Build();

    // Ensure SQLite DB
    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Database.EnsureCreated();
    }

    app.UseSerilogRequestLogging(opt =>
    {
        opt.MessageTemplate = "HTTP {RequestMethod} {RequestPath} responded {StatusCode} in {Elapsed:0.0000} ms";
    });

    app.UseMiddleware<ExceptionHandlingMiddleware>();

    app.UseCors("FrontendPolicy");
    app.UseRateLimiter();

    // Security headers
    app.Use(async (ctx, next) =>
    {
        ctx.Response.Headers["X-Content-Type-Options"] = "nosniff";
        ctx.Response.Headers["X-Frame-Options"] = "DENY";
        await next();
    });

    app.UseMiddleware<RequestLoggingMiddleware>();

    app.MapControllers();

    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application startup failed");
    throw;
}
finally
{
    Log.CloseAndFlush();
}
