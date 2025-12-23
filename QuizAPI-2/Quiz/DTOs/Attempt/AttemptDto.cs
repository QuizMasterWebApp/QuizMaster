namespace Quiz.DTOs.Attempt;

public class AttemptDto
{
    public int Id { get; set; }
    public int Score { get; set; }
    public TimeSpan TimeSpent { get; set; }
    public DateTime CompletedAt { get; set; }
    public int? UserId { get; set; }
    public string? GuestSessionId { get; set; }
    public int? QuizId { get; set; }
}