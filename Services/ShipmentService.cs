using ElectroAPI.Data;
using ElectroAPI.DTOs;
using ElectroAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace ElectroAPI.Services;

public class ShipmentService
{
    private readonly ElectroDbContext _context;

    public ShipmentService(ElectroDbContext context)
    {
        _context = context;
    }

    // GET ALL SHIPMENTS
    public async Task<List<ShipmentResponseDto>> GetAllAsync()
    {
        return await _context.Shipments
            .Select(s => new ShipmentResponseDto
            {
                ShipmentId = s.ShipmentId,
                Status = s.Status,
                CurrierName = s.CurrierName,
                Amount = s.Amount,
                TrackingNumber = s.TrackingNumber,
                ShipmentDate = s.ShipmentDate,
                DeliveryDate = s.DeliveryDate,
                OrderId = s.OrderId ?? 0,
                CustomerName = s.Order != null
                    ? s.Order.Customer != null
                        ? s.Order.Customer.FullName : ""
                    : "",
                OrderTotal = s.Order != null ? s.Order.TotalAmount ?? 0 : 0
            }).ToListAsync();
    }

    // GET BY ID
    public async Task<ShipmentResponseDto?> GetByIdAsync(int shipmentId)
    {
        return await _context.Shipments
            .Where(s => s.ShipmentId == shipmentId)
            .Select(s => new ShipmentResponseDto
            {
                ShipmentId = s.ShipmentId,
                Status = s.Status,
                CurrierName = s.CurrierName,
                Amount = s.Amount,
                TrackingNumber = s.TrackingNumber,
                ShipmentDate = s.ShipmentDate,
                DeliveryDate = s.DeliveryDate,
                OrderId = s.OrderId ?? 0,
                CustomerName = s.Order != null
                    ? s.Order.Customer != null
                        ? s.Order.Customer.FullName : ""
                    : "",
                OrderTotal = s.Order != null ? s.Order.TotalAmount ?? 0 : 0
            })
            .FirstOrDefaultAsync();
    }

    // GET SHIPMENTS BY CUSTOMER
    public async Task<List<ShipmentResponseDto>> GetByCustomerAsync(int customerId)
    {
        return await _context.Shipments
            .Where(s => s.Order != null && s.Order.CustomerId == customerId)
            .Select(s => new ShipmentResponseDto
            {
                ShipmentId = s.ShipmentId,
                Status = s.Status,
                CurrierName = s.CurrierName,
                Amount = s.Amount,
                TrackingNumber = s.TrackingNumber,
                ShipmentDate = s.ShipmentDate,
                DeliveryDate = s.DeliveryDate,
                OrderId = s.OrderId ?? 0,
                CustomerName = s.Order != null
                    ? s.Order.Customer != null
                        ? s.Order.Customer.FullName : ""
                    : "",
                OrderTotal = s.Order != null ? s.Order.TotalAmount ?? 0 : 0
            }).ToListAsync();
    }

    // CREATE SHIPMENT
    public async Task<(ShipmentResponseDto? shipment, string? error)> CreateAsync(
        ShipmentCreateDto dto)
    {
        // تحقق إن الأوردر موجود
        var order = await _context.Orders.FindAsync(dto.OrderId);
        if (order == null)
            return (null, "Order not found.");

        // تحقق إن الأوردر مش Cancelled
        if (order.Status == "Cancelled")
            return (null, "Cannot ship a cancelled order.");

        // تحقق إن الأوردر مش اتشحن قبل كده
        bool alreadyShipped = await _context.Shipments
            .AnyAsync(s => s.OrderId == dto.OrderId);
        if (alreadyShipped)
            return (null, "This order has already been shipped.");

        int nextId = await _context.Shipments.AnyAsync()
            ? await _context.Shipments.MaxAsync(s => s.ShipmentId) + 1
            : 1;

        var shipment = new Shipment
        {
            ShipmentId = nextId,
            OrderId = dto.OrderId,
            CurrierName = dto.CurrierName,
            Amount = dto.Amount,
            DeliveryDate = dto.DeliveryDate,
            ShipmentDate = DateOnly.FromDateTime(DateTime.UtcNow),
            Status = "Pending",
            TrackingNumber = new Random().Next(100000, 999999)
        };

        _context.Shipments.Add(shipment);

        // تحديث الأوردر Status
        order.Status = "Shipped";

        await _context.SaveChangesAsync();

        return (await GetByIdAsync(shipment.ShipmentId), null);
    }

    // UPDATE SHIPMENT STATUS
    public async Task<(ShipmentResponseDto? shipment, string? error)> UpdateStatusAsync(
        int shipmentId, ShipmentUpdateDto dto)
    {
        var shipment = await _context.Shipments
            .Include(s => s.Order)
            .FirstOrDefaultAsync(s => s.ShipmentId == shipmentId);

        if (shipment == null)
            return (null, "Shipment not found.");

        var validStatuses = new[] { "Pending", "InTransit", "Delivered", "Failed" };
        if (dto.Status != null && !validStatuses.Contains(dto.Status))
            return (null, "Invalid status.");

        if (dto.Status != null)
        {
            shipment.Status = dto.Status;

            // لو الشحنة وصلت حدّث الأوردر
            if (dto.Status == "Delivered" && shipment.Order != null)
                shipment.Order.Status = "Delivered";

            // لو الشحنة فشلت حدّث الأوردر
            if (dto.Status == "Failed" && shipment.Order != null)
                shipment.Order.Status = "Processing";
        }

        if (dto.DeliveryDate.HasValue)
            shipment.DeliveryDate = dto.DeliveryDate;

        if (dto.TrackingNumber.HasValue)
            shipment.TrackingNumber = dto.TrackingNumber;

        await _context.SaveChangesAsync();

        return (await GetByIdAsync(shipmentId), null);
    }
}