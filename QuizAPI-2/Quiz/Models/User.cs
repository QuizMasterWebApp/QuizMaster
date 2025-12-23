using System.Diagnostics;

namespace Quiz.Models;
public class User
{
    public int Id { get; set; }
    public string Username { get; set; }
    public string PasswordHash { get; set; }
    public DateTime CreatedAt { get; set; }

    public ICollection<Quiz> Quizzes { get; set; } = new List<Quiz>();
    public ICollection<Attempt> Attempts { get; set; } = new List<Attempt>();
}

