namespace Quiz.Models;

public class Option
{
    public int Id { get; set; }
    public string Text { get; set; }
    public int QuestionId { get; set; }
    public bool IsCorrect { get; set; }

    public Question Question { get; set; }
    public ICollection<UserAnswer> UserAnswers { get; set; } = new List<UserAnswer>();
}
