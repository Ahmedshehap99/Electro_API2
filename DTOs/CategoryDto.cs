public class CategoryCreateDto
{
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
}

public class CategoryResponseDto
{
    public int CategoryId { get; set; }
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public string? MainCategoryName { get; set; }
}