namespace ElectroAPI.DTOs;

public class PaymentCreateDto
{
    public int OrderId { get; set; }
    public string Method { get; set; } = null!;
    // Cash / Credit Card / Debit Card / Vodafone Cash
}

public class PaymentResponseDto
{
    public int PaymentId { get; set; }
    public string? Status { get; set; }
    public string? Amount { get; set; }
    public string? Method { get; set; }
    public DateOnly? PaymentDate { get; set; }
    public int OrderId { get; set; }
    public decimal OrderTotal { get; set; }
    public string CustomerName { get; set; } = null!;
}