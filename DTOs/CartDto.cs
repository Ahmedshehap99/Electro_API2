namespace ElectroAPI.DTOs;

public class CartAddDto
{
    public int ProductId { get; set; }
    public int Quantity { get; set; }
}

public class CartUpdateDto
{
    public int Quantity { get; set; }
}

public class CartResponseDto
{
    public int CartId { get; set; }
    public int ProductId { get; set; }
    public string ProductName { get; set; } = null!;
    public decimal UnitPrice { get; set; }
    public int Quantity { get; set; }
    public decimal Subtotal { get; set; }
    public DateTime? AddedDate { get; set; }
}

public class CartSummaryDto
{
    public List<CartResponseDto> Items { get; set; } = new();
    public decimal TotalAmount { get; set; }
    public int TotalItems { get; set; }
}