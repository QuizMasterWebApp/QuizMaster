using Ganss.Xss;
using Quiz.Services.Interfaces;

namespace Quiz.Services.Implementations;

public class HtmlSanitizerService : IHtmlSanitizerService
{
    private readonly HtmlSanitizer _sanitizer;

    public HtmlSanitizerService()
    {
        _sanitizer = new HtmlSanitizer();
    }

    public string Sanitize(string html)
    {
        if (string.IsNullOrEmpty(html))
            return html;

        return _sanitizer.Sanitize(html);
    }
}
