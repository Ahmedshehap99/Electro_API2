namespace ElectroAPI.DTOs;

public class OrderItemCreateDto
{
    public int ProductId { get; set; }
    public int Quantity { get; set; }
}

public class OrderCreateDto
{
    public List<OrderItemCreateDto> Items { get; set; } = new();
    public string? ShippingAddress { get; set; }
}

public class OrderItemResponseDto
{
    public int ProductId { get; set; }
    public string ProductName { get; set; } = null!;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Subtotal { get; set; }
}

public class OrderResponseDto
{
    public int OrderId { get; set; }
    public string Status { get; set; } = null!;
    public decimal TotalAmount { get; set; }
    public DateTime OrderDate { get; set; }
    public int CustomerId { get; set; }
    public string CustomerName { get; set; } = null!;
    public List<OrderItemResponseDto> Items { get; set; } = new();
}

public class OrderStatusUpdateDto
{
    public string Status { get; set; } = null!;
    // Pending / Processing / Shipped / Delivered / Cancelled
}