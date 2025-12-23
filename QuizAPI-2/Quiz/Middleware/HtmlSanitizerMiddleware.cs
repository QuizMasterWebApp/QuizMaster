using Quiz.Services.Interfaces;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace Quiz.Middleware;

public class HtmlSanitizerMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IHtmlSanitizerService _sanitizer;

    public HtmlSanitizerMiddleware(RequestDelegate next, IHtmlSanitizerService sanitizer)
    {
        _next = next;
        _sanitizer = sanitizer;
    }

    public async Task Invoke(HttpContext context)
    {
        // Обрабатываем только JSON POST / PUT / PATCH
        if (context.Request.Method is not ("POST" or "PUT" or "PATCH")
            || context.Request.ContentType == null
            || !context.Request.ContentType.Contains("application/json"))
        {
            await _next(context);
            return;
        }

        context.Request.EnableBuffering();

        using var reader = new StreamReader(context.Request.Body, Encoding.UTF8, leaveOpen: true);
        var body = await reader.ReadToEndAsync();

        context.Request.Body.Position = 0;

        if (string.IsNullOrWhiteSpace(body))
        {
            await _next(context);
            return;
        }

        var sanitized = SanitizeJson(body);

        context.Request.Body = new MemoryStream(Encoding.UTF8.GetBytes(sanitized));

        await _next(context);
    }

    private string SanitizeJson(string json)
    {
        JsonNode? node;

        try
        {
            node = JsonNode.Parse(json);
        }
        catch
        {
            return json;
        }

        if (node == null) return json;

        SanitizeNode(node);

        return node.ToJsonString(new()
        {
            WriteIndented = false
        });
    }

    private void SanitizeNode(JsonNode node)
    {
        if (node is JsonObject obj)
        {
            foreach (var p in obj.ToList())
            {
                if (p.Value is JsonValue jv && jv.TryGetValue(out string? s))
                    obj[p.Key] = _sanitizer.Sanitize(s);

                if (p.Value is JsonObject or JsonArray)
                    SanitizeNode(p.Value!);
            }
        }

        if (node is JsonArray arr)
        {
            for (int i = 0; i < arr.Count; i++)
            {
                if (arr[i] is JsonValue jv && jv.TryGetValue(out string? s))
                    arr[i] = _sanitizer.Sanitize(s);

                if (arr[i] is JsonObject or JsonArray)
                    SanitizeNode(arr[i]!);
            }
        }
    }
}
