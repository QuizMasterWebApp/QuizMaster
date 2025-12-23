namespace Quiz.Models;

public class Question
{
    public int Id { get; set; }
    public string Text { get; set; }
    public int? QuizId { get; set; }
    public QuestionType Type { get; set; }

    public Quiz? Quiz { get; set; }
    public ICollection<UserAnswer> UserAnswers { get; set; } = new List<UserAnswer>();
    public ICollection<Option> Options { get; set; } = new List<Option>();
}

public enum QuestionType
{
    Single = 0,
    Multiple = 1
}