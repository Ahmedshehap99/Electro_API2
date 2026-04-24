using ElectroAPI.Data;
using ElectroAPI.DTOs;
using ElectroAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace ElectroAPI.Services;

public class PaymentService
{
    private readonly ElectroDbContext _context;

    public PaymentService(ElectroDbContext context)
    {
        _context = context;
    }

    // GET ALL PAYMENTS
    public async Task<List<PaymentResponseDto>> GetAllAsync()
    {
        return await _context.Payments
            .Select(p => new PaymentResponseDto
            {
                PaymentId = p.PaymentId,
                Status = p.Status,
                Amount = p.Amount,
                Method = p.Method,
                PaymentDate = p.PaymentDate,
                OrderId = p.Orders.FirstOrDefault() != null
                    ? p.Orders.First().OrderId : 0,
                OrderTotal = p.Orders.FirstOrDefault() != null
                    ? p.Orders.First().TotalAmount ?? 0 : 0,
                CustomerName = p.Orders.FirstOrDefault() != null
                    ? p.Orders.First().Customer != null
                        ? p.Orders.First().Customer!.FullName : ""
                    : ""
            }).ToListAsync();
    }

    // GET BY ID
    public async Task<PaymentResponseDto?> GetByIdAsync(int paymentId)
    {
        return await _context.Payments
            .Where(p => p.PaymentId == paymentId)
            .Select(p => new PaymentResponseDto
            {
                PaymentId = p.PaymentId,
                Status = p.Status,
                Amount = p.Amount,
                Method = p.Method,
                PaymentDate = p.PaymentDate,
                OrderId = p.Orders.FirstOrDefault() != null
                    ? p.Orders.First().OrderId : 0,
                OrderTotal = p.Orders.FirstOrDefault() != null
                    ? p.Orders.First().TotalAmount ?? 0 : 0,
                CustomerName = p.Orders.FirstOrDefault() != null
                    ? p.Orders.First().Customer != null
                        ? p.Orders.First().Customer!.FullName : ""
                    : ""
            })
            .FirstOrDefaultAsync();
    }

    // GET PAYMENTS BY CUSTOMER
    public async Task<List<PaymentResponseDto>> GetByCustomerAsync(int customerId)
    {
        return await _context.Payments
            .Where(p => p.Orders.Any(o => o.CustomerId == customerId))
            .Select(p => new PaymentResponseDto
            {
                PaymentId = p.PaymentId,
                Status = p.Status,
                Amount = p.Amount,
                Method = p.Method,
                PaymentDate = p.PaymentDate,
                OrderId = p.Orders.FirstOrDefault() != null
                    ? p.Orders.First().OrderId : 0,
                OrderTotal = p.Orders.FirstOrDefault() != null
                    ? p.Orders.First().TotalAmount ?? 0 : 0,
                CustomerName = p.Orders.FirstOrDefault() != null
                    ? p.Orders.First().Customer != null
                        ? p.Orders.First().Customer!.FullName : ""
                    : ""
            }).ToListAsync();
    }

    // CREATE PAYMENT
    public async Task<(PaymentResponseDto? payment, string? error)> CreateAsync(
        int customerId, PaymentCreateDto dto)
    {
        // تحقق إن الأوردر موجود وتبع الكاستومر ده
        var order = await _context.Orders
            .Where(o => o.OrderId == dto.OrderId && o.CustomerId == customerId)
            .FirstOrDefaultAsync();

        if (order == null)
            return (null, "Order not found or does not belong to you.");

        // تحقق إن الأوردر مش اتدفع قبل كده
        bool alreadyPaid = await _context.Payments
            .AnyAsync(p => p.Orders.Any(o => o.OrderId == dto.OrderId)
                && p.Status == "Paid");

        if (alreadyPaid)
            return (null, "This order has already been paid.");

        // تحقق إن الأوردر مش Cancelled
        if (order.Status == "Cancelled")
            return (null, "Cannot pay for a cancelled order.");

        // إنشاء الـ Payment
        int nextId = await _context.Payments.AnyAsync()
            ? await _context.Payments.MaxAsync(p => p.PaymentId) + 1
            : 1;

        var payment = new Payment
        {
            PaymentId = nextId,
            PaymentDate = DateOnly.FromDateTime(DateTime.UtcNow),
            Amount = order.TotalAmount.ToString(),
            Status = "Paid",
            Method = dto.Method
        };

        _context.Payments.Add(payment);
        await _context.SaveChangesAsync();

        // ربط الـ Payment بالـ Order
        payment.Orders.Add(order);

        // تحديث الأوردر Status
        order.Status = "Processing";

        await _context.SaveChangesAsync();

        return (await GetByIdAsync(payment.PaymentId), null);
    }

    // REFUND PAYMENT
    public async Task<(PaymentResponseDto? payment, string? error)> RefundAsync(
        int paymentId, int customerId)
    {
        var payment = await _context.Payments
            .Include(p => p.Orders)
            .FirstOrDefaultAsync(p => p.PaymentId == paymentId);

        if (payment == null)
            return (null, "Payment not found.");

        bool belongsToCustomer = payment.Orders
            .Any(o => o.CustomerId == customerId);

        if (!belongsToCustomer)
            return (null, "Payment not found.");

        if (payment.Status == "Refunded")
            return (null, "Payment already refunded.");

        if (payment.Status != "Paid")
            return (null, "Only paid payments can be refunded.");

        payment.Status = "Refunded";

        foreach (var order in payment.Orders)
        {
            order.Status = "Cancelled";

            var items = await _context.OrderItems
                .Where(i => i.OrderId == order.OrderId)
                .ToListAsync();

            foreach (var item in items)
            {
                var product = await _context.Products.FindAsync(item.ProductId);
                if (product != null)
                    product.StockQuantity += item.Quantity;
            }
        }

        await _context.SaveChangesAsync();
        return (await GetByIdAsync(paymentId), null);
    }
}