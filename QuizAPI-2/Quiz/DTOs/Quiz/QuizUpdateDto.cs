using System.ComponentModel.DataAnnotations;
using Quiz.Models;

namespace Quiz.DTOs.Quiz;

public class QuizUpdateDto
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public CategoryType? Category { get; set; }
    public bool? IsPublic { get; set; }
    public TimeSpan? TimeLimit { get; set; }
}