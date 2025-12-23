using Quiz.Models;
using Quiz.DTOs.User;

namespace Quiz.Services.Interfaces;

public interface IUserService
{
    Task<User?> GetByIdAsync(int id);
    Task<User?> GetByUsernameAsync(string username);
    Task<IEnumerable<User>> GetAllAsync();
    Task<string> RegisterAsync(string username, string password);
    Task<string> LoginAsync(string username, string password);
    Task<bool> DeleteAsync(int id);
    Task<bool> UpdateAsync(User user);
}
