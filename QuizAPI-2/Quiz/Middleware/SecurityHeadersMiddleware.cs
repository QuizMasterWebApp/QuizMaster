using Microsoft.AspNetCore.Http;
using System.Threading.Tasks;

namespace Quiz.Middleware
{
    public class SecurityHeadersMiddleware
    {
        private readonly RequestDelegate _next;

        public SecurityHeadersMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task Invoke(HttpContext context)
        {
            // Основные заголовки безопасности
            context.Response.Headers["X-Content-Type-Options"] = "nosniff";
            context.Response.Headers["X-Frame-Options"] = "DENY";
            context.Response.Headers["Referrer-Policy"] = "no-referrer";
            context.Response.Headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=(), fullscreen=(), payment=(), sync-xhr=()"; // пример
            context.Response.Headers["X-XSS-Protection"] = "1; mode=block";

            // Content-Security-Policy (CSP)
            context.Response.Headers["Content-Security-Policy"] =
                "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:;";

            await _next(context);
        }
    }
}
