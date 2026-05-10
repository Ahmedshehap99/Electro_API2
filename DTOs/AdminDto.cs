using System.ComponentModel.DataAnnotations;

namespace ElectroAPI.DTOs;

public class AdminUpdateProductDto
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public int? StockQuantity { get; set; }
    public decimal? UnitPrice { get; set; }
    public int? CategoryId { get; set; }
    public string? ImageUrl { get; set; }
}



public class CategoryCreateDto
{
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
}