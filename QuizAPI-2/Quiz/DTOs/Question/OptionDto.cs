using System.ComponentModel.DataAnnotations;
using Quiz.Models;

namespace Quiz.DTOs.Question;

public class OptionDto
{
    public int Id { get; set; }
    public string Text { get; set; } = string.Empty;
    public bool IsCorrect { get; set; }
}

public class UpdateOptionDto
{
    public string Text { get; set; } = string.Empty;
    public bool? IsCorrect { get; set; }
}

public class CreateOptionDto
{
    public string Text { get; set; } = string.Empty;
    public bool IsCorrect { get; set; }
}