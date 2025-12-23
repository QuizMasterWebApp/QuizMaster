namespace Quiz.DTOs.Question;
using global::Quiz.Models;

public class QuestionDto
{
    public int Id { get; set; }
    public string Text { get; set; }
    public QuestionType Type { get; set; }
    public int? QuizId { get; set; }
    public List<OptionDto> Options { get; set; } = new List<OptionDto>();
}

//// Для игрока (прохождение викторины)
//public class QuestionPlayerDto
//{
//    public int Id { get; set; }
//    public string Text { get; set; } = string.Empty;
//    public QuestionType Type { get; set; }
//    public List<OptionDto> Options { get; set; } = new(); // без IsCorrect
//}

//// Для автора (создание/редактирование)
//public class QuestionAdminDto
//{
//    public int Id { get; set; }
//    public string Text { get; set; } = string.Empty;
//    public QuestionType Type { get; set; }
//    public List<OptionAdminDto> Options { get; set; } = new(); // с IsCorrect
//}