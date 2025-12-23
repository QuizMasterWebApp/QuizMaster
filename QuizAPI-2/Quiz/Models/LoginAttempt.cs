namespace Quiz.Models;

public class LoginAttempt
{
    public int Id { get; set; }
    public string Username { get; set; } = "";
    public int AttemptCount { get; set; } = 0;
    public DateTime LastAttempt { get; set; } = DateTime.UtcNow;
    public bool IsLocked => AttemptCount >= 10 && LastAttempt.AddMinutes(5) > DateTime.UtcNow;
}
