namespace Quiz.Middleware;

public class GuestSessionMiddleware
{
    private readonly RequestDelegate _next;
    private const string CookieName = "guest_session_id";

    public GuestSessionMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task Invoke(HttpContext context)
    {
        // Проверяем авторизован ли пользователь
        bool isAuthenticated = context.User?.Identity?.IsAuthenticated ?? false;

        // Гостям нужны guest session cookies
        if (!isAuthenticated)
        {
            if (!context.Request.Cookies.TryGetValue(CookieName, out string? guestId) || string.IsNullOrWhiteSpace(guestId))
            {
                guestId = Guid.NewGuid().ToString("N");

                context.Response.Cookies.Append(CookieName, guestId, new CookieOptions
                {
                    HttpOnly = true,
                    Secure = true,
                    SameSite = SameSiteMode.Strict,
                    Expires = DateTimeOffset.UtcNow.AddYears(1)
                });
            }

            // Делаем доступным для контроллеров / сервисов
            context.Items["GuestSessionId"] = guestId;
        }

        await _next(context);
    }
}
