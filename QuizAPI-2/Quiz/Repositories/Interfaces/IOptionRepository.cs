using Quiz.Models;

namespace Quiz.Repositories.Interfaces;
public interface IOptionRepository
{
    Task<Option?> GetByIdAsync(int id);
    Task<IEnumerable<Option>> GetOptionsByQuestionAsync(int questionId);
    Task AddAsync(Option option);
    Task AddRangeAsync(IEnumerable<Option> options);
    Task UpdateAsync(Option option);
    Task DeleteAsync(int id);
}