using System.ComponentModel.DataAnnotations;
using Quiz.Models;

namespace Quiz.DTOs.Quiz;
public class QuizCreateDto
{
    [Required]
    [StringLength(50, MinimumLength = 3, ErrorMessage = "Title must be between 3 and 50 characters.")]
    public string Title { get; set; } = string.Empty;
    
    [StringLength(5000, ErrorMessage = "Description cannot exceed 5000 characters.")]
    public string? Description { get; set; }
    public CategoryType Category { get; set; }
    [Required]
    public bool IsPublic { get; set; }
    public TimeSpan? TimeLimit { get; set; } = TimeSpan.Zero;
}