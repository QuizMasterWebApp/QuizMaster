namespace Quiz.Models;

public class Attempt
{
    public int Id { get; set; }
    public int? QuizId { get; set; }
    public int? UserId { get; set; }
    public string? GuestSessionId { get; set; }
    public int Score { get; set; }
    public TimeSpan TimeSpent { get; set; }
    public DateTime CompletedAt { get; set; }

    public User? User { get; set; }
    public Quiz? Quiz { get; set; }
    public ICollection<UserAnswer> UserAnswers { get; set; } = new List<UserAnswer>();
}
