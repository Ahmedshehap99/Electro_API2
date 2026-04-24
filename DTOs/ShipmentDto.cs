namespace ElectroAPI.DTOs;

public class ShipmentCreateDto
{
    public int OrderId { get; set; }
    public string CurrierName { get; set; } = null!;
    public string? Amount { get; set; }
    public DateOnly? DeliveryDate { get; set; }
}

public class ShipmentUpdateDto
{
    public string? Status { get; set; }
    // Pending / InTransit / Delivered / Failed
    public DateOnly? DeliveryDate { get; set; }
    public int? TrackingNumber { get; set; }
}

public class ShipmentResponseDto
{
    public int ShipmentId { get; set; }
    public string? Status { get; set; }
    public string? CurrierName { get; set; }
    public string? Amount { get; set; }
    public int? TrackingNumber { get; set; }
    public DateOnly? ShipmentDate { get; set; }
    public DateOnly? DeliveryDate { get; set; }
    public int OrderId { get; set; }
    public string CustomerName { get; set; } = null!;
    public decimal OrderTotal { get; set; }
}