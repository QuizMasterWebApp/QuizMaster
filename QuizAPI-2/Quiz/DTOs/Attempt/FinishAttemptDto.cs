using System.ComponentModel.DataAnnotations;

namespace Quiz.DTOs.Attempt;

public class FinishAttemptDto
{
    [Required]
    public IEnumerable<AnswerFinishDto> Answers { get; set; } = new List<AnswerFinishDto>();
}