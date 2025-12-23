using System.ComponentModel.DataAnnotations;

namespace Quiz.DTOs.User;

public class AuthDto
{
    [Required(ErrorMessage = "Username is required")]
    [StringLength(50, MinimumLength = 3, ErrorMessage = "Username must be between 3 and 50 characters.")] // Добавление диапазона
    public string Username { get; set; } = string.Empty;
    [Required(ErrorMessage = "Password is required")]
    [MinLength(6, ErrorMessage = "Password must be at least 6 characters.")]
    public string Password { get; set; } = string.Empty;
}