using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Quiz.DTOs.CategoryTypeDto;
using Quiz.DTOs.Quiz;
using Quiz.Models;
using Quiz.Services.Implementations;
using Quiz.Services.Interfaces;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;

namespace Quiz.Controllers;

[Route("api/[controller]")]
[ApiController]
public class CategoryController : ControllerBase
{

    // GET: api/category
    [HttpGet]
    public IActionResult GetAllCategories()
    {
        // значения из ENUM
        var categories = Enum.GetValues(typeof(CategoryType))
            .Cast<CategoryType>()
            .Select(type => new CategoryTypeDto
            {
                CategoryType = type,
                Name = type.ToString() // преобразуем enum в строку для Name
            })
            .ToList();

        return Ok(categories);
    }

    // GET: api/category/{id}
    [HttpGet("{id}")]
    public IActionResult GetById(int id)
    {
        if (!Enum.IsDefined(typeof(CategoryType), id))
            return NotFound($"Category with ID {id} not found.");

        var categoryType = (CategoryType)id;

        var result = new CategoryTypeDto
        {
            CategoryType = categoryType,
            Name = categoryType.ToString()
        };

        return Ok(result);
    }
}
