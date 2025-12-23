using System.ComponentModel.DataAnnotations;
using Quiz.Models;

namespace Quiz.DTOs.Question;

public class QuestionCreateDto
{
    [Required]
    [StringLength(500, MinimumLength = 5, ErrorMessage = "Question text must be between 5 and 500 characters.")]
    public string Text { get; set; }
    [Required]
    [Range(1, int.MaxValue, ErrorMessage = "Invalid Quiz ID.")] // ID викторины должен быть > 0
    public int QuizId { get; set; }    public QuestionType Type { get; set; }

    [Required]
    [MinLength(2, ErrorMessage = "A question must have at least two options.")]
    [MaxLength(10, ErrorMessage = "A question cannot have more than 10 options.")]
    public List<OptionRequestDto> Options { get; set; } = new List<OptionRequestDto>();
}

public class OptionRequestDto
{
    [Required]
    [StringLength(500, MinimumLength = 1, ErrorMessage = "Option text must be between 1 and 500 characters.")]
    public string Text { get; set; }
    public bool IsCorrect { get; set; }
}

public class QuestionUpdateDto
{
    public string? Text { get; set; }
    public QuestionType? Type { get; set; }
    public List<OptionRequestDto>? Options { get; set; }
}