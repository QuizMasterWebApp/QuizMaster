using Quiz.Models;

namespace Quiz.Services.Interfaces;

public interface IOptionService
{
    Task<Option?> GetByIdAsync(int id);
    Task<IEnumerable<Option>> GetByQuestionAsync(int questionId);
    Task<Option> CreateAsync(Option option);
    Task AddRangeAsync(IEnumerable<Option> options);
    Task<bool> UpdateAsync(Option option);
    Task<bool> DeleteAsync(int id);
}