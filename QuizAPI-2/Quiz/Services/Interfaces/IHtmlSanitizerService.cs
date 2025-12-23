namespace Quiz.Services.Interfaces;

public interface IHtmlSanitizerService
{
    string Sanitize(string html);
}
