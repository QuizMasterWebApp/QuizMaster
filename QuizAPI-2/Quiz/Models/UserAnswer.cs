namespace Quiz.Models;

public class UserAnswer
{
    public int Id { get; set; }
    public int AttemptId { get; set; }
    public int QuestionId { get; set; }
    public int ChosenOptionId { get; set; }

    public Attempt Attempt { get; set; }
    public Question Question { get; set; }
    public Option ChosenOption { get; set; }
}
