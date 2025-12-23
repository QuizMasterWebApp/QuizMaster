namespace Quiz.Services.Interfaces;

using Quiz.Models;

using Quiz.DTOs.Quiz;


public interface IQuizService
{
    Task<Models.Quiz?> GetByIdAsync(int id);
    Task<Models.Quiz?> GetByIdWithDetailsAsync(int id);
    Task<IEnumerable<Models.Quiz>> GetAllPublicAsync();
    Task<IEnumerable<Models.Quiz>> GetByAuthorAsync(int authorId);
    Task<Models.Quiz?> GetByAccessKeyAsync(string code);
    Task<Models.Quiz> CreateAsync(Models.Quiz quiz);
    Task<bool> UpdateAsync(Models.Quiz quiz);
    Task<bool> DeleteAsync(int id);
    Task<IEnumerable<Models.Quiz>> GetQuizzesByCategoryAsync(CategoryType category);
}