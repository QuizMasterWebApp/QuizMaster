using System.ComponentModel.DataAnnotations;

namespace Quiz.DTOs.User;

public class UserUpdateDto
{
    [StringLength(50, MinimumLength = 3, ErrorMessage = "Username must be between 3 and 50 characters.")]
    public string? UserName { get; set; }
    public string? OldPassword { get; set; }
    [MinLength(6, ErrorMessage = "Password must be at least 6 characters.")]
    public string? Password { get; set; }
}