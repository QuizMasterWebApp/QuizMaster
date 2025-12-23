using Quiz.Models;
using System.Threading.Tasks;
using Quiz.DTOs.Answer;

namespace Quiz.Services.Interfaces;

public interface IUserAnswerService
{
    Task<UserAnswer?> GetByIdAsync(int id);
    Task<IEnumerable<UserAnswer>> GetAnswersByAttemptAsync(int attemptId);
    Task<UserAnswer> CreateAsync(UserAnswer answer);
    Task<bool> UpdateAsync(UserAnswer answer);
    Task<bool> DeleteAsync(int id);
}
