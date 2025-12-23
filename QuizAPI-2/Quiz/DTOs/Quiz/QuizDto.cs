using Quiz.Models;
namespace Quiz.DTOs.Quiz;

public class QuizDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public CategoryType Category { get; set; }
    public bool IsPublic { get; set; }
    public int AuthorId { get; set; }
    public TimeSpan? TimeLimit { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? PrivateAccessKey { get; set; }
    public bool IsDeleted { get; set; }
}

public class QuizAccessInfoDto
{
    public int QuizId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public TimeSpan? TimeLimit { get; set; }
    public string? AccessKey { get; set; }
}