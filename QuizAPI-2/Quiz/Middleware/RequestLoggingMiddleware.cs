using System.Diagnostics;
using System.Security.Claims;

namespace Quiz.Middleware;

public class RequestLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestLoggingMiddleware> _logger;

    public RequestLoggingMiddleware(RequestDelegate next, ILogger<RequestLoggingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task Invoke(HttpContext context)
    {
        var timestamp = DateTime.UtcNow;
        var userId = context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "Guest";
        var method = context.Request.Method;
        var path = context.Request.Path;
        var query = context.Request.QueryString.ToString();

        // Логируем начало запроса
        _logger.LogInformation("[{Timestamp}] Incoming request. User: {UserId}, Method: {Method}, Path: {Path}, Query: {Query}",
            timestamp, userId, method, path, query);

        // Засекаем время выполнения запроса
        var sw = Stopwatch.StartNew();
        await _next(context); 
        sw.Stop();

        // Логируем результат и длительность
        _logger.LogInformation("[{Timestamp}] Request completed. User: {UserId}, Method: {Method}, Path: {Path}, Status: {Status}, Duration: {Duration}ms",
            timestamp, userId, method, path, context.Response.StatusCode, sw.ElapsedMilliseconds);
    }
}

