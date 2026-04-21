namespace ElectroAPI.DTOs;

public class ProductCreateDto
{
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public int StockQuantity { get; set; }
    public decimal UnitPrice { get; set; }
    public int CategoryId { get; set; }
}

public class ProductUpdateDto
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public int? StockQuantity { get; set; }
    public decimal? UnitPrice { get; set; }
    public int? CategoryId { get; set; }
}

public class ProductResponseDto
{
    public int ProductId { get; set; }
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public int StockQuantity { get; set; }
    public decimal UnitPrice { get; set; }
    public DateTime? AddedDate { get; set; }
    public string? CategoryName { get; set; }
}

