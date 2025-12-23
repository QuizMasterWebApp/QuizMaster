using System.Security.Claims;

namespace Quiz;

public static class HttpContextExtensions
{
    public static string? GetGuestSessionId(this HttpContext context)
    {
        if (context.Items.TryGetValue("GuestSessionId", out var value))
            return value?.ToString();

        return null;
    }

    public static int? GetUserId(this HttpContext context)
    {
        if (context.User.Identity?.IsAuthenticated == true)
        {
            var claimValue = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.TryParse(claimValue, out var userId) ? userId : null;
        }
        return null;
    }
}
