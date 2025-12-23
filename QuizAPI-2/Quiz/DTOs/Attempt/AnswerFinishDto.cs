using System.ComponentModel.DataAnnotations;

namespace Quiz.DTOs.Attempt;

public class AnswerFinishDto
{
    [Range(1, int.MaxValue, ErrorMessage = "Invalid Question ID.")] // ID вопроса должен быть 0 или 1
    public int QuestionId { get; set; }
    public List<int> SelectedOptionIds { get; set; } = new();
}