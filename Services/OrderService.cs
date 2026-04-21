using ElectroAPI.Data;
using ElectroAPI.DTOs;
using ElectroAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace ElectroAPI.Services;

public class OrderService
{
    private readonly ElectroDbContext _context;

    public OrderService(ElectroDbContext context)
    {
        _context = context;
    }

    // GET ALL ORDERS - للأدمن
    public async Task<List<OrderResponseDto>> GetAllAsync()
    {
        return await _context.Orders
            .Include(o => o.Customer)
            .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.Product)
            .Select(o => MapToDto(o))
            .ToListAsync();
    }

    // GET ORDERS BY CUSTOMER - للكاستومر يشوف أوردراته بس
    public async Task<List<OrderResponseDto>> GetByCustomerAsync(int customerId)
    {
        return await _context.Orders
            .Include(o => o.Customer)
            .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.Product)
            .Where(o => o.CustomerId == customerId)
            .Select(o => MapToDto(o))
            .ToListAsync();
    }

    // GET BY ID
    public async Task<OrderResponseDto?> GetByIdAsync(int orderId, int customerId)
    {
        var order = await _context.Orders
            .Include(o => o.Customer)
            .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.Product)
            .FirstOrDefaultAsync(o => o.OrderId == orderId && o.CustomerId == customerId);

        return order == null ? null : MapToDto(order);
    }

    // CREATE ORDER
    public async Task<(OrderResponseDto? order, string? error)> CreateAsync(
        int customerId, OrderCreateDto dto)
    {
        // تحقق من وجود المنتجات والـ Stock
        foreach (var item in dto.Items)
        {
            var product = await _context.Products.FindAsync(item.ProductId);

            if (product == null)
                return (null, $"Product {item.ProductId} not found.");

            if (product.StockQuantity < item.Quantity)
                return (null, $"Not enough stock for product: {product.Name}. Available: {product.StockQuantity}");
        }

        // إنشاء الأوردر
        int nextOrderId = await _context.Orders.AnyAsync()
            ? await _context.Orders.MaxAsync(o => o.OrderId) + 1
            : 1;

        var order = new Order
        {
            OrderId = nextOrderId,
            CustomerId = customerId,
            Status = "Pending",
            OrderDate = DateTime.UtcNow,
            TotalAmount = 0
        };

        _context.Orders.Add(order);
        await _context.SaveChangesAsync();

        // إضافة الـ OrderItems وحساب الـ Total
        decimal total = 0;
        int nextItemId = await _context.OrderItems.AnyAsync()
            ? await _context.OrderItems.MaxAsync(i => i.OrderItemId) + 1
            : 1;

        foreach (var itemDto in dto.Items)
        {
            var product = await _context.Products.FindAsync(itemDto.ProductId);
            decimal price = product!.UnitPrice ?? 0;

            var orderItem = new OrderItem
            {
                OrderItemId = nextItemId++,
                OrderId = order.OrderId,
                ProductId = itemDto.ProductId,
                Quantity = itemDto.Quantity,
                UnitPrice = price
            };

            _context.OrderItems.Add(orderItem);

            // تقليل الـ Stock
            product.StockQuantity -= itemDto.Quantity;

            total += price * itemDto.Quantity;
        }

        // تحديث الـ Total
        order.TotalAmount = total;
        await _context.SaveChangesAsync();

        var result = await GetByIdAsync(order.OrderId, customerId);
        return (result, null);
    }

    // UPDATE STATUS
    public async Task<OrderResponseDto?> UpdateStatusAsync(int orderId, OrderStatusUpdateDto dto)
    {
        var order = await _context.Orders.FindAsync(orderId);
        if (order == null) return null;

        var validStatuses = new[] { "Pending", "Processing", "Shipped", "Delivered", "Cancelled" };
        if (!validStatuses.Contains(dto.Status))
            return null;

        // لو الأوردر اتكنسل رجّع الـ Stock
        if (dto.Status == "Cancelled" && order.Status != "Cancelled")
        {
            var items = await _context.OrderItems
                .Include(i => i.Product)
                .Where(i => i.OrderId == orderId)
                .ToListAsync();

            foreach (var item in items)
            {
                if (item.Product != null)
                    item.Product.StockQuantity += item.Quantity;
            }
        }

        order.Status = dto.Status;
        await _context.SaveChangesAsync();

        return await GetByIdAsync(orderId, order.CustomerId ?? 0);
    }

    // CANCEL ORDER - للكاستومر
    public async Task<(bool success, string? error)> CancelAsync(int orderId, int customerId)
    {
        var order = await _context.Orders.FindAsync(orderId);

        if (order == null || order.CustomerId != customerId)
            return (false, "Order not found.");

        if (order.Status == "Shipped" || order.Status == "Delivered")
            return (false, "Cannot cancel a shipped or delivered order.");

        if (order.Status == "Cancelled")
            return (false, "Order is already cancelled.");

        await UpdateStatusAsync(orderId, new OrderStatusUpdateDto { Status = "Cancelled" });
        return (true, null);
    }

    // HELPER - Map to DTO
    private static OrderResponseDto MapToDto(Order o) => new()
    {
        OrderId = o.OrderId,
        Status = o.Status ?? "Pending",
        TotalAmount = o.TotalAmount ?? 0,
        OrderDate = o.OrderDate ?? DateTime.UtcNow,
        CustomerId = o.CustomerId ?? 0,
        CustomerName = o.Customer?.FullName ?? "",
        Items = o.OrderItems.Select(oi => new OrderItemResponseDto
        {
            ProductId = oi.ProductId ?? 0,
            ProductName = oi.Product?.Name ?? "",
            Quantity = oi.Quantity ?? 0,
            UnitPrice = oi.UnitPrice ?? 0,
            Subtotal = (oi.UnitPrice ?? 0) * (oi.Quantity ?? 0)
        }).ToList()
    };
}
