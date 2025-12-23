using Quiz.Services.Implementations;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Quiz.Tests;

public class HtmlSanitizerServiceTests
{
    private readonly HtmlSanitizerService _service = new HtmlSanitizerService();

    [Fact]
    public void Sanitize_ShouldRemoveScriptTags()
    {
        var input = "<b>text</b><script>alert(1)</script>";
        var result = _service.Sanitize(input);
        Assert.Equal("<b>text</b>", result);
    }

    [Fact]
    public void Sanitize_ShouldReturnNullOrEmptyAsIs()
    {
        Assert.Null(_service.Sanitize(null));
        Assert.Equal("", _service.Sanitize(""));
    }

    [Fact]
    public void Sanitize_ShouldKeepSafeHtml()
    {
        var input = "<p>Paragraph</p>";
        var result = _service.Sanitize(input);
        Assert.Equal("<p>Paragraph</p>", result);
    }
}
